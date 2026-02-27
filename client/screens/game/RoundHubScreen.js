import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

const MOVEMENT_LABELS = { A: 'DEDUCTION', B: 'TASKS', C: 'VOTING' };
const MOVEMENT_SEQUENCE = ['A', 'B', 'C'];

export default function RoundHubScreen({
  token,
  gameId,
  lobbyId,
  currentRound,
  totalRounds,
  currentTeam,
  isMarked,
  currentGroupMembers,
  groupNumber,
  teamPoints,
  onMovementReady,
  onGameStateUpdate,
  onRoundSummary,
  onRoundSetup,
  onGameOver,
  onLobbyGone,
}) {
  const [statusMessage, setStatusMessage] = useState('Waiting for Game Master...');
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveGroupMembers, setLiveGroupMembers] = useState(currentGroupMembers || []);
  const [liveTeamPoints, setLiveTeamPoints] = useState(teamPoints || { phos: 0, skotia: 0 });
  const [activeMovement, setActiveMovement] = useState(null);
  const [completedMovements, setCompletedMovements] = useState(new Set());

  const socketRef = useRef(null);

  useEffect(() => {
    setLiveGroupMembers(currentGroupMembers || []);
  }, [currentGroupMembers]);

  useEffect(() => {
    setLiveTeamPoints(teamPoints || { phos: 0, skotia: 0 });
  }, [teamPoints]);

  useEffect(() => {
    let socket;

    const connect = async () => {
      const baseUrl = await getApiUrl();
      socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('disconnect', () => setSocketConnected(false));

      socket.on('gameStateUpdate', (state) => {
        if (!state) return;
        if (state.teamPoints) setLiveTeamPoints(state.teamPoints);
        if (state.groupMembers) setLiveGroupMembers(state.groupMembers);
        if (onGameStateUpdate) onGameStateUpdate(state);
      });

      socket.on('movementStart', ({ movement, groupId, groupMembers, groupNumber: gn }) => {
        setActiveMovement(movement);
        setStatusMessage(`Movement ${movement} — ${MOVEMENT_LABELS[movement]} beginning...`);
        if (groupMembers) setLiveGroupMembers(groupMembers);
        if (onMovementReady) onMovementReady(movement, groupId, groupMembers, gn ?? null);
      });

      socket.on('movementComplete', ({ movement }) => {
        setCompletedMovements((prev) => new Set([...prev, movement]));
        setActiveMovement(null);
        setStatusMessage(`Movement ${movement} complete. Waiting for Game Master...`);
      });

      socket.on('roundSummary', (summary) => {
        if (onRoundSummary) onRoundSummary(summary);
      });

      socket.on('roundSetup', ({ roundNumber, groupId, groupNumber: gn, groupMembers, teamPoints: tp }) => {
        setLiveGroupMembers(groupMembers || []);
        if (tp) setLiveTeamPoints(tp);
        setCompletedMovements(new Set());
        setActiveMovement(null);
        setStatusMessage('Waiting for Game Master...');
        if (onRoundSetup) onRoundSetup({ roundNumber, groupId, groupNumber: gn, groupMembers, teamPoints: tp });
      });

      socket.on('announcement', ({ message }) => {
        if (message) setStatusMessage(message);
      });

      socket.on('gameOver', (result) => {
        if (onGameOver) onGameOver(result);
      });

      socket.on('lobbyClosed', () => {
        if (onLobbyGone) onLobbyGone();
      });

      socket.on('connect_error', () => setSocketConnected(false));
    };

    // On mount, fetch current game state in case the initial movementStart event
    // was emitted before this screen was mounted (race between game start and
    // countdown + roleReveal screens). If a movement is already active, navigate
    // immediately using the group info already in props.
    const checkActiveMovement = async () => {
      if (!gameId) return;
      try {
        const baseUrl = await getApiUrl();
        const res = await fetch(`${baseUrl}/api/games/${gameId}/state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const state = await res.json();
        // Restore completed movements indicator from server state
        if (state.completedMovements && state.completedMovements.length > 0) {
          setCompletedMovements(new Set(state.completedMovements));
        }
        // Navigate immediately if a movement is already active (reconnect case)
        if (state.currentMovement && onMovementReady) {
          onMovementReady(
            state.currentMovement,
            state.groupId || null,
            state.groupMembers || null,
            state.groupIndex ?? null
          );
        }
      } catch (err) {
        console.warn('[RoundHub] Could not fetch game state:', err.message);
      }
    };

    connect().catch(console.error);
    checkActiveMovement();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [lobbyId, token]);

  const teamColor = currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;
  const groupLabel = groupNumber != null ? `GROUP ${groupNumber}` : 'YOUR GROUP';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.roundLabel}>ROUND</Text>
            <Text style={[styles.roundNumber, { color: teamColor }]}>{currentRound}/{totalRounds}</Text>
          </View>

          <View style={styles.movementIndicator}>
            {MOVEMENT_SEQUENCE.map((m) => {
              const isDone   = completedMovements.has(m);
              const isActive = activeMovement === m;
              return (
                <View
                  key={m}
                  style={[
                    styles.movementPip,
                    isDone   && styles.movementPipDone,
                    isActive && styles.movementPipActive,
                  ]}
                >
                  <Text style={[
                    styles.movementPipLabel,
                    isDone   && { color: colors.accent.neonGreen },
                    isActive && { color: colors.primary.electricBlue },
                  ]}>
                    {m}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.headerRight}>
            <View style={[styles.connDot, socketConnected ? styles.connDotOn : styles.connDotOff]} />
            <Text style={[styles.teamBadge, { color: teamColor }]}>
              {currentTeam === 'skotia' ? 'ΣΚΟΤΊΑ' : 'ΦΩΣ'}
            </Text>
          </View>
        </View>

        {/* Score bar */}
        <View style={styles.scoreBar}>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreTeam, { color: colors.primary.electricBlue }]}>PHOS</Text>
            <Text style={[styles.scoreValue, { color: colors.primary.electricBlue }]}>
              {liveTeamPoints.phos}
            </Text>
          </View>
          <Text style={styles.scoreSep}>—</Text>
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreTeam, { color: colors.primary.neonRed }]}>SKOTIA</Text>
            <Text style={[styles.scoreValue, { color: colors.primary.neonRed }]}>
              {liveTeamPoints.skotia}
            </Text>
          </View>
        </View>

        {/* Status message */}
        <View style={styles.statusBox}>
          <Text style={styles.statusText} numberOfLines={2}>{statusMessage}</Text>
        </View>

        {/* Group section — fills remaining space */}
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupLabel}>{groupLabel}</Text>
            {isMarked && (
              <View style={styles.selfMarkedBadge}>
                <Text style={styles.selfMarkedText}>YOU ARE MARKED</Text>
              </View>
            )}
          </View>

          <View style={styles.groupGrid}>
            {liveGroupMembers.length === 0 ? (
              <View style={styles.emptyGroup}>
                <Text style={styles.emptyGroupText}>Group assignment pending...</Text>
              </View>
            ) : (
              liveGroupMembers.map((member) => (
                <View key={member.id} style={styles.memberCardWrapper}>
                  <View
                    style={[
                      styles.memberCard,
                      member.isMarked && styles.memberCardMarked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberName,
                        member.isMarked && { color: colors.primary.neonRed },
                      ]}
                      numberOfLines={1}
                    >
                      {member.username}
                    </Text>
                    {member.isYou && <Text style={styles.youTag}>you</Text>}
                    {member.isMarked && (
                      <View style={styles.markBadge}>
                        <Text style={styles.markBadgeText}>MARKED</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  roundLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  roundNumber: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    letterSpacing: 1,
  },
  movementIndicator: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  movementPip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.panel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movementPipDone: {
    borderColor: colors.accent.neonGreen,
    backgroundColor: 'rgba(57, 255, 20, 0.12)',
  },
  movementPipActive: {
    borderColor: colors.primary.electricBlue,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  movementPipLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.text.disabled,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connDotOn: { backgroundColor: colors.accent.neonGreen },
  connDotOff: { backgroundColor: colors.text.disabled },
  teamBadge: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
  },

  // Score bar
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
  },
  scoreTeam: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
  },
  scoreValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 22,
    letterSpacing: 1,
  },
  scoreSep: {
    ...typography.body,
    color: colors.text.disabled,
  },

  // Status box
  statusBox: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 2,
    padding: 12,
    backgroundColor: colors.background.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statusText: {
    ...typography.small,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Group section
  groupSection: {
    flex: 1,
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 12,
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  selfMarkedBadge: {
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selfMarkedText: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },

  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  memberCardWrapper: {
    width: '33.33%',
    padding: 3,
  },

  // Compact member card
  memberCard: {
    borderRadius: 8,
    backgroundColor: colors.background.panel,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    minHeight: 60,
    gap: 3,
  },
  memberCardMarked: {
    backgroundColor: 'rgba(220, 20, 60, 0.12)',
    borderColor: 'rgba(255, 51, 102, 0.45)',
  },
  memberName: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
  },
  youTag: {
    fontFamily: fonts.ui.regular,
    fontSize: 10,
    color: colors.primary.electricBlue,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  markBadge: {
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  markBadgeText: {
    fontFamily: fonts.display.bold,
    fontSize: 7,
    letterSpacing: 1,
    color: colors.primary.neonRed,
  },

  emptyGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGroupText: {
    ...typography.body,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});
