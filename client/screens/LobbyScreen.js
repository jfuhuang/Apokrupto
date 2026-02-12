import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

export default function LobbyScreen({ token, lobbyId, onLogout, onLeaveLobby }) {
  const [lobby, setLobby] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
        <ActivityIndicator size="large" color="#00aaff" />
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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{lobby.name}</Text>
            <Text style={styles.subtitle}>Lobby ID: {lobby.id}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Host:</Text>
              <Text style={styles.infoValue}>{lobby.host_username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Players:</Text>
              <Text style={styles.infoValue}>
                {lobby.current_players}/{lobby.max_players}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, styles.statusText]}>
                {lobby.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.message}>You've joined the lobby!</Text>
            <Text style={styles.info}>
              Waiting for other players to join...
            </Text>
            <Text style={styles.info}>
              Game features coming soon!
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.leaveButton]}
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
    backgroundColor: '#1a1a1a',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 2,
    borderBottomColor: '#00aaff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#cccccc',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: '#ff0000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00aaff',
    marginBottom: 30,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#999999',
    fontSize: 16,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    color: '#00ff00',
  },
  messageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  message: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 20,
    color: '#ff0000',
    marginBottom: 20,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    backgroundColor: '#00aaff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: '#ff0000',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

