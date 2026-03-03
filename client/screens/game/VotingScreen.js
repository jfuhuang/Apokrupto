import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { MOVEMENT_NAMES } from '../../constants/movementNames';
import logger from '../../utils/logger';
import SusIcon from '../../components/SusIcon';
import { useGame } from '../../context/GameContext';

export default function VotingScreen({
  token,
  gameId,
  lobbyId,
  groupId,
  currentUserId,
  currentTeam,
  roundNumber,
  groupMembers,
  onMovementComplete,
  onMovementReady,
  onRoundSummary,
  onGameOver,
}) {
  const [phase, setPhase] = useState('voting'); // 'voting' | 'waiting' | 'preview'
  const [myVotes, setMyVotes] = useState({});        // { [playerId]: 'phos' | 'skotia' }
  const [susResults, setSusResults] = useState([]); // [{ playerId, username, action }]
  const [submitting, setSubmitting] = useState(false);
  const [votingSecondsLeft, setVotingSecondsLeft] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { setSocketConnected } = useGame();

  const socketRef = useRef(null);
  const safetyExitedRef = useRef(false);
  const votingTimerRef = useRef(null);

  const others = (groupMembers || []).filter((m) => String(m.id) !== String(currentUserId));

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
        logger.socket('Voting', 'connected');
        socket.emit('joinRoom', { lobbyId: groupId }); // group room for votingComplete
        if (lobbyId) socket.emit('joinRoom', { lobbyId }); // lobby room for movementComplete + votingReady
      });

      // Server sends authoritative voting end time when GM activates C
      socket.on('votingReady', ({ votingEndsAt }) => {
        clearInterval(votingTimerRef.current);
        const tick = () => {
          const secsLeft = Math.max(0, Math.round((votingEndsAt - Date.now()) / 1000));
          setVotingSecondsLeft(secsLeft);
          if (secsLeft <= 0) clearInterval(votingTimerRef.current);
        };
        tick();
        votingTimerRef.current = setInterval(tick, 1000);
      });

      // Per-group sus results — show preview; Challenges Stage (B) follows next
      socket.on('votingComplete', ({ susResults: results }) => {
        logger.game('Voting', 'votingComplete received', results ?? []);
        setSusResults(results || []);
        setPhase('preview');
        clearInterval(votingTimerRef.current);
        // Navigation to Challenges Stage is driven by movementStart{B} below.
      });

      // Voting timer expired (or GM force-advanced C) — stay on screen until B starts
      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'C') {
          clearInterval(votingTimerRef.current);
          setPhase((prev) => (prev === 'voting' || prev === 'waiting' ? 'waitingForSummary' : prev));
        }
      });

      // Challenges Stage (B) is starting — navigate away from Voting screen
      // In the A→C→B order, B always follows C, so this drives the transition.
      socket.on('movementStart', ({ movement, movementBEndsAt }) => {
        logger.game('Voting', `movementStart → ${movement}`);
        if (movement === 'B') {
          if (onMovementReady) onMovementReady('B', null, null, null, { movementBEndsAt });
        }
      });

      // Round summary is emitted after B completes (handled by RoundHubScreen at that point).
      // VotingScreen should not be mounted then, but guard just in case.
      socket.on('roundSummary', (summary) => {
        if (onRoundSummary) onRoundSummary(summary);
      });

      // Game ended directly (supermajority or edge case) — forward to App.js
      socket.on('gameOver', (result) => {
        logger.game('Voting', `gameOver — winner: ${result?.winner}`, result);
        if (onGameOver) onGameOver(result);
      });

      socket.on('connect_error', (err) => logger.error('Voting', `socket error: ${err.message}`));
    };

    connect().catch((err) => logger.error('Voting', 'socket connect failed', err));

    return () => {
      setSocketConnected(false);
      clearInterval(votingTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, groupId, lobbyId, token]);

  // ── 3s safety-net poll: detect movement advance or game over ──────────────
  useEffect(() => {
    if (!token || !gameId) return;
    safetyExitedRef.current = false;
    const poll = async () => {
      if (safetyExitedRef.current) return;
      try {
        const baseUrl = await getApiUrl();
        const res = await fetch(`${baseUrl}/api/games/${gameId}/state`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.gameStatus === 'completed') {
          if (safetyExitedRef.current) return;
          safetyExitedRef.current = true;
          if (onGameOver) onGameOver({ winner: data.winner, condition: data.winCondition, phosPoints: data.teamPoints?.phos ?? 0, skotiaPoints: data.teamPoints?.skotia ?? 0 });
        } else if (data.currentMovement && data.currentMovement !== 'C') {
          if (safetyExitedRef.current) return;
          safetyExitedRef.current = true;
          if (data.currentMovement === 'B' && onMovementReady) {
            onMovementReady('B', null, null, null, { movementBEndsAt: data.movementBEndsAt });
          }
        }
      } catch { /* non-fatal */ }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [token, gameId]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const baseUrl = await getApiUrl();
      const res = await fetch(`${baseUrl}/api/games/${gameId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      // Re-sync voting timer if the votingReady socket was missed (using deliberationEndsAt
      // as a proxy isn't available here, so we just confirm we're still in movement C)
      if (data.currentMovement !== 'C' && data.gameStatus !== 'completed') {
        // state has moved on — let safety poll handle the transition
      }
    } catch (err) {
      logger.error('Voting', 'pull-to-refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Tap cycles: unset → phos (blue) → skotia (red) → phos → ...
  const toggleVote = (playerId) => {
    if (phase !== 'voting') return;
    setMyVotes((prev) => {
      const current = prev[playerId];
      if (current === undefined || current === 'skotia') return { ...prev, [playerId]: 'phos' };
      return { ...prev, [playerId]: 'skotia' };
    });
  };

  const allVoted = others.length > 0 && others.every((m) => myVotes[m.id] !== undefined);
  const votedCount = others.filter((m) => myVotes[m.id] !== undefined).length;

  const handleSubmit = async () => {
    if (!allVoted || submitting) return;
    setSubmitting(true);
    setPhase('waiting');
    try {
      const baseUrl = await getApiUrl();
      await fetch(`${baseUrl}/api/games/${gameId}/movement-c/vote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes: myVotes }),
      });
    } catch (err) {
      logger.error('Voting', 'vote submit failed', err);
      setPhase('voting');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Member card ──────────────────────────────────────────────────────────

  const renderVoteCard = (member) => {
    const vote = myVotes[member.id];
    const isPhosVote = vote === 'phos';
    const isSkotiaVote = vote === 'skotia';
    const isVoted = vote !== undefined;

    return (
      <View key={member.id} style={styles.cardWrapper}>
        <TouchableOpacity
          style={[
            styles.memberCard,
            isPhosVote && styles.memberCardPhos,
            isSkotiaVote && styles.memberCardSkotia,
          ]}
          onPress={() => toggleVote(member.id)}
          disabled={phase !== 'voting'}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.memberName,
              isPhosVote && { color: colors.primary.electricBlue },
              isSkotiaVote && { color: colors.primary.neonRed },
            ]}
            numberOfLines={1}
          >
            {member.username}
          </Text>
          {member.isSus && (
            <View style={styles.currentSusBadge}>
              <SusIcon size={12} />
              <Text style={styles.currentSusText}>SUS</Text>
            </View>
          )}
          {!isVoted && (
            <Text style={styles.tapHint}>tap to vote</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ── Preview ──────────────────────────────────────────────────────────────

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>ROUND RESULTS</Text>
      {phase === 'waitingForSummary' ? (
        <Text style={styles.previewHint}>Voting has ended. Waiting for Game Master...</Text>
      ) : (
        <Text style={styles.previewHint}>This round in your group:</Text>
      )}
      {susResults.length === 0 ? (
        <Text style={styles.previewNoChange}>No changes this round.</Text>
      ) : (
        <View style={styles.previewList}>
          {susResults.map((r) => (
            <View key={r.userId} style={styles.previewRow}>
              <Text style={styles.previewName}>{r.username}</Text>
              <View style={styles.previewActionRow}>
                {r.action === 'sus' && <SusIcon size={12} />}
                <Text style={[
                  styles.previewAction,
                  r.action === 'sus' ? { color: colors.primary.neonRed } : { color: colors.accent.neonGreen },
                ]}>
                  {r.action === 'sus' ? 'SUS' : 'CLEARED'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.previewCountdown}>Challenges Stage starting soon...</Text>
    </View>
  );

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>{MOVEMENT_NAMES.C.toUpperCase()}</Text>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        {(phase === 'preview' || phase === 'waitingForSummary') ? renderPreview() : (
          <>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                {phase === 'voting'
                  ? 'Tap once for ΦΩΣ (blue), tap again for ΣΚΟΤΊΑ (red).'
                  : 'Votes submitted. Waiting for your group...'}
              </Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.cardGrid}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary.electricBlue}
                  colors={[colors.primary.electricBlue]}
                />
              }
            >
              {others.map(renderVoteCard)}
            </ScrollView>

            {phase === 'voting' && (
              <View style={styles.footer}>
                <View style={styles.footerLeft}>
                  <Text style={styles.footerCount}>
                    {votedCount} / {others.length} voted
                  </Text>
                  {votingSecondsLeft !== null && (
                    <Text style={styles.footerTimer}>
                      {votingSecondsLeft}s left
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.submitBtn, !allVoted && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={!allVoted || submitting}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.submitBtnText, !allVoted && styles.submitBtnTextDisabled]}>
                    SUBMIT VOTES
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },
  headerRound: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  instructionBox: {
    marginHorizontal: 18,
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.background.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  instructionText: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // 2-column wrapping grid like LobbyScreen player cards
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  cardWrapper: {
    width: '50%',
    padding: 4,
  },

  // Vote card — compact, centered content
  memberCard: {
    backgroundColor: colors.background.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 60,
    gap: 4,
  },
  memberCardPhos: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderColor: colors.primary.electricBlue,
  },
  memberCardSkotia: {
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
    borderColor: colors.primary.neonRed,
  },
  memberName: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 13,
    color: colors.text.primary,
    textAlign: 'center',
  },
  currentSusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentSusText: {
    fontFamily: fonts.display.bold,
    fontSize: 7,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },
  tapHint: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.text.disabled,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: 12,
  },
  footerLeft: {
    flex: 1,
    gap: 2,
  },
  footerCount: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  footerTimer: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.primary.neonRed,
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary.neonRed,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.shadow.neonRed,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: colors.background.panel,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.background.space,
  },
  submitBtnTextDisabled: {
    color: colors.text.disabled,
  },

  // Preview
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  previewTitle: {
    ...typography.screenTitle,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  previewHint: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  previewNoChange: {
    ...typography.body,
    color: colors.text.muted,
  },
  previewList: {
    width: '100%',
    gap: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.void,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewName: {
    ...typography.body,
    color: colors.text.primary,
  },
  previewActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewAction: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
  },
  previewCountdown: {
    ...typography.small,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});
