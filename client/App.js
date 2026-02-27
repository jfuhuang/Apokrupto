import React, { useEffect, useRef, useState } from 'react';
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
import MovementBScreen from './screens/game/MovementBScreen';
import VotingScreen from './screens/game/VotingScreen';
import RoundSummaryScreen from './screens/game/RoundSummaryScreen';
import GmWaitingScreen from './screens/game/GmWaitingScreen';
import GameOverScreen from './screens/game/GameOverScreen';
import DevMenuScreen from './screens/dev/DevMenuScreen';
import { colors } from './theme/colors';
import { fetchCurrentLobby, fetchPlayerGameState } from './utils/api';

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
  const [currentGroupId, setCurrentGroupId] = useState(null);       // DB id, used for socket rooms
  const [currentGroupNumber, setCurrentGroupNumber] = useState(null); // 1-indexed display label
  const [currentGroupMembers, setCurrentGroupMembers] = useState([]);

  // Scores (team-level only)
  const [teamPoints, setTeamPoints] = useState({ phos: 0, skotia: 0 });

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

  // ── Server sync (10 s polling safety net) ────────────────────────────────
  // Screens where we deliberately do NOT force-navigate:
  //   transitional  → let the animation/timer finish naturally
  //   pre-game      → no game state to sync against
  const SYNC_SKIP_SCREENS = [
    'loading', 'welcome', 'login', 'register', 'lobbyList',
    'countdown', 'roleReveal', 'roundSummary', 'gameOver', 'devMenu',
  ];

  // "Latest callback ref" pattern — updated on every render so the stable
  // interval always calls a closure that has access to fresh state & setters.
  const syncCallbackRef = useRef(null);
  useEffect(() => {
    syncCallbackRef.current = async () => {
      if (!token || SYNC_SKIP_SCREENS.includes(currentScreen)) return;
      try {
        // Step 1 — lobby/game membership check
        const { ok: lobbyOk, data: lobbyData } = await fetchCurrentLobby(token);
        if (!lobbyOk) return;

        const lobby = lobbyData.lobby;

        // No active lobby → kick to lobby list
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

        // lobby.status === 'in_progress'
        const gId = lobby.gameId || gameId;
        if (!gId) return;
        setGameId(gId);
        setIsGm(lobby.isGm || false);

        if (lobby.isGm) {
          if (currentScreen !== 'gmDashboard') setCurrentScreen('gmDashboard');
          return;
        }

        // Step 2 — per-player game state
        const { ok: stateOk, data: state } = await fetchPlayerGameState(token, gId);
        if (!stateOk) return;

        // Sync all relevant state fields before any navigation
        if (state.team)                  setCurrentTeam(state.team);
        if (state.isMarked !== undefined) setIsMarked(state.isMarked);
        if (state.teamPoints)            setTeamPoints(state.teamPoints);
        if (state.currentRound)          setCurrentRound(state.currentRound);
        if (state.totalRounds)           setTotalRounds(state.totalRounds);
        if (state.groupId) {
          setCurrentGroupId(String(state.groupId));
          setCurrentGroupNumber(state.groupIndex ?? null);
        }
        if (state.groupMembers)          setCurrentGroupMembers(state.groupMembers);

        // Map server movement → expected client screen
        const targetScreen =
          state.currentMovement === 'A' ? 'movementA' :
          state.currentMovement === 'B' ? 'movementB' :
          state.currentMovement === 'C' ? 'movementC' :
          'roundHub';

        if (currentScreen !== targetScreen) {
          console.log(`[GameSync] ${currentScreen} → ${targetScreen} (movement: ${state.currentMovement})`);
          setCurrentMovement(state.currentMovement);
          setCurrentScreen(targetScreen);
        }
      } catch (err) {
        console.warn('[GameSync] poll error:', err.message);
      }
    };
  }); // intentionally no deps — re-runs after every render to stay fresh

  // Stable interval: created once, always calls the latest callback
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

  const handleTeamAssigned = (team, teammates = [], gmFlag = false, groupId = null, groupNumber = null, groupMembers = []) => {
    setCurrentTeam(team);
    setSkotiaTeammates(teammates);
    setIsGm(gmFlag);
    if (groupId) setCurrentGroupId(groupId);
    if (groupNumber != null) setCurrentGroupNumber(groupNumber);
    if (groupMembers.length > 0) setCurrentGroupMembers(groupMembers);
  };

  const handleGameStarted = (gId) => {
    if (gId) setGameId(gId);
    setCurrentScreen('countdown');
  };

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
  const handleMovementReady = (movement, groupId, groupMembers, groupNumber) => {
    setCurrentMovement(movement);
    if (groupId) setCurrentGroupId(groupId);
    if (groupMembers) setCurrentGroupMembers(groupMembers);
    if (groupNumber != null) setCurrentGroupNumber(groupNumber);

    if (movement === 'A') setCurrentScreen('movementA');
    else if (movement === 'B') setCurrentScreen('movementB');
    else if (movement === 'C') setCurrentScreen('movementC');
  };

  const handleMovementAComplete = () => setCurrentScreen('roundHub');

  // Movement C voting timer (or GM force) ended — return to RoundHub for GM to resolve
  const handleMovementCComplete = () => {
    setCurrentScreen('roundHub');
  };

  // RoundHubScreen received markStatusUpdate event — update personal mark status
  const handleMarkStatusUpdate = (marked) => setIsMarked(marked);

  // RoundHubScreen received roundSummary event — navigate to summary screen
  const handleRoundSummary = (summary) => {
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

  // Called from RoundSummaryScreen roundSetup socket event or button (last round only)
  const handleRoundSetup = ({ roundNumber, groupId, groupNumber, groupMembers, teamPoints: tp }) => {
    if (roundNumber) setCurrentRound(roundNumber);
    if (groupId) setCurrentGroupId(String(groupId));
    if (groupNumber != null) setCurrentGroupNumber(groupNumber);
    if (groupMembers) setCurrentGroupMembers(groupMembers);
    if (tp) setTeamPoints(tp);
    setRoundSummary(null);
    setCurrentScreen('roundHub');
  };

  const handleRoundSummaryContinue = () => {
    // Button fallback (only enabled on last round → goes to gameOver)
    if (currentRound >= totalRounds) {
      setCurrentScreen('gameOver');
    } else {
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
    setCurrentGroupNumber(null);
    setCurrentGroupMembers([]);
    setTeamPoints({ phos: 0, skotia: 0 });
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
    if (params.groupNumber !== undefined) setCurrentGroupNumber(params.groupNumber);
    if (params.roundSummary !== undefined) setRoundSummary(params.roundSummary);
    if (params.gameOverResult !== undefined) setGameOverResult(params.gameOverResult);
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
            groupNumber={currentGroupNumber}
            teamPoints={teamPoints}
            onMovementReady={handleMovementReady}
            onGameStateUpdate={handleGameStateUpdate}
            onMarkStatusUpdate={handleMarkStatusUpdate}
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
          />
        );

      case 'roundSummary':
        return (
          <RoundSummaryScreen
            roundNumber={currentRound}
            totalRounds={totalRounds}
            summary={roundSummary}
            isLastRound={currentRound >= totalRounds}
            isMarked={isMarked}
            token={token}
            lobbyId={currentLobbyId}
            onContinue={handleRoundSummaryContinue}
            onRoundSetup={handleRoundSetup}
            onGameOver={handleGameOver}
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
