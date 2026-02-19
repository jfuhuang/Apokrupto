import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import LobbyCard from '../../components/LobbyCard';
import {
  fetchLobbies as apiFetchLobbies,
  createLobby as apiCreateLobby,
  joinLobby as apiJoinLobby,
} from '../../utils/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

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
      if (!background) setIsLoading(true);

      const { ok, status, data } = await apiFetchLobbies(token);

      if (status === 401 || status === 403) {
        Alert.alert('Session Expired', 'Please login again.');
        handleLogout();
        return;
      }

      if (ok) {
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
      const { ok, data } = await apiCreateLobby(token, newLobbyName.trim(), players);

      if (ok) {
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
      const { ok, data } = await apiJoinLobby(token, lobbyId);

      if (ok) {
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
        <ActivityIndicator size="large" color={colors.primary.electricBlue} />
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

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.actionButtonText}>+ Create</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => setShowJoinModal(true)}
          >
            <Text style={styles.actionButtonText}>Join by ID</Text>
          </TouchableOpacity>
        </View>

        {/* Lobby List */}
        <View style={styles.listContainer}>
          <FlatList
            data={filteredLobbies}
            renderItem={({ item }) => (
              <LobbyCard
                lobby={item}
                onPress={() => joinLobby(item.id)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            key="lobbies-grid"
            horizontal={false}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search lobbies..."
                placeholderTextColor={colors.text.placeholder}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No lobbies match your search' : 'No active lobbies'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {!searchQuery && 'Create a lobby to get started!'}
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary.electricBlue}
                colors={[colors.primary.electricBlue]}
              />
            }
          />
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
                placeholderTextColor={colors.text.placeholder}
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
                placeholderTextColor={colors.text.placeholder}
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
                  <ActivityIndicator color={colors.text.primary} />
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
                placeholderTextColor={colors.text.placeholder}
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
                  <ActivityIndicator color={colors.text.primary} />
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
    backgroundColor: colors.background.space,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.space,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background.void,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.focus,
  },
  title: {
    ...typography.h1,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  logoutButton: {
    backgroundColor: colors.primary.neonRed,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.neonPink,
  },
  logoutButtonText: {
    ...typography.tiny,
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background.void,
  },
  createButton: {
    backgroundColor: colors.primary.electricBlue,
    shadowColor: colors.shadow.electricBlue,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  joinButton: {
    backgroundColor: colors.accent.amber,
    shadowColor: colors.accent.amber,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    marginLeft: 'auto',
  },
  actionButtonText: {
    ...typography.buttonSecondary,
    color: colors.text.glow,
  },
  listContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  searchInput: {
    ...typography.body,
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text.primary,
    marginVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
  },
  autoRefreshIndicator: {
    padding: 8,
    alignItems: 'center',
    backgroundColor: colors.background.void,
  },
  autoRefreshText: {
    ...typography.tiny,
    color: colors.text.disabled,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border.focus,
  },
  modalTitle: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    ...typography.label,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  modalInput: {
    ...typography.body,
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text.primary,
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
    backgroundColor: colors.background.frost,
  },
  modalCreateButton: {
    backgroundColor: colors.primary.electricBlue,
  },
  modalJoinButton: {
    backgroundColor: colors.accent.amber,
  },
  modalButtonText: {
    ...typography.button,
    color: colors.text.glow,
  },
});
