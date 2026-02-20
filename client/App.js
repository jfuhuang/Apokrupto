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
import { colors } from './theme/colors';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [token, setToken] = useState(null);
  const [currentLobbyId, setCurrentLobbyId] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);

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
      if (storedToken) {
        setToken(storedToken);
        setCurrentScreen('lobbyList');
      } else {
        setCurrentScreen('welcome');
      }
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

  const handleRoleAssigned = (role) => {
    setCurrentRole(role);
  };

  const handleGameStarted = () => {
    setCurrentScreen('countdown');
  };

  const handleCountdownComplete = () => {
    setCurrentScreen('roleReveal');
  };

  const handleRoleRevealComplete = () => {
    setCurrentScreen('game');
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
            onRevealComplete={handleRoleRevealComplete}
          />
        );
      case 'game':
        return (
          <GameScreen
            onLogout={handleLogout}
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
