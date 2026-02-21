import React, { useEffect, useState } from 'react';
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
import GameScreen from './screens/game/GameScreen';
import GameOverScreen from './screens/game/GameOverScreen';
import DevMenuScreen from './screens/dev/DevMenuScreen';
import TaskScreen from './screens/tasks/TaskScreen';
import { colors } from './theme/colors';
import { fetchCurrentLobby, submitSabotagefix } from './utils/api';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [token, setToken] = useState(null);
  const [currentLobbyId, setCurrentLobbyId] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [currentFellowDeceivers, setCurrentFellowDeceivers] = useState([]);
  const [currentTask, setCurrentTask] = useState(null);
  const [currentTaskOptions, setCurrentTaskOptions] = useState(null);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [isAlive, setIsAlive] = useState(true);
  const [gameOverResult, setGameOverResult] = useState(null);
  const [activeSabotage, setActiveSabotage] = useState(null);

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
    // Check for existing token on app start
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

      // Restore in-progress session from server state
      const { ok, data } = await fetchCurrentLobby(storedToken);
      if (ok && data.lobby) {
        setCurrentLobbyId(data.lobby.id);
        if (data.lobby.status === 'in_progress') {
          setCurrentRole(data.lobby.role);
          setCurrentScreen('game');
          return;
        }
        // Lobby is still 'waiting' — drop back into the lobby screen
        setCurrentScreen('lobby');
        return;
      }

      setCurrentScreen('lobbyList');
    } catch (error) {
      console.error('Error checking token:', error);
      setCurrentScreen('welcome');
    }
  };

  const handleLogin = (jwtToken) => {
    setToken(jwtToken);
    setCurrentScreen('lobbyList');
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentLobbyId(null);
    setCurrentScreen('welcome');
  };

  const handleJoinLobby = (lobbyId) => {
    setCurrentLobbyId(lobbyId);
    setCurrentScreen('lobby');
  };

  const handleLeaveLobby = () => {
    setCurrentLobbyId(null);
    setCurrentScreen('lobbyList');
  };

  const handleRoleAssigned = (role, fellowDeceivers = []) => {
    setCurrentRole(role);
    setCurrentFellowDeceivers(fellowDeceivers);
  };

  const handleGameStarted = () => {
    setCurrentScreen('countdown');
  };

  const handleCountdownComplete = () => {
    setCurrentScreen('roleReveal');
  };

  const handleRoleRevealComplete = () => {
    setActiveSabotage(null);
    setCurrentScreen('game');
  };

  // Rejoin an in-progress game (skips countdown + role reveal)
  const handleRejoinGame = (role) => {
    setCurrentRole(role);
    setCurrentScreen('game');
  };

  const handleStartTask = (task, options = {}) => {
    setCurrentTask(task);
    setCurrentTaskOptions(options);
    setCurrentScreen('task');
  };

  const handleTaskComplete = (taskId, pts) => {
    setCurrentPoints((prev) => prev + pts);
    setCurrentScreen('game');
  };

  const handleGameOver = ({ winner, reason } = {}) => {
    setGameOverResult({ winner, reason });
    setCurrentScreen('gameOver');
  };

  // Dev menu
  const handleOpenDevMenu = () => setCurrentScreen('devMenu');

  const handleDevNavigate = (screen, params = {}) => {
    if (params.role !== undefined) setCurrentRole(params.role);
    if (params.fellowDeceivers !== undefined) setCurrentFellowDeceivers(params.fellowDeceivers);
    if (params.isAlive !== undefined) setIsAlive(params.isAlive);
    // Reset game state when navigating to a game screen from dev menu
    if (screen === 'game') {
      setCurrentPoints(0);
      setIsAlive(params.isAlive !== undefined ? params.isAlive : true);
    }
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    if (!fontsLoaded) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.electricBlue} />
        </View>
      );
    }

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
            onRoleAssigned={handleRoleAssigned}
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
            role={currentRole}
            fellowDeceivers={currentFellowDeceivers}
            onRevealComplete={handleRoleRevealComplete}
          />
        );
      case 'game':
        return (
          <GameScreen
            role={currentRole}
            isAlive={isAlive}
            points={currentPoints}
            lobbyId={currentLobbyId}
            token={token}
            activeSabotage={activeSabotage}
            onSabotageChange={setActiveSabotage}
            onStartTask={handleStartTask}
            onLogout={handleLogout}
            onGameOver={handleGameOver}
            onDevExit={__DEV__ ? () => setCurrentScreen('devMenu') : undefined}
          />
        );
      case 'task':
        return (
          <TaskScreen
            task={currentTask}
            role={currentRole}
            isAlive={isAlive}
            token={token}
            lobbyId={currentLobbyId}
            onComplete={handleTaskComplete}
            onCancel={() => setCurrentScreen('game')}
            onCustomSubmit={
              currentTaskOptions?.isFix
                ? () => submitSabotagefix(token, currentLobbyId)
                : undefined
            }
          />
        );
      case 'gameOver':
        return (
          <GameOverScreen
            result={gameOverResult}
            onReturn={() => setCurrentScreen('lobbyList')}
          />
        );
      case 'devMenu':
        return (
          <DevMenuScreen
            onNavigate={handleDevNavigate}
            onClose={() => setCurrentScreen('welcome')}
          />
        );
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <>
      <StatusBar style="auto" />
      {renderScreen()}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.space,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
