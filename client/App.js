import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import {
  useFonts,
  Orbitron_400Regular,
  Orbitron_500Medium,
  Orbitron_700Bold,
  Orbitron_900Black,
} from '@expo-google-fonts/orbitron';
import {
  Exo2_400Regular,
  Exo2_500Medium,
  Exo2_600SemiBold,
  Exo2_700Bold,
} from '@expo-google-fonts/exo-2';
import {
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';
import logger from './utils/logger';
import WelcomeScreen from './screens/welcome/WelcomeScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegistrationScreen from './screens/auth/RegistrationScreen';
import LobbyListScreen from './screens/lobby/LobbyListScreen';
import LobbyScreen from './screens/lobby/LobbyScreen';
import CountdownScreen from './screens/game/CountdownScreen';
import RoleRevealScreen from './screens/game/RoleRevealScreen';
import RoundHubScreen from './screens/game/RoundHubScreen';
import MovementAScreen from './screens/game/MovementAScreen';
import MovementBScreen from './screens/game/MovementBScreen';
import CoopLobbyScreen from './screens/game/CoopLobbyScreen';
import CoopRushScreen from './screens/game/CoopRushScreen';
import TaskRushScreen from './screens/game/TaskRushScreen';
import VotingScreen from './screens/game/VotingScreen';
import RoundSummaryScreen from './screens/game/RoundSummaryScreen';
import GmWaitingScreen from './screens/game/GmWaitingScreen';
import GameOverScreen from './screens/game/GameOverScreen';
import DevMenuScreen from './screens/dev/DevMenuScreen';
import { colors } from './theme/colors';
import { fetchCurrentLobby, fetchPlayerGameState } from './utils/api';
import { useGameState } from './hooks/useGameState';
import { GameContext } from './context/GameContext';
import ConnectionDot from './components/ConnectionDot';

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');

  // Auth
  const [token, setToken] = useState(null);

  // Lobby
  const [currentLobbyId, setCurrentLobbyId] = useState(null);

  // All game state + handlers in one hook
  const { state, handlers, resetGameState, setters } = useGameState({ setCurrentScreen });
  const {
    gameId, currentTeam, skotiaTeammates, isSus, isGm,
    currentGroupId, currentGroupNumber, currentGroupMembers,
    teamPoints, currentRound, totalRounds, currentMovement,
    movementBEndsAt, roundSummary, gameOverResult,
  } = state;
  const [coopSessionId, setCoopSessionId] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [coopPartnerId, setCoopPartnerId] = useState(null);
  const [coopPartnerUsername, setCoopPartnerUsername] = useState(null);
  const [coopRole, setCoopRole] = useState(null);
  const [coopInitialTask, setCoopInitialTask] = useState(null);
  const {
    handleTeamAssigned, handleGameStarted, handleMovementReady,
    handleMovementAComplete, handleMovementCComplete, handleSusStatusUpdate,
    handleRoundSummary, handleGameStateUpdate, handleRoundSetup,
    handleGameOver,
  } = handlers;

  // Dev mode — stores extra props passed by DevMenuScreen for each preview screen
  const [devScreenProps, setDevScreenProps] = useState(null);

  const [fontsLoaded] = useFonts({
    Orbitron_400Regular,
    Orbitron_500Medium,
    Orbitron_700Bold,
    Orbitron_900Black,
    Exo2_400Regular,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
  });

  useEffect(() => {
    checkExistingToken();
  }, []);

  // ── Server sync (10 s polling safety net) ────────────────────────────────
  const SYNC_SKIP_SCREENS = [
    'loading', 'welcome', 'login', 'register', 'lobbyList',
    'countdown', 'roleReveal', 'roundSummary', 'gameOver',
    'taskRush', 'coopLobby', 'coopRush',
  ];

  const syncCallbackRef = useRef(null);
  useEffect(() => {
    syncCallbackRef.current = async () => {
      if (!token || SYNC_SKIP_SCREENS.includes(currentScreen)) return;
      try {
        const { ok: lobbyOk, data: lobbyData } = await fetchCurrentLobby(token);
        if (!lobbyOk) return;

        const lobby = lobbyData.lobby;

        if (!lobby) {
          if (currentScreen !== 'lobbyList') {
            setCurrentLobbyId(null);
            resetGameState();
            setCurrentScreen('lobbyList');
          }
          return;
        }

        setCurrentLobbyId(lobby.id);

        if (lobby.status === 'waiting') {
          if (currentScreen !== 'lobby') setCurrentScreen('lobby');
          return;
        }

        if (lobby.status === 'completed') {
          if (currentScreen !== 'gameOver') setCurrentScreen('gameOver');
          return;
        }

        const gId = lobby.gameId || gameId;
        if (!gId) return;
        setters.setGameId(gId);
        setters.setIsGm(lobby.isGm || false);

        if (lobby.isGm) {
          if (currentScreen !== 'gmDashboard') setCurrentScreen('gmDashboard');
          return;
        }

        if (currentScreen === 'lobby') {
          const { ok: earlyOk, data: earlyState } = await fetchPlayerGameState(token, gId);
          if (earlyOk && earlyState) {
            if (earlyState.team)         setters.setCurrentTeam(earlyState.team);
            if (earlyState.groupId)      setters.setCurrentGroupId(String(earlyState.groupId));
            if (earlyState.groupMembers) setters.setCurrentGroupMembers(earlyState.groupMembers);
            if (earlyState.groupIndex != null) setters.setCurrentGroupNumber(earlyState.groupIndex);
          }
          setCurrentScreen('countdown');
          return;
        }

        const { ok: stateOk, data: stateData } = await fetchPlayerGameState(token, gId);
        if (!stateOk) return;

        if (stateData.team)                  setters.setCurrentTeam(stateData.team);
        if (stateData.isSus !== undefined) setters.setIsSus(stateData.isSus);
        if (stateData.teamPoints)            setters.setTeamPoints(stateData.teamPoints);
        if (stateData.currentRound)          setters.setCurrentRound(stateData.currentRound);
        if (stateData.totalRounds)           setters.setTotalRounds(stateData.totalRounds);
        if (stateData.groupId) {
          setters.setCurrentGroupId(String(stateData.groupId));
          setters.setCurrentGroupNumber(stateData.groupIndex ?? null);
        }
        if (stateData.groupMembers) setters.setCurrentGroupMembers(stateData.groupMembers);

        const targetScreen =
          stateData.currentMovement === 'A' ? 'movementA' :
          stateData.currentMovement === 'B' ? 'movementB' :
          stateData.currentMovement === 'C' ? 'movementC' :
          'roundHub';

        if (stateData.currentMovement === 'B' && stateData.movementBEndsAt) {
          setters.setMovementBEndsAt(stateData.movementBEndsAt);
        }

        if (currentScreen !== targetScreen) {
          logger.nav('GameSync', `${currentScreen} → ${targetScreen} (movement: ${stateData.currentMovement})`);
          setters.setCurrentMovement(stateData.currentMovement);
          setCurrentScreen(targetScreen);
        }
      } catch (err) {
        logger.poll('GameSync', `poll error: ${err.message}`);
      }
    };
  }); // intentionally no deps

  useEffect(() => {
    const id = setInterval(() => { syncCallbackRef.current?.(); }, 3_000);
    return () => clearInterval(id);
  }, []);

  const checkExistingToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('jwtToken');
      if (!storedToken) {
        setCurrentScreen('welcome');
        return;
      }

      setToken(storedToken);

      const { ok, data } = await fetchCurrentLobby(storedToken);
      if (ok && data.lobby) {
        setCurrentLobbyId(data.lobby.id);
        if (data.lobby.status === 'in_progress') {
          setters.setCurrentTeam(data.lobby.team);
          setters.setIsGm(data.lobby.isGm || false);
          setCurrentScreen(data.lobby.isGm ? 'gmDashboard' : 'roundHub');
          return;
        }
        setCurrentScreen('lobby');
        return;
      }

      setCurrentScreen('lobbyList');
    } catch (error) {
      logger.error('App', 'Error checking token', error);
      setCurrentScreen('welcome');
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────

  const handleLogin = (jwtToken) => {
    setToken(jwtToken);
    setCurrentScreen('lobbyList');
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwtToken');
    } catch {}
    setToken(null);
    setCurrentLobbyId(null);
    resetGameState();
    setCurrentScreen('welcome');
  };

  // ── Lobby ─────────────────────────────────────────────────────────────────

  const handleJoinLobby = (lobbyId) => {
    setCurrentLobbyId(lobbyId);
    setCurrentScreen('lobby');
  };

  const handleLeaveLobby = () => {
    setCurrentLobbyId(null);
    resetGameState();
    setCurrentScreen('lobbyList');
  };

  const handleLobbyGone = () => {
    setCurrentLobbyId(null);
    resetGameState();
    setCurrentScreen('lobbyList');
  };

  // ── Pre-game ──────────────────────────────────────────────────────────────

  const handleCountdownComplete = () => setCurrentScreen('roleReveal');

  const handleRoleRevealComplete = () => {
    setCurrentScreen(isGm ? 'gmDashboard' : 'roundHub');
  };

  const handleRejoinGame = (team, gmFlag = false) => {
    setters.setCurrentTeam(team);
    setters.setIsGm(gmFlag);
    setCurrentScreen(gmFlag ? 'gmDashboard' : 'roundHub');
  };

  const handleRoundSummaryContinue = () => {
    if (currentRound >= totalRounds) {
      setCurrentScreen('gameOver');
    } else {
      setCurrentScreen('roundHub');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderScreen = () => {
    if (!fontsLoaded) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.electricBlue} />
        </View>
      );
    }

    const userId = token ? String(parseJwt(token).sub) : null;
    // Merge dev props over the real props when previewing from DevMenuScreen.
    // Individual screen cases spread devScreenProps last so mock values take precedence.
    const dev = devScreenProps || {};
    const devBack = () => {
      setDevScreenProps(null);
      setCurrentScreen('devMenu');
    };

    switch (currentScreen) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.electricBlue} />
          </View>
        );

      case 'welcome':
        return (
          <WelcomeScreen
            onCreateAccount={() => setCurrentScreen('register')}
            onLogin={() => setCurrentScreen('login')}
            onDevMode={() => setCurrentScreen('devMenu')}
          />
        );

      case 'devMenu':
        return (
          <DevMenuScreen
            onBack={() => setCurrentScreen('welcome')}
            onNavigate={(screen, extraProps) => {
              setDevScreenProps(extraProps || null);
              setCurrentScreen(screen);
            }}
          />
        );

      case 'register':
        return (
          <RegistrationScreen
            onBack={() => setCurrentScreen('welcome')}
            onSuccess={handleLogin}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onBack={() => setCurrentScreen('welcome')}
            onSuccess={handleLogin}
          />
        );

      case 'lobbyList':
        return (
          <LobbyListScreen
            token={token}
            onLogout={handleLogout}
            onJoinLobby={handleJoinLobby}
          />
        );

      case 'lobby':
        return (
          <LobbyScreen
            token={token}
            lobbyId={currentLobbyId}
            onLogout={handleLogout}
            onLeaveLobby={handleLeaveLobby}
            onRoleAssigned={handleTeamAssigned}
            onGameStarted={handleGameStarted}
            onRejoinGame={handleRejoinGame}
          />
        );

      case 'countdown':
        return (
          <CountdownScreen
            onCountdownComplete={dev.onCountdownComplete || handleCountdownComplete}
            {...dev}
          />
        );

      case 'roleReveal':
        return (
          <RoleRevealScreen
            role={dev.role || currentTeam}
            skotiaTeammates={dev.skotiaTeammates || skotiaTeammates}
            onRevealComplete={dev.onRevealComplete || handleRoleRevealComplete}
          />
        );

      case 'roundHub':
        return (
          <RoundHubScreen
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            lobbyId={dev.lobbyId || currentLobbyId}
            currentRound={dev.currentRound ?? currentRound}
            totalRounds={dev.totalRounds ?? totalRounds}
            currentTeam={dev.currentTeam || currentTeam}
            isSus={dev.isSus ?? isSus}
            currentGroupMembers={dev.currentGroupMembers || currentGroupMembers}
            groupNumber={dev.groupNumber ?? currentGroupNumber}
            teamPoints={dev.teamPoints || teamPoints}
            onMovementReady={devScreenProps ? devBack : handleMovementReady}
            onGameStateUpdate={devScreenProps ? () => {} : handleGameStateUpdate}
            onSusStatusUpdate={devScreenProps ? () => {} : handleSusStatusUpdate}
            onRoundSummary={devScreenProps ? devBack : handleRoundSummary}
            onRoundSetup={devScreenProps ? devBack : handleRoundSetup}
            onGameOver={devScreenProps ? devBack : handleGameOver}
            onLobbyGone={devScreenProps ? devBack : handleLobbyGone}
          />
        );

      case 'movementA':
        return (
          <MovementAScreen
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            lobbyId={dev.lobbyId || currentLobbyId}
            groupId={dev.groupId || currentGroupId}
            currentUserId={dev.currentUserId || userId}
            currentTeam={dev.currentTeam || currentTeam}
            roundNumber={dev.roundNumber ?? currentRound}
            groupMembers={dev.groupMembers || currentGroupMembers}
            onMovementComplete={devScreenProps ? devBack : handleMovementAComplete}
          />
        );

      case 'movementB':
        return (
          <MovementBScreen
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            lobbyId={dev.lobbyId || currentLobbyId}
            currentTeam={dev.currentTeam || currentTeam}
            roundNumber={dev.roundNumber ?? currentRound}
            movementBEndsAt={dev.movementBEndsAt || movementBEndsAt}
            isSus={dev.isSus ?? isSus}
            onMovementComplete={devScreenProps ? devBack : (() => setCurrentScreen('roundHub'))}
            onEnterRush={() => setCurrentScreen('taskRush')}
            onEnterCoop={() => setCurrentScreen('coopLobby')}
            onDirectSessionStart={({ sessionId: sid, partner, role: r, task }) => {
              setCoopSessionId(sid);
              setCoopPartnerId(partner?.userId ?? null);
              setCoopPartnerUsername(partner?.username ?? null);
              setCoopRole(r);
              setCoopInitialTask(task);
              setCurrentScreen('coopRush');
            }}
          />
        );

      case 'taskRush':
        return (
          <TaskRushScreen
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            lobbyId={dev.lobbyId || currentLobbyId}
            currentTeam={dev.currentTeam || currentTeam}
            roundNumber={dev.roundNumber ?? currentRound}
            movementBEndsAt={dev.movementBEndsAt || movementBEndsAt}
            isSus={dev.isSus ?? isSus}
            onExitRush={devScreenProps ? devBack : (() => setCurrentScreen('movementB'))}
            onMovementComplete={devScreenProps ? devBack : (() => setCurrentScreen('roundHub'))}
          />
        );

      case 'coopLobby':
        return (
          <CoopLobbyScreen
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            lobbyId={dev.lobbyId || currentLobbyId}
            currentTeam={dev.currentTeam || currentTeam}
            groupMembers={dev.groupMembers || currentGroupMembers}
            isSus={dev.isSus ?? isSus}
            movementBEndsAt={dev.movementBEndsAt || movementBEndsAt}
            onSessionStart={({ sessionId: sid, partner, role: r, task }) => {
              setCoopSessionId(sid);
              setCoopPartnerId(partner?.userId ?? null);
              setCoopPartnerUsername(partner?.username ?? null);
              setCoopRole(r);
              setCoopInitialTask(task);
              setCurrentScreen('coopRush');
            }}
            onBack={devScreenProps ? devBack : (() => setCurrentScreen('movementB'))}
          />
        );

      case 'coopRush':
        return (
          <CoopRushScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            currentTeam={currentTeam}
            isSus={isSus}
            movementBEndsAt={movementBEndsAt}
            sessionId={coopSessionId}
            partnerId={coopPartnerId}
            partnerUsername={coopPartnerUsername}
            role={coopRole}
            initialTask={coopInitialTask}
            onSessionEnd={() => {
              setCoopSessionId(null);
              setCoopPartnerId(null);
              setCoopPartnerUsername(null);
              setCoopRole(null);
              setCoopInitialTask(null);
              setCurrentScreen('movementB');
            }}
          />
        );

      case 'movementC':
        return (
          <VotingScreen
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            lobbyId={dev.lobbyId || currentLobbyId}
            groupId={dev.groupId || currentGroupId}
            currentUserId={dev.currentUserId || userId}
            currentTeam={dev.currentTeam || currentTeam}
            roundNumber={dev.roundNumber ?? currentRound}
            groupMembers={dev.groupMembers || currentGroupMembers}
            onMovementComplete={devScreenProps ? devBack : handleMovementCComplete}
            onMovementReady={devScreenProps ? devBack : handleMovementReady}
            onRoundSummary={devScreenProps ? devBack : handleRoundSummary}
            onGameOver={devScreenProps ? devBack : handleGameOver}
          />
        );

      case 'roundSummary':
        return (
          <RoundSummaryScreen
            roundNumber={dev.roundNumber ?? currentRound}
            totalRounds={dev.totalRounds ?? totalRounds}
            summary={dev.summary || roundSummary}
            isLastRound={dev.isLastRound ?? (currentRound >= totalRounds)}
            isSus={dev.isSus ?? isSus}
            token={dev.token || token}
            lobbyId={dev.lobbyId || currentLobbyId}
            gameId={dev.gameId || gameId}
            onRoundSetup={devScreenProps ? devBack : handleRoundSetup}
            onGameOver={devScreenProps ? devBack : handleGameOver}
            onContinue={devScreenProps ? devBack : handleRoundSummaryContinue}
          />
        );

      case 'gmDashboard':
        return <GmWaitingScreen />;

      case 'gameOver':
        return (
          <GameOverScreen
            result={dev.result || gameOverResult}
            token={dev.token || token}
            gameId={dev.gameId || gameId}
            onReturn={devScreenProps ? devBack : (() => {
              resetGameState();
              setCurrentScreen('lobbyList');
            })}
          />
        );

      default:
        return <WelcomeScreen />;
    }
  };

  const contextValue = {
    ...state,
    ...handlers,
    token,
    lobbyId: currentLobbyId,
    currentUserId: token ? String(parseJwt(token).sub) : null,
    resetGameState,
    setSocketConnected,
  };

  return (
    <GameContext.Provider value={contextValue}>
      <View style={styles.root}>
        <StatusBar style="auto" />
        {renderScreen()}
        <ConnectionDot isConnected={socketConnected} />
      </View>
    </GameContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.space,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
