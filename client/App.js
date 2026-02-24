import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
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
import VotingScreen from './screens/game/VotingScreen';
import RoundSummaryScreen from './screens/game/RoundSummaryScreen';
import GmDashboardScreen from './screens/game/GmDashboardScreen';
import GameOverScreen from './screens/game/GameOverScreen';
import DevMenuScreen from './screens/dev/DevMenuScreen';
import TaskScreen from './screens/tasks/TaskScreen';
import { colors } from './theme/colors';
import { fetchCurrentLobby } from './utils/api';

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
  const [previousScreen, setPreviousScreen] = useState(null);

  // Auth
  const [token, setToken] = useState(null);

  // Lobby
  const [currentLobbyId, setCurrentLobbyId] = useState(null);

  // Game session
  const [gameId, setGameId] = useState(null);
  const [totalRounds, setTotalRounds] = useState(4);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentMovement, setCurrentMovement] = useState(null); // 'A' | 'B' | 'C'

  // Player identity
  const [currentTeam, setCurrentTeam] = useState(null); // 'phos' | 'skotia'
  const [skotiaTeammates, setSkotiaTeammates] = useState([]);
  const [isMarked, setIsMarked] = useState(false);
  const [isGm, setIsGm] = useState(false);

  // Group (changes each round)
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentGroupMembers, setCurrentGroupMembers] = useState([]);

  // Scores (team-level only)
  const [teamPoints, setTeamPoints] = useState({ phos: 0, skotia: 0 });

  // Task (Movement B)
  const [currentTask, setCurrentTask] = useState(null);

  // Round summary & game over
  const [roundSummary, setRoundSummary] = useState(null);
  const [gameOverResult, setGameOverResult] = useState(null);

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
          setCurrentTeam(data.lobby.team);
          setIsGm(data.lobby.isGm || false);
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

  const handleTeamAssigned = (team, teammates = []) => {
    setCurrentTeam(team);
    setSkotiaTeammates(teammates);
  };

  const handleGameStarted = () => setCurrentScreen('countdown');

  const handleCountdownComplete = () => setCurrentScreen('roleReveal');

  const handleRoleRevealComplete = () => {
    setCurrentScreen(isGm ? 'gmDashboard' : 'roundHub');
  };

  const handleRejoinGame = (team, gmFlag = false) => {
    setCurrentTeam(team);
    setIsGm(gmFlag);
    setCurrentScreen(gmFlag ? 'gmDashboard' : 'roundHub');
  };

  // ── Round / Movement flow ─────────────────────────────────────────────────

  // Called by RoundHubScreen when the server announces the next movement
  const handleMovementReady = (movement, groupId, groupMembers) => {
    setCurrentMovement(movement);
    if (groupId) setCurrentGroupId(groupId);
    if (groupMembers) setCurrentGroupMembers(groupMembers);

    if (movement === 'A') setCurrentScreen('movementA');
    else if (movement === 'B') setCurrentScreen('movementB');
    else if (movement === 'C') setCurrentScreen('movementC');
  };

  const handleMovementAComplete = () => setCurrentScreen('roundHub');

  // Movement B reuses TaskScreen; task is assigned server-side
  const handleStartTask = (task) => {
    setCurrentTask(task);
    setCurrentScreen('task');
  };

  const handleTaskComplete = () => setCurrentScreen('roundHub');

  // Movement C (voting) always ends a round; summary data comes from server
  const handleMovementCComplete = (summary) => {
    setRoundSummary(summary || null);
    setCurrentScreen('roundSummary');
  };

  // Called by RoundHubScreen when game/group state updates arrive via socket
  const handleGameStateUpdate = ({ gameId: gId, totalRounds: tr, currentRound: cr, teamPoints: tp, isMarked: im, isGm: gm }) => {
    if (gId !== undefined) setGameId(gId);
    if (tr !== undefined) setTotalRounds(tr);
    if (cr !== undefined) setCurrentRound(cr);
    if (tp !== undefined) setTeamPoints(tp);
    if (im !== undefined) setIsMarked(im);
    if (gm !== undefined) setIsGm(gm);
  };

  const handleRoundSummaryContinue = () => {
    if (currentRound >= totalRounds) {
      setCurrentScreen('gameOver');
    } else {
      setCurrentRound((r) => r + 1);
      setRoundSummary(null);
      setCurrentScreen('roundHub');
    }
  };

  const handleGameOver = ({ winner, reason, phosPoints, skotiaPoints, skotiaPlayers, condition } = {}) => {
    setGameOverResult({ winner, reason, phosPoints, skotiaPoints, skotiaPlayers, condition });
    setCurrentScreen('gameOver');
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetGameState = () => {
    setGameId(null);
    setTotalRounds(4);
    setCurrentRound(1);
    setCurrentMovement(null);
    setCurrentTeam(null);
    setSkotiaTeammates([]);
    setIsMarked(false);
    setIsGm(false);
    setCurrentGroupId(null);
    setCurrentGroupMembers([]);
    setTeamPoints({ phos: 0, skotia: 0 });
    setCurrentTask(null);
    setRoundSummary(null);
    setGameOverResult(null);
  };

  // Dev menu — saves current screen so closing returns to it
  const handleOpenDevMenu = () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen('devMenu');
  };

  const handleDevNavigate = (screen, params = {}) => {
    if (params.team !== undefined) setCurrentTeam(params.team);
    if (params.skotiaTeammates !== undefined) setSkotiaTeammates(params.skotiaTeammates);
    if (params.isGm !== undefined) setIsGm(params.isGm);
    if (params.currentRound !== undefined) setCurrentRound(params.currentRound);
    if (params.totalRounds !== undefined) setTotalRounds(params.totalRounds);
    if (params.teamPoints !== undefined) setTeamPoints(params.teamPoints);
    if (params.isMarked !== undefined) setIsMarked(params.isMarked);
    if (params.currentGroupMembers !== undefined) setCurrentGroupMembers(params.currentGroupMembers);
    if (params.groupNumber !== undefined) setCurrentGroupId(params.groupNumber);
    if (params.roundSummary !== undefined) setRoundSummary(params.roundSummary);
    if (params.gameOverResult !== undefined) setGameOverResult(params.gameOverResult);
    if (params.currentTask !== undefined) setCurrentTask(params.currentTask);
    setCurrentScreen(screen);
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
            onOpenDevMenu={handleOpenDevMenu}
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
            isMarked={isMarked}
            currentGroupMembers={currentGroupMembers}
            groupNumber={currentGroupId}
            teamPoints={teamPoints}
            onMovementReady={handleMovementReady}
            onGameStateUpdate={handleGameStateUpdate}
            onGameOver={handleGameOver}
            onLobbyGone={handleLobbyGone}
          />
        );

      case 'movementA':
        return (
          <MovementAScreen
            token={token}
            gameId={gameId}
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
          <RoundHubScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            currentRound={currentRound}
            totalRounds={totalRounds}
            currentTeam={currentTeam}
            isMarked={isMarked}
            currentGroupMembers={currentGroupMembers}
            groupNumber={currentGroupId}
            teamPoints={teamPoints}
            movementBMode
            onStartTask={handleStartTask}
            onMovementReady={handleMovementReady}
            onGameStateUpdate={handleGameStateUpdate}
            onGameOver={handleGameOver}
            onLobbyGone={handleLobbyGone}
          />
        );

      case 'task':
        return (
          <TaskScreen
            task={currentTask}
            role={currentTeam}
            token={token}
            lobbyId={currentLobbyId}
            onComplete={handleTaskComplete}
            onCancel={() => setCurrentScreen('movementB')}
          />
        );

      case 'movementC':
        return (
          <VotingScreen
            token={token}
            gameId={gameId}
            groupId={currentGroupId}
            currentUserId={userId}
            currentTeam={currentTeam}
            roundNumber={currentRound}
            groupMembers={currentGroupMembers}
            onMovementComplete={handleMovementCComplete}
          />
        );

      case 'roundSummary':
        return (
          <RoundSummaryScreen
            roundNumber={currentRound}
            totalRounds={totalRounds}
            summary={roundSummary}
            isLastRound={currentRound >= totalRounds}
            onContinue={handleRoundSummaryContinue}
          />
        );

      case 'gmDashboard':
        return (
          <GmDashboardScreen
            token={token}
            gameId={gameId}
            lobbyId={currentLobbyId}
            onGameOver={handleGameOver}
            onLobbyGone={handleLobbyGone}
          />
        );

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

      case 'devMenu':
        return (
          <DevMenuScreen
            onNavigate={handleDevNavigate}
            onClose={() => setCurrentScreen(previousScreen || 'welcome')}
          />
        );

      default:
        return <WelcomeScreen />;
    }
  };

  // Screens where the floating DEV button should not appear
  const noDevBtn = ['loading', 'devMenu', 'welcome', 'login', 'register'];

  return (
    <View style={styles.root}>
      <StatusBar style="auto" />
      {renderScreen()}
      {__DEV__ && !noDevBtn.includes(currentScreen) && (
        <TouchableOpacity
          style={styles.floatingDevBtn}
          onPress={handleOpenDevMenu}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingDevBtnText}>DEV</Text>
        </TouchableOpacity>
      )}
    </View>
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
  floatingDevBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(13, 15, 26, 0.85)',
  },
  floatingDevBtnText: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    letterSpacing: 2,
    color: colors.accent.amber,
  },
});
