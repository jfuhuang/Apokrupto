import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { fetchLobbyPlayers, leaveLobby as apiLeaveLobby } from '../../utils/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

// One color per player slot, assigned by join order (max 15 players)
const PLAYER_COLORS = [
  '#FF3366', '#00D4FF', '#00FF9F', '#FFA63D', '#8B5CF6',
  '#FF006E', '#00F0FF', '#FF00FF', '#FFDD00', '#FF6B35',
  '#4CAF50', '#E91E63', '#9C27B0', '#03A9F4', '#FF5722',
];

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

export default function LobbyScreen({ token, lobbyId, onLogout, onLeaveLobby }) {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [players, setPlayers] = useState([]);
  const [lobbyInfo, setLobbyInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  const myUserId = useRef(String(parseJwt(token).sub));
  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Floating animation for the title
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // REST poll — merges player list from server; socket isConnected state takes precedence
  const fetchPlayers = async () => {
    try {
      const { ok, status, data } = await fetchLobbyPlayers(token, lobbyId);

      if (status === 401 || status === 403) {
        handleLogout();
        return;
      }

      if (!ok) return;

      // Only update from REST if socket isn't supplying live data, or to
      // catch players who joined without a socket event reaching us.
      setLobbyInfo(data.lobbyInfo);
      setPlayers((prev) => {
        // Keep socket-supplied isConnected flags; REST is authoritative for membership
        const connectedMap = {};
        prev.forEach((p) => { connectedMap[p.id] = p.isConnected; });

        return data.players.map((p) => ({
          ...p,
          isConnected: connectedMap[p.id] !== undefined ? connectedMap[p.id] : false,
        }));
      });
    } catch (err) {
      console.error('[LobbyScreen] Poll error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Socket connection
  useEffect(() => {
    let socket;

    const connect = async () => {
      // Make sure the API URL is resolved before connecting
      const baseUrl = await getApiUrl();

      socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[WS] Connected');
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('disconnect', () => {
        console.log('[WS] Disconnected');
        setSocketConnected(false);
      });

      socket.on('lobbyUpdate', (state) => {
        if (!state) return;
        setPlayers(state.players || []);
        setLobbyInfo({
          id: state.lobbyId,
          name: state.name,
          maxPlayers: state.maxPlayers,
          status: state.status,
        });
        setIsLoading(false);
      });

      socket.on('gameStarted', (state) => {
        Alert.alert(
          'Game Started!',
          `${state?.name || 'The game'} has begun. Good luck!`,
          [{ text: 'OK' }]
        );
      });

      socket.on('connect_error', (err) => {
        console.warn('[WS] Connection error:', err.message);
      });
    };

    // Initial REST fetch so the screen shows something while socket connects
    fetchPlayers();

    connect();

    // 10-second polling as the main authority for lobby membership
    pollRef.current = setInterval(fetchPlayers, 10000);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [lobbyId]);

  const handleLeaveLobby = async () => {
    try {
      const { ok, data } = await apiLeaveLobby(token, lobbyId);

      if (ok) {
        onLeaveLobby();
      } else {
        Alert.alert('Error', data.error || 'Failed to leave lobby');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const handleStartGame = () => {
    if (!socketRef.current?.connected) {
      Alert.alert('Error', 'Not connected to server. Please wait and try again.');
      return;
    }

    socketRef.current.emit('startGame', { lobbyId }, (res) => {
      if (res?.error) {
        Alert.alert('Error', res.error);
      }
    });
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwtToken');
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isHost = lobbyInfo ? String(lobbyInfo.hostId ?? lobbyInfo.created_by) === myUserId.current : false;
  const canStart = isHost && players.length >= 4;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.electricBlue} />
        <Text style={styles.loadingText}>Joining lobby...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Compact single-row header */}
        <View style={[styles.header, isLandscape && styles.headerLandscape]}>
          <Animated.Text
            style={[styles.title, { transform: [{ translateY: floatAnim }] }]}
          >
            LOBBY
          </Animated.Text>

          <View style={styles.headerCenter}>
            {lobbyInfo && (
              <Text style={styles.lobbyName} numberOfLines={1}>{lobbyInfo.name}</Text>
            )}
            <Text style={styles.playerCountHeader}>
              {players.length}/{lobbyInfo?.maxPlayers ?? '?'} players
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={[styles.connectionDot, socketConnected ? styles.dotConnected : styles.dotDisconnected]} />
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Player window */}
        <View style={styles.playerWindow}>
          <ScrollView
            contentContainerStyle={styles.playerGrid}
            showsVerticalScrollIndicator={false}
          >
            {players.map((player, index) => (
              <View key={player.id} style={styles.playerCardWrapper}>
                <View style={[
                  styles.playerCard,
                  !player.isConnected && styles.playerCardDisconnected,
                ]}>
                  {/* Color strip */}
                  <View style={[styles.colorStrip, { backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length] }]} />

                  {/* Crown for host */}
                  {player.isHost && (
                    <Text style={styles.crown}>👑</Text>
                  )}

                  {/* Username */}
                  <Text
                    style={[
                      styles.playerName,
                      !player.isConnected && styles.playerNameDisconnected,
                      String(player.id) === myUserId.current && styles.playerNameSelf,
                    ]}
                    numberOfLines={1}
                  >
                    {player.username}
                  </Text>

                  {String(player.id) === myUserId.current && (
                    <Text style={styles.youLabel}>you</Text>
                  )}

                  {/* Offline badge */}
                  {!player.isConnected && (
                    <View style={styles.offlineBadge}>
                      <Text style={styles.offlineBadgeText}>OFFLINE</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {players.length === 0 && (
              <Text style={styles.emptyText}>Waiting for players...</Text>
            )}
          </ScrollView>

          {players.length < 4 && (
            <Text style={styles.waitingText}>
              Waiting for {4 - players.length} more player{4 - players.length !== 1 ? 's' : ''} to start
            </Text>
          )}
        </View>

        {/* Bottom actions */}
        <View style={styles.buttonContainer}>
          {canStart && (
            <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
              <Text style={styles.startButtonText}>START GAME</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveLobby}>
            <Text style={styles.leaveButtonText}>Leave Lobby</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.space,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
  },

  // Header — compact single row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerLandscape: {
    paddingHorizontal: 40,
  },
  title: {
    ...typography.screenTitle,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  lobbyName: {
    ...typography.label,
    color: colors.text.primary,
  },
  playerCountHeader: {
    ...typography.tiny,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: {
    backgroundColor: colors.accent.neonGreen,
  },
  dotDisconnected: {
    backgroundColor: colors.text.disabled,
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

  // Player window — takes all remaining space
  playerWindow: {
    flex: 1,
    margin: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.focus,
    backgroundColor: colors.background.void,
    overflow: 'hidden',
  },

  // 3-column grid
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
  },
  playerCardWrapper: {
    width: '33.33%',
    padding: 4,
  },
  playerCard: {
    borderRadius: 8,
    backgroundColor: colors.background.panel,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    overflow: 'hidden',
    paddingBottom: 10,
    minHeight: 90,
  },
  playerCardDisconnected: {
    opacity: 0.4,
  },
  colorStrip: {
    width: '100%',
    height: 5,
    marginBottom: 6,
  },
  crown: {
    fontSize: 14,
    marginBottom: 2,
  },
  playerName: {
    ...typography.small,
    color: colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  playerNameSelf: {
    color: colors.primary.cyan,
  },
  playerNameDisconnected: {
    color: colors.text.disabled,
  },
  youLabel: {
    ...typography.tiny,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  offlineBadge: {
    backgroundColor: colors.background.frost,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  offlineBadgeText: {
    ...typography.tiny,
    color: colors.text.disabled,
    letterSpacing: 0.5,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 24,
    width: '100%',
  },
  waitingText: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },

  // Bottom buttons
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  startButton: {
    backgroundColor: colors.accent.neonGreen,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent.neonGreen,
    shadowColor: colors.accent.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    ...typography.button,
    color: colors.background.space,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  leaveButtonText: {
    ...typography.button,
    color: colors.text.tertiary,
  },
});
