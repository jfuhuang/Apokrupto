import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { MOVEMENT_NAMES } from '../../constants/movementNames';
import SusIcon from '../../components/SusIcon';

export default function GmDashboardScreen({ token, gameId, lobbyId, onGameOver, onLobbyGone }) {
  const [players, setPlayers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [gameState, setGameState] = useState(null); // { round, totalRounds, movement, status }
  const [teamPoints, setTeamPoints] = useState({ phos: 0, skotia: 0 });
  const [broadcastText, setBroadcastText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  // Movement A turn timer: { turnIndex, totalTurns, timeLimit, phase, slotStartedAt } | null
  const [movAPhase, setMovAPhase] = useState(null);
  const [gmTimerLeft, setGmTimerLeft] = useState(0);

  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const fetchState = async () => {
    try {
      const baseUrl = await getApiUrl();
      const res = await fetch(`${baseUrl}/api/games/${gameId}/gm-state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.players) setPlayers(data.players);
      if (data.groups) setGroups(data.groups);
      if (data.gameState) setGameState(data.gameState);
      if (data.teamPoints) setTeamPoints(data.teamPoints);
      // Seed the turn timer on load / re-poll (socket events update it in real-time)
      if (data.movATurnInfo) setMovAPhase(data.movATurnInfo);
      else if (data.gameState?.movement !== 'A') setMovAPhase(null);
    } catch (err) {
      console.warn('[GM] Poll error:', err.message);
    }
  };

  useEffect(() => {
    let socket;

    const connect = async () => {
      const baseUrl = await getApiUrl();
      socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('disconnect', () => setSocketConnected(false));

      socket.on('gameStateUpdate', (state) => {
        if (state.players) setPlayers(state.players);
        if (state.gameState) setGameState(state.gameState);
        if (state.teamPoints) setTeamPoints(state.teamPoints);
      });

      socket.on('movementATurnUpdate', (data) => {
        setMovAPhase(data);
      });

      socket.on('movementStart', (data) => {
        // Clear the turn timer when a new movement starts
        if (data.movement !== 'A') setMovAPhase(null);
        fetchState();
      });

      socket.on('movementComplete', () => {
        // A movement auto-completed (deliberation/B timer/voting timer) — refresh state
        setMovAPhase(null);
        fetchState();
      });

      socket.on('roundSummary', () => {
        fetchState();
      });

      socket.on('gameOver', (result) => {
        if (onGameOver) onGameOver(result);
      });

      socket.on('lobbyClosed', () => {
        if (onLobbyGone) onLobbyGone();
      });

      socket.on('connect_error', () => setSocketConnected(false));
    };

    fetchState();
    connect().catch(console.error);
    pollRef.current = setInterval(fetchState, 10000);

    return () => {
      clearInterval(pollRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, lobbyId, token]);

  // Countdown tick — resets whenever movAPhase changes (new turn or deliberation)
  useEffect(() => {
    if (!movAPhase || movAPhase.phase !== 'active' || !movAPhase.slotStartedAt) {
      setGmTimerLeft(0);
      return;
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - movAPhase.slotStartedAt) / 1000);
      setGmTimerLeft(Math.max(0, movAPhase.timeLimit - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [movAPhase]);

  const handleAdvance = () => {
    if (!socketRef.current?.connected) {
      Alert.alert('Not connected', 'Wait for socket connection before advancing.');
      return;
    }
    Alert.alert(
      'Advance Movement',
      'Move all players to the next phase?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Advance',
          onPress: () => {
            setAdvancing(true);
            socketRef.current.emit('gmAdvance', { gameId }, (res) => {
              setAdvancing(false);
              if (res?.error) Alert.alert('Error', res.error);
            });
          },
        },
      ]
    );
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return;
    try {
      const baseUrl = await getApiUrl();
      await fetch(`${baseUrl}/api/games/${gameId}/broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastText.trim(), lobbyId }),
      });
      setBroadcastText('');
    } catch (err) {
      Alert.alert('Error', 'Could not send broadcast.');
    }
  };

  const phosPlayers = players.filter((p) => p.team === 'phos');
  const skotiaPlayers = players.filter((p) => p.team === 'skotia');

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>GM DASHBOARD</Text>
          <View style={styles.headerRight}>
            <View style={[styles.connDot, socketConnected ? styles.connDotOn : styles.connDotOff]} />
            <Text style={styles.connLabel}>{socketConnected ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Game state */}
          <View style={styles.stateCard}>
            <View style={styles.stateRow}>
              <Text style={styles.stateLabel}>ROUND</Text>
              <Text style={styles.stateValue}>
                {gameState?.round ?? '—'} / {gameState?.totalRounds ?? '—'}
              </Text>
            </View>
            <View style={styles.stateDivider} />
            <View style={styles.stateRow}>
              <Text style={styles.stateLabel}>MOVEMENT</Text>
              <Text style={styles.stateValue}>
                {gameState?.movement
                  ? `${gameState.movement} — ${MOVEMENT_NAMES[gameState.movement]}`
                  : '—'}
              </Text>
            </View>
            {movAPhase && (
              <>
                <View style={styles.stateDivider} />
                <View style={styles.stateRow}>
                  <Text style={styles.stateLabel}>TURN</Text>
                  <Text style={styles.stateValue}>
                    {movAPhase.turnIndex + 1} / {movAPhase.totalTurns}
                  </Text>
                </View>
                <View style={styles.stateDivider} />
                <View style={styles.stateRow}>
                  <Text style={styles.stateLabel}>SLOT TIMER</Text>
                  {movAPhase.phase === 'deliberation' ? (
                    <Text style={[styles.stateValue, { color: colors.accent.amber }]}>
                      DELIBERATION
                    </Text>
                  ) : (
                    <Text style={[
                      styles.stateValue,
                      { color: gmTimerLeft <= 10 ? colors.primary.neonRed : colors.text.primary },
                    ]}>
                      {gmTimerLeft}s
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Score */}
          <View style={styles.scoreRow}>
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreTeam, { color: colors.primary.electricBlue }]}>PHOS</Text>
              <Text style={[styles.scoreValue, { color: colors.primary.electricBlue }]}>
                {teamPoints.phos}
              </Text>
            </View>
            <View style={styles.scoreSep} />
            <View style={styles.scoreBlock}>
              <Text style={[styles.scoreTeam, { color: colors.primary.neonRed }]}>SKOTIA</Text>
              <Text style={[styles.scoreValue, { color: colors.primary.neonRed }]}>
                {teamPoints.skotia}
              </Text>
            </View>
          </View>

          {/* Advance control */}
          <TouchableOpacity
            style={[styles.advanceBtn, (!socketConnected || advancing) && styles.advanceBtnDisabled]}
            onPress={handleAdvance}
            disabled={!socketConnected || advancing}
            activeOpacity={0.8}
          >
            <Text style={styles.advanceBtnText}>{advancing ? 'ADVANCING...' : 'ADVANCE MOVEMENT'}</Text>
          </TouchableOpacity>

          {/* Broadcast */}
          <View style={styles.broadcastCard}>
            <Text style={styles.broadcastLabel}>BROADCAST TO ALL PLAYERS</Text>
            <TextInput
              style={styles.broadcastInput}
              placeholder="Type a message..."
              placeholderTextColor={colors.text.placeholder}
              value={broadcastText}
              onChangeText={setBroadcastText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.broadcastBtn, !broadcastText.trim() && styles.broadcastBtnDisabled]}
              onPress={handleBroadcast}
              disabled={!broadcastText.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.broadcastBtnText}>SEND</Text>
            </TouchableOpacity>
          </View>

          {/* Groups for current round (projector view) */}
          {groups.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GROUPS — ROUND {gameState?.round ?? '?'}</Text>
              {groups.map((group) => (
                <View key={group.groupId} style={styles.groupCard}>
                  <Text style={styles.groupHeader}>GROUP {group.groupIndex}</Text>
                  <View style={styles.groupMembers}>
                    {group.members.map((m) => (
                      <View key={m.id} style={styles.groupMemberRow}>
                        <View
                          style={[
                            styles.groupTeamDot,
                            { backgroundColor: m.team === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue },
                          ]}
                        />
                        <Text
                          style={[
                            styles.groupMemberName,
                            { color: m.team === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue },
                          ]}
                        >
                          {m.username}
                        </Text>
                        {m.isSus && <SusIcon size={12} />}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Skotia list (visible to GM only) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKOTIA ({skotiaPlayers.length})</Text>
            {skotiaPlayers.map((p) => (
              <View key={p.id} style={[styles.playerRow, styles.skotiaRow]}>
                <Text style={[styles.playerName, { color: colors.primary.neonRed }]}>{p.username}</Text>
                {p.isSus && <SusIcon size={12} />}
              </View>
            ))}
          </View>

          {/* Phos list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PHOS ({phosPlayers.length})</Text>
            {phosPlayers.map((p) => (
              <View key={p.id} style={styles.playerRow}>
                <Text style={[styles.playerName, { color: colors.primary.electricBlue }]}>{p.username}</Text>
                {p.isSus && <SusIcon size={12} />}
              </View>
            ))}
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.accent.amber,
    textShadowColor: colors.accent.amber,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connDotOn: { backgroundColor: colors.accent.neonGreen },
  connDotOff: { backgroundColor: colors.text.disabled },
  connLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  scroll: {
    padding: 16,
    gap: 14,
  },
  stateCard: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  stateValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  stateDivider: {
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  scoreRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  scoreBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  scoreTeam: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
  },
  scoreValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 30,
    letterSpacing: 1,
  },
  scoreSep: {
    width: 1,
    backgroundColor: colors.border.subtle,
  },
  advanceBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: colors.accent.amber,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.accent.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  advanceBtnDisabled: {
    backgroundColor: colors.background.panel,
    shadowOpacity: 0,
    elevation: 0,
  },
  advanceBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: colors.background.space,
  },
  broadcastCard: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 14,
    gap: 10,
  },
  broadcastLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  broadcastInput: {
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...typography.body,
    color: colors.text.primary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  broadcastBtn: {
    paddingVertical: 10,
    backgroundColor: colors.background.frost,
    borderRadius: 8,
    alignItems: 'center',
  },
  broadcastBtnDisabled: {
    opacity: 0.4,
  },
  broadcastBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.text.primary,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  skotiaRow: {
    borderColor: 'rgba(255, 51, 102, 0.2)',
  },
  playerName: {
    ...typography.body,
  },
  groupCard: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 12,
    gap: 8,
  },
  groupHeader: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.accent.amber,
  },
  groupMembers: {
    gap: 4,
  },
  groupMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  groupTeamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  groupMemberName: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
  },
});
