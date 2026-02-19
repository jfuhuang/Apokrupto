import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import LobbyCard from '../components/LobbyCard';
import { API_URL } from '../config';

export default function LobbyListScreen({ token, onLogout, onJoinLobby }) {
  const [lobbies, setLobbies] = useState([]);
  const [filteredLobbies, setFilteredLobbies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newLobbyName, setNewLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  const refreshInterval = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    fetchLobbies();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      stopAutoRefresh();
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, restart auto-refresh and fetch immediately
      fetchLobbies(true);
      startAutoRefresh();
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background, stop auto-refresh
      stopAutoRefresh();
    }
    appState.current = nextAppState;
  };

  const startAutoRefresh = () => {
    if (!refreshInterval.current) {
      refreshInterval.current = setInterval(() => {
        fetchLobbies(true);
      }, 10000);
    }
  };

  const stopAutoRefresh = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }
  };

  useEffect(() => {
    // Filter lobbies based on search query
    if (searchQuery.trim() === '') {
      setFilteredLobbies(lobbies);
    } else {
      const filtered = lobbies.filter(lobby => 
        lobby.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lobby.host_username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lobby.id.toString().includes(searchQuery)
      );
      setFilteredLobbies(filtered);
    }
  }, [searchQuery, lobbies]);

  const fetchLobbies = async (background = false) => {
    try {
      if (!background) {
        setIsLoading(true);
      }
      
      const response = await fetch(`${API_URL}/api/lobbies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        // Token is invalid, logout
        Alert.alert('Session Expired', 'Please login again.');
        handleLogout();
        return;
      }

      const data = await response.json();
      
      if (response.ok) {
        setLobbies(data.lobbies);
      } else {
        console.error('Failed to fetch lobbies:', data.error);
      }
    } catch (error) {
      console.error('Error fetching lobbies:', error);
      if (!background) {
        Alert.alert('Error', 'Failed to load lobbies. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLobbies();
  };

  const handleCreateLobby = async () => {
    if (!newLobbyName.trim()) {
      Alert.alert('Error', 'Please enter a lobby name');
      return;
    }

    const players = parseInt(maxPlayers);
    if (isNaN(players) || players < 4 || players > 15) {
      Alert.alert('Error', 'Max players must be between 4 and 15');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/lobbies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newLobbyName.trim(),
          max_players: players,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setNewLobbyName('');
        setMaxPlayers('10');
        fetchLobbies();
        Alert.alert('Success', 'Lobby created successfully!', [
          { text: 'OK', onPress: () => onJoinLobby(data.lobby.id) }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to create lobby');
      }
    } catch (error) {
      console.error('Error creating lobby:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinById = async () => {
    if (!joinLobbyId.trim()) {
      Alert.alert('Error', 'Please enter a lobby ID');
      return;
    }

    const lobbyId = parseInt(joinLobbyId);
    if (isNaN(lobbyId)) {
      Alert.alert('Error', 'Invalid lobby ID');
      return;
    }

    await joinLobby(lobbyId);
  };

  const joinLobby = async (lobbyId) => {
    setIsJoining(true);
    try {
      const response = await fetch(`${API_URL}/api/lobbies/${lobbyId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setShowJoinModal(false);
        setJoinLobbyId('');
        onJoinLobby(lobbyId);
      } else {
        Alert.alert('Error', data.error || 'Failed to join lobby');
      }
    } catch (error) {
      console.error('Error joining lobby:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsJoining(false);
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
        <Text style={styles.loadingText}>Loading lobbies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>LOBBIES</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, host, or ID..."
            placeholderTextColor="#666666"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.createButton]}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.actionButtonText}>+ Create Lobby</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={() => setShowJoinModal(true)}
          >
            <Text style={styles.actionButtonText}>Join by ID</Text>
          </TouchableOpacity>
        </View>

        {/* Lobby List */}
        <View style={styles.listContainer}>
          {filteredLobbies.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No lobbies match your search' : 'No active lobbies'}
              </Text>
              <Text style={styles.emptySubtext}>
                {!searchQuery && 'Create a lobby to get started!'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredLobbies}
              renderItem={({ item }) => (
                <LobbyCard
                  lobby={item}
                  onPress={() => joinLobby(item.id)}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              horizontal={false}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#00aaff"
                  colors={['#00aaff']}
                />
              }
            />
          )}
        </View>

        {/* Auto-refresh indicator */}
        <View style={styles.autoRefreshIndicator}>
          <Text style={styles.autoRefreshText}>
            Auto-refreshing every 10 seconds
          </Text>
        </View>
      </SafeAreaView>

      {/* Create Lobby Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Lobby</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Lobby Name</Text>
              <TextInput
                style={styles.modalInput}
                value={newLobbyName}
                onChangeText={setNewLobbyName}
                placeholder="Enter lobby name"
                placeholderTextColor="#666666"
                maxLength={100}
              />
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Max Players (4-15)</Text>
              <TextInput
                style={styles.modalInput}
                value={maxPlayers}
                onChangeText={setMaxPlayers}
                placeholder="10"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewLobbyName('');
                  setMaxPlayers('10');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalCreateButton]}
                onPress={handleCreateLobby}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join by ID Modal */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join Lobby by ID</Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Lobby ID</Text>
              <TextInput
                style={styles.modalInput}
                value={joinLobbyId}
                onChangeText={setJoinLobbyId}
                placeholder="Enter lobby ID"
                placeholderTextColor="#666666"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowJoinModal(false);
                  setJoinLobbyId('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalJoinButton]}
                onPress={handleJoinById}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalButtonText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 2,
    borderBottomColor: '#00aaff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#2a2a2a',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  createButton: {
    backgroundColor: '#00aaff',
    shadowColor: '#00aaff',
  },
  joinButton: {
    backgroundColor: '#ff9900',
    shadowColor: '#ff9900',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
  },
  autoRefreshIndicator: {
    padding: 8,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  autoRefreshText: {
    color: '#666666',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#00aaff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#666666',
  },
  modalCreateButton: {
    backgroundColor: '#00aaff',
  },
  modalJoinButton: {
    backgroundColor: '#ff9900',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
