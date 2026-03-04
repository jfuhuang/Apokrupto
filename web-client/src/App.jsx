import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import ConnectionDot from './components/ConnectionDot.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import LoginScreen from './screens/LoginScreen.jsx'
import RegisterScreen from './screens/RegisterScreen.jsx'
import LobbyListScreen from './screens/LobbyListScreen.jsx'
import LobbyScreen from './screens/LobbyScreen.jsx'
import CountdownScreen from './screens/CountdownScreen.jsx'
import RoleRevealScreen from './screens/RoleRevealScreen.jsx'
import RoundHubScreen from './screens/RoundHubScreen.jsx'
import MovementAScreen from './screens/MovementAScreen.jsx'
import MovementBScreen from './screens/MovementBScreen.jsx'
import VotingScreen from './screens/VotingScreen.jsx'
import RoundSummaryScreen from './screens/RoundSummaryScreen.jsx'
import GameOverScreen from './screens/GameOverScreen.jsx'
import GmDashboardScreen from './screens/GmDashboardScreen.jsx'
import DevMenuScreen from './screens/DevMenuScreen.jsx'
import { GameProvider } from './context/GameContext.jsx'
import { storage } from './utils/storage.js'
import { fetchCurrentLobby } from './utils/api.js'
import { getSocketUrl } from './utils/network.js'
import SocketDebugPanel from './components/SocketDebugPanel.jsx'

function decodeJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

const INITIAL_STATE = {
  currentScreen: 'loading',
  token: null,
  username: null,
  currentUserId: null,
  currentLobbyId: null,
  currentTeam: null,
  skotiaTeammates: [],
  gameId: null,
  currentRound: 1,
  totalRounds: 3,
  currentMovement: null,
  currentGroupId: null,
  currentGroupMembers: [],
  teamPoints: { phos: 0, skotia: 0 },
  isMarked: false,
  isGm: false,
  roundSummary: null,
  gameOverResult: null,
  movementBEndsAt: null,
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const [socketConnected, setSocketConnected] = useState(false)
  const socketRef = useRef(null)
  // Bumped each time a new socket is created so socket-listener effects re-run
  const [socketKey, setSocketKey] = useState(0)

  function patchState(patch) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  const connectSocket = useCallback((token) => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    console.log('[Socket] Connecting to:', getSocketUrl())
    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['polling', 'websocket'], // polling first for better ngrok compatibility
      extraHeaders: { 'ngrok-skip-browser-warning': '69420' }, // skip ngrok interstitial
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })
    socketRef.current = socket
    socket.on('connect', () => {
      console.log('[Socket] Connected')
      setSocketConnected(true)
    })
    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setSocketConnected(false)
    })
    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error)
      setSocketConnected(false)
    })
    setSocketKey((k) => k + 1)
    return socket
  }, [])

  const checkCurrentLobby = useCallback(async (token) => {
    const res = await fetchCurrentLobby(token)
    if (res.ok && res.data.lobby) {
      const lobby = res.data.lobby
      if (lobby.status === 'in_progress' && lobby.gameId) {
        patchState({
          currentLobbyId: lobby.id,
          gameId: lobby.gameId,
          isGm: lobby.isGm || false,
          currentScreen: lobby.isGm ? 'gmDashboard' : 'roundHub',
        })
      } else if (lobby.status === 'waiting') {
        patchState({
          currentLobbyId: lobby.id,
          currentScreen: 'lobby',
        })
      } else {
        patchState({ currentScreen: 'lobbyList' })
      }
    } else {
      patchState({ currentScreen: 'lobbyList' })
    }
  }, [])

  // On mount: restore token
  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      patchState({ currentScreen: 'welcome' })
      return
    }
    const payload = decodeJwt(token)
    if (!payload) {
      storage.removeToken()
      patchState({ currentScreen: 'welcome' })
      return
    }
    patchState({ token, currentUserId: payload.sub, username: payload.username || payload.sub })
    connectSocket(token)
    checkCurrentLobby(token)
  }, [connectSocket, checkCurrentLobby])

  function handleLoginSuccess(token, username) {
    const payload = decodeJwt(token)
    storage.setToken(token)
    const userId = payload?.sub
    patchState({ token, username, currentUserId: userId, currentScreen: 'lobbyList' })
    connectSocket(token)
  }

  function handleLogout() {
    storage.removeToken()
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setSocketConnected(false)
    setState({ ...INITIAL_STATE, currentScreen: 'welcome' })
  }

  function handleJoinLobby(lobbyId) {
    patchState({ currentLobbyId: lobbyId, currentScreen: 'lobby' })
  }

  function handleLeaveLobby() {
    patchState({ currentLobbyId: null, currentScreen: 'lobbyList' })
  }

  // Called when roleAssigned fires in lobby
  function handleRoleAssigned(data) {
    patchState({
      currentTeam: data.team,
      isGm: data.isGm || false,
      skotiaTeammates: data.skotiaTeammates || [],
      currentGroupId: data.groupId,
      currentGroupMembers: data.groupMembers || [],
    })
  }

  // Called when gameStarted fires
  function handleGameStarted(data) {
    patchState({ gameId: data.gameId, currentScreen: 'countdown' })
  }

  function handleCountdownComplete() {
    patchState({ currentScreen: 'roleReveal' })
  }

  function handleRoleRevealComplete() {
    const s = state
    if (s.isGm) {
      patchState({ currentScreen: 'gmDashboard' })
    } else {
      patchState({ currentScreen: 'roundHub' })
    }
  }

  // Navigate to movement screen from roundHub / polling
  function handleNavigateMovement(movement) {
    if (movement === 'A') patchState({ currentScreen: 'movementA', currentMovement: 'A' })
    else if (movement === 'B') patchState({ currentScreen: 'movementB', currentMovement: 'B' })
    else if (movement === 'C') patchState({ currentScreen: 'voting', currentMovement: 'C' })
  }

  function handleMovementEnd(nextMovement) {
    if (nextMovement === 'A') {
      patchState({ currentScreen: 'roundHub', currentMovement: null })
    } else if (nextMovement === 'B') {
      patchState({ currentScreen: 'movementB', currentMovement: 'B' })
    } else if (nextMovement === 'C') {
      patchState({ currentScreen: 'voting', currentMovement: 'C' })
    } else {
      // Fallback
      patchState({ currentScreen: 'roundHub', currentMovement: null })
    }
  }

  function handleGameOver(data) {
    patchState({ currentScreen: 'gameOver', gameOverResult: data })
  }

  // Handle movementStart for round-level updates (next round after summary)
  function handleNextRound(data) {
    patchState({
      currentRound: data.roundNumber || state.currentRound + 1,
      totalRounds: data.totalRounds || state.totalRounds,
      currentGroupId: data.groupId || state.currentGroupId,
      currentGroupMembers: data.groupMembers || state.currentGroupMembers,
      teamPoints: data.teamPoints || state.teamPoints,
      currentMovement: 'A',
      currentScreen: 'roundHub',
      roundSummary: null,
    })
  }

  // Socket: listen for roundSummary and top-level movementStart updates.
  // Re-runs whenever socketKey changes (i.e. a new socket was created).
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    function onRoundSummary(data) {
      patchState({ roundSummary: data, currentScreen: 'roundSummary' })
    }

    function onMovementStart(data) {
      const patch = {}
      if (data.groupId) patch.currentGroupId = data.groupId
      if (data.groupMembers) patch.currentGroupMembers = data.groupMembers
      if (data.teamPoints) patch.teamPoints = data.teamPoints
      if (data.roundNumber) patch.currentRound = data.roundNumber
      if (data.totalRounds) patch.totalRounds = data.totalRounds
      if (data.movementBEndsAt) patch.movementBEndsAt = data.movementBEndsAt
      // Navigate to the movement screen whenever the server signals a movement change
      if (data.movement === 'A') {
        patch.currentScreen = 'movementA'
        patch.currentMovement = 'A'
      } else if (data.movement === 'B') {
        patch.currentScreen = 'movementB'
        patch.currentMovement = 'B'
      } else if (data.movement === 'C') {
        patch.currentScreen = 'voting'
        patch.currentMovement = 'C'
      }
      patchState(patch)
    }

    function onGameOver(data) {
      patchState({ currentScreen: 'gameOver', gameOverResult: data })
    }

    socket.on('roundSummary', onRoundSummary)
    socket.on('movementStart', onMovementStart)
    socket.on('gameOver', onGameOver)
    return () => {
      socket.off('roundSummary', onRoundSummary)
      socket.off('movementStart', onMovementStart)
      socket.off('gameOver', onGameOver)
    }
  }, [socketKey])

  const { currentScreen } = state

  function renderScreen() {
    switch (currentScreen) {
      case 'loading':
        return (
          <div style={loadingStyle}>
            <div style={spinnerStyle} />
          </div>
        )

      case 'welcome':
        return (
          <WelcomeScreen
            onLogin={() => patchState({ currentScreen: 'login' })}
            onRegister={() => patchState({ currentScreen: 'register' })}
          />
        )

      case 'login':
        return (
          <LoginScreen
            onSuccess={handleLoginSuccess}
            onBack={() => patchState({ currentScreen: 'welcome' })}
          />
        )

      case 'register':
        return (
          <RegisterScreen
            onSuccess={handleLoginSuccess}
            onBack={() => patchState({ currentScreen: 'welcome' })}
          />
        )

      case 'lobbyList':
        return (
          <LobbyListScreen
            token={state.token}
            username={state.username}
            onJoinLobby={handleJoinLobby}
            onLogout={handleLogout}
            onDevMenu={() => patchState({ currentScreen: 'devMenu' })}
          />
        )

      case 'devMenu':
        return (
          <DevMenuScreen
            token={state.token}
            onBack={() => patchState({ currentScreen: state.token ? 'lobbyList' : 'welcome' })}
          />
        )

      case 'lobby':
        return (
          <LobbyScreen
            token={state.token}
            lobbyId={state.currentLobbyId}
            currentUserId={state.currentUserId}
            isGm={state.isGm}
            socket={socketRef.current}
            onLeave={handleLeaveLobby}
            onGameStarted={handleGameStarted}
            onRoleAssigned={handleRoleAssigned}
          />
        )

      case 'countdown':
        return <CountdownScreen onComplete={handleCountdownComplete} />

      case 'roleReveal':
        return (
          <RoleRevealScreen
            team={state.currentTeam}
            skotiaTeammates={state.skotiaTeammates}
            groupNumber={state.currentGroupMembers?.[0]?.groupNumber}
            onComplete={handleRoleRevealComplete}
          />
        )

      case 'roundHub':
        return (
          <GameProvider token={state.token} gameId={state.gameId}>
            <RoundHubScreen
              token={state.token}
              gameId={state.gameId}
              lobbyId={state.currentLobbyId}
              currentRound={state.currentRound}
              totalRounds={state.totalRounds}
              currentTeam={state.currentTeam}
              currentGroupMembers={state.currentGroupMembers}
              teamPoints={state.teamPoints}
              isMarked={state.isMarked}
              socket={socketRef.current}
              onNavigateMovement={handleNavigateMovement}
              onGameOver={handleGameOver}
            />
          </GameProvider>
        )

      case 'movementA':
        return (
          <GameProvider token={state.token} gameId={state.gameId}>
            <MovementAScreen
              token={state.token}
              gameId={state.gameId}
              currentUserId={state.currentUserId}
              currentGroupId={state.currentGroupId}
              lobbyId={state.currentLobbyId}
              socket={socketRef.current}
              onMovementEnd={handleMovementEnd}
            />
          </GameProvider>
        )

      case 'movementB':
        return (
          <GameProvider token={state.token} gameId={state.gameId}>
            <MovementBScreen
              token={state.token}
              gameId={state.gameId}
              lobbyId={state.currentLobbyId}
              currentUserId={state.currentUserId}
              currentTeam={state.currentTeam}
              currentGroupMembers={state.currentGroupMembers}
              movementBEndsAt={state.movementBEndsAt}
              socket={socketRef.current}
              onMovementEnd={handleMovementEnd}
            />
          </GameProvider>
        )

      case 'voting':
        return (
          <GameProvider token={state.token} gameId={state.gameId}>
            <VotingScreen
              token={state.token}
              gameId={state.gameId}
              currentUserId={state.currentUserId}
              socket={socketRef.current}
              onMovementEnd={handleMovementEnd}
            />
          </GameProvider>
        )

      case 'roundSummary':
        return (
          <RoundSummaryScreen
            roundSummary={state.roundSummary}
            currentRound={state.currentRound}
            totalRounds={state.totalRounds}
            isMarked={state.isMarked}
            socket={socketRef.current}
            onNextRound={handleNextRound}
            onGameOver={handleGameOver}
          />
        )

      case 'gameOver':
        return (
          <GameOverScreen
            result={state.gameOverResult}
            onReturnToLobbyList={() => {
              patchState({ ...INITIAL_STATE, currentScreen: 'lobbyList', token: state.token, username: state.username, currentUserId: state.currentUserId })
            }}
          />
        )

      case 'gmDashboard':
        return (
          <GmDashboardScreen
            token={state.token}
            gameId={state.gameId}
            lobbyId={state.currentLobbyId}
            socket={socketRef.current}
            onGameOver={handleGameOver}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      {renderScreen()}
      <ConnectionDot isConnected={socketConnected} />
      <SocketDebugPanel key={socketKey} socket={socketRef.current} isConnected={socketConnected} />
    </>
  )
}

const loadingStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0B0C10',
}

const spinnerStyle = {
  width: 40,
  height: 40,
  border: '3px solid rgba(0,212,255,0.2)',
  borderTop: '3px solid #00D4FF',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
