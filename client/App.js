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
import TaskRushScreen from './screens/game/TaskRushScreen';
import VotingScreen from './screens/game/VotingScreen';
import RoundSummaryScreen from './screens/game/RoundSummaryScreen';
import GmWaitingScreen from './screens/game/GmWaitingScreen';
import GameOverScreen from './screens/game/GameOverScreen';
import { colors } from './theme/colors';
import { fetchCurrentLobby, fetchPlayerGameState } from './utils/api';
import { useGameState } from './hooks/useGameState';
import { GameContext } from './context/GameContext';

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
  const {
    handleTeamAssigned, handleGameStarted, handleMovementReady,
    handleMovementAComplete, handleMovementCComplete, handleSusStatusUpdate,
    handleRoundSummary, handleGameStateUpdate, handleRoundSetup,
    handleGameOver,
  } = handlers;

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
    'taskRush',
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
          console.log(`[GameSync] ${currentScreen} → ${targetScreen} (movement: ${stateData.currentMovement})`);
          setters.setCurrentMovement(stateData.currentMovement);
          setCurrentScreen(targetScreen);
        }
      } catch (err) {
        console.warn('[GameSync] poll error:', err.message);
      }
    };
  }); // intentionally no deps

  useEffect(() => {
    const id = setInterval(() => { syncCallbackRef.current?.(); }, 10_000);
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
      console.error('Error checking token:', error);
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
            onCountdownComplete={handleCountdownComplete}
          />
        );

      case 'roleReveal':
        return (
          <RoleRevealScreen
            role={currentTeam}
            skotiaTeammates={skotiaTeammates}
            onRevealComplete={handleRoleRevealComplete}
          />
        );

      case 'roundHub':
        return (
          <RoundHubScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            currentRound={currentRound}
            totalRounds={totalRounds}
            currentTeam={currentTeam}
            isSus={isSus}
            currentGroupMembers={currentGroupMembers}
            groupNumber={currentGroupNumber}
            teamPoints={teamPoints}
            onMovementReady={handleMovementReady}
            onGameStateUpdate={handleGameStateUpdate}
            onSusStatusUpdate={handleSusStatusUpdate}
            onRoundSummary={handleRoundSummary}
            onRoundSetup={handleRoundSetup}
            onGameOver={handleGameOver}
            onLobbyGone={handleLobbyGone}
          />
        );

      case 'movementA':
        return (
          <MovementAScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            groupId={currentGroupId}
            currentUserId={userId}
            currentTeam={currentTeam}
            roundNumber={currentRound}
            groupMembers={currentGroupMembers}
            onMovementComplete={handleMovementAComplete}
          />
        );

      case 'movementB':
        return (
          <MovementBScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            currentTeam={currentTeam}
            roundNumber={currentRound}
            movementBEndsAt={movementBEndsAt}
            isSus={isSus}
            onMovementComplete={() => setCurrentScreen('roundHub')}
            onEnterRush={() => setCurrentScreen('taskRush')}
          />
        );

      case 'taskRush':
        return (
          <TaskRushScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            currentTeam={currentTeam}
            roundNumber={currentRound}
            movementBEndsAt={movementBEndsAt}
            isSus={isSus}
            onExitRush={() => setCurrentScreen('movementB')}
            onMovementComplete={() => setCurrentScreen('roundHub')}
          />
        );

      case 'movementC':
        return (
          <VotingScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            groupId={currentGroupId}
            currentUserId={userId}
            currentTeam={currentTeam}
            roundNumber={currentRound}
            groupMembers={currentGroupMembers}
            onMovementComplete={handleMovementCComplete}
            onMovementReady={handleMovementReady}
            onRoundSummary={handleRoundSummary}
            onGameOver={handleGameOver}
          />
        );

      case 'roundSummary':
        return (
          <RoundSummaryScreen
            roundNumber={currentRound}
            totalRounds={totalRounds}
            summary={roundSummary}
            isLastRound={currentRound >= totalRounds}
            isSus={isSus}
            token={token}
            lobbyId={currentLobbyId}
            onRoundSetup={handleRoundSetup}
            onGameOver={handleGameOver}
            onContinue={handleRoundSummaryContinue}
          />
        );

      case 'gmDashboard':
        return <GmWaitingScreen />;

      case 'gameOver':
        return (
          <GameOverScreen
            result={gameOverResult}
            onReturn={() => {
              resetGameState();
              setCurrentScreen('lobbyList');
            }}
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
  };

  return (
    <GameContext.Provider value={contextValue}>
      <View style={styles.root}>
        <StatusBar style="auto" />
        {renderScreen()}
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
