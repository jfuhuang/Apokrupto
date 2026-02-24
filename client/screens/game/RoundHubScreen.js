import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  teamPoints,
  movementBMode,
  onStartTask,
  onMovementReady,
  onGameStateUpdate,
  onGameOver,
  onLobbyGone,
}) {
  const [statusMessage, setStatusMessage] = useState('Waiting for Game Master...');
  const [socketConnected, setSocketConnected] = useState(false);
  const [liveGroupMembers, setLiveGroupMembers] = useState(currentGroupMembers || []);
  const [liveTeamPoints, setLiveTeamPoints] = useState(teamPoints || { phos: 0, skotia: 0 });
  const [activeMovement, setActiveMovement] = useState(null);

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

      // Server sends full game state on join or update
      socket.on('gameStateUpdate', (state) => {
        if (!state) return;
        if (state.teamPoints) setLiveTeamPoints(state.teamPoints);
        if (state.groupMembers) setLiveGroupMembers(state.groupMembers);
        if (onGameStateUpdate) onGameStateUpdate(state);
      });

      // GM has advanced to the next movement
      socket.on('movementStart', ({ movement, groupId, groupMembers }) => {
        setActiveMovement(movement);
        setStatusMessage(`Movement ${movement} — ${MOVEMENT_LABELS[movement]} beginning...`);
        if (groupMembers) setLiveGroupMembers(groupMembers);
        if (onMovementReady) onMovementReady(movement, groupId, groupMembers);
      });

      // Movement B task assignment
      socket.on('taskAssigned', (task) => {
        if (movementBMode && onStartTask) onStartTask(task);
      });

      // GM announcement broadcast
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

    connect().catch(console.error);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [lobbyId, token]);

  const teamColor = currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

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
            {MOVEMENT_SEQUENCE.map((m) => (
              <View
                key={m}
                style={[
                  styles.movementPip,
                  activeMovement === m && styles.movementPipActive,
                ]}
              >
                <Text style={[
                  styles.movementPipLabel,
                  activeMovement === m && { color: colors.primary.electricBlue },
                ]}>
                  {m}
                </Text>
              </View>
            ))}
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
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Group members */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR GROUP</Text>
        </View>
        <ScrollView
          style={styles.groupList}
          contentContainerStyle={styles.groupListContent}
          showsVerticalScrollIndicator={false}
        >
          {liveGroupMembers.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.username}</Text>
                {member.isYou && <Text style={styles.youTag}>you</Text>}
              </View>
              {member.isMarked && (
                <View style={styles.markBadge}>
                  <Text style={styles.markBadgeText}>MARKED</Text>
                </View>
              )}
            </View>
          ))}
          {liveGroupMembers.length === 0 && (
            <Text style={styles.emptyGroup}>Group assignment pending...</Text>
          )}
        </ScrollView>

        {isMarked && (
          <View style={styles.selfMarkedBanner}>
            <Text style={styles.selfMarkedText}>YOU ARE MARKED</Text>
          </View>
        )}

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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 22,
    letterSpacing: 1,
  },
  movementIndicator: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  movementPip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.panel,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 8,
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
  scoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  scoreTeam: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
  },
  scoreValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 24,
    letterSpacing: 1,
  },
  scoreSep: {
    ...typography.body,
    color: colors.text.disabled,
  },
  statusBox: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statusText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  groupList: {
    flex: 1,
    marginHorizontal: 16,
  },
  groupListContent: {
    gap: 8,
    paddingBottom: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    ...typography.body,
    color: colors.text.primary,
  },
  youTag: {
    ...typography.tiny,
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
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  markBadgeText: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },
  selfMarkedBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 51, 102, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.4)',
    alignItems: 'center',
  },
  selfMarkedText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 3,
    color: colors.primary.neonRed,
  },
  emptyGroup: {
    ...typography.body,
    color: colors.text.disabled,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
