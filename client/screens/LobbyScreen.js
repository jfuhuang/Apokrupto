import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function LobbyScreen({ token, lobbyId, onLogout, onLeaveLobby }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [lobby, setLobby] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (lobbyId) {
      fetchLobbyDetails();
    }
  }, [lobbyId]);

  const fetchLobbyDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lobbies/${lobbyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        handleLogout();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setLobby(data.lobby);
      } else {
        Alert.alert('Error', data.error || 'Failed to load lobby');
        onLeaveLobby();
      }
    } catch (error) {
      console.error('Error fetching lobby:', error);
      Alert.alert('Error', 'Failed to load lobby details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      const response = await fetch(`${API_URL}/api/lobbies/${lobbyId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        onLeaveLobby();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to leave lobby');
      }
    } catch (error) {
      console.error('Error leaving lobby:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwtToken');
      onLogout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.electricBlue} />
        <Text style={styles.loadingText}>Loading lobby...</Text>
      </View>
    );
  }

  if (!lobby) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Lobby not found</Text>
            <TouchableOpacity style={styles.button} onPress={onLeaveLobby}>
              <Text style={styles.buttonText}>Back to Lobby List</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <View>
            <Animated.Text 
              style={[
                styles.title,
                { transform: [{ translateY: floatAnim }] }
              ]}
            >
              LOBBY
            </Animated.Text>
            <Text style={styles.subtitle}>Welcome to Apokrupto!</Text>
          </View>
          <TouchableOpacity style={styles.headerLogoutButton} onPress={handleLogout}>
            <Text style={styles.headerLogoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.content, isLandscape && styles.contentLandscape]}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Lobby Name:</Text>
              <Text style={styles.infoValue}>{lobby.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Players:</Text>
              <Text style={styles.infoValue}>{lobby.current_players}/{lobby.max_players}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, styles.statusText]}>{lobby.status}</Text>
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.message}>You've successfully joined the lobby.</Text>
            <Text style={styles.info}>Game features coming soon...</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.leaveButton, isLandscape && styles.logoutButtonLandscape]} 
            onPress={handleLeaveLobby}
          >
            <Text style={styles.buttonText}>Leave Lobby</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...typography.h2,
    color: colors.primary.neonRed,
    marginBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLandscape: {
    paddingHorizontal: 40,
  },
  title: {
    ...typography.screenTitle,
    color: colors.primary.electricBlue,
    textShadowColor: colors.effects.glow.blue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginBottom: 5,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text.secondary,
  },
  headerLogoutButton: {
    backgroundColor: colors.primary.neonRed,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent.neonPink,
    shadowColor: colors.effects.glow.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  headerLogoutButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  contentLandscape: {
    paddingHorizontal: 40,
  },
  infoCard: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  infoValue: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  statusText: {
    color: colors.accent.ultraviolet,
    textTransform: 'uppercase',
  },
  messageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  message: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  info: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: colors.primary.electricBlue,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent.cyan,
    shadowColor: colors.effects.glow.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  leaveButton: {
    backgroundColor: colors.primary.neonRed,
    borderColor: colors.accent.neonPink,
    shadowColor: colors.effects.glow.red,
  },
  logoutButtonLandscape: {
    marginHorizontal: 40,
  },
  buttonText: {
    ...typography.button,
    color: colors.text.primary,
  },
});

