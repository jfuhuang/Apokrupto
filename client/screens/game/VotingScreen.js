import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

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
  onRoundSummary,
  onGameOver,
}) {
  const [phase, setPhase] = useState('voting'); // 'voting' | 'waiting' | 'preview'
  const [myVotes, setMyVotes] = useState({});        // { [playerId]: 'phos' | 'skotia' }
  const [markResults, setMarkResults] = useState([]); // [{ playerId, username, action }]
  const [submitting, setSubmitting] = useState(false);
  const [votingSecondsLeft, setVotingSecondsLeft] = useState(null);

  const socketRef = useRef(null);
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

      // Per-group mark results — show preview and wait for roundSummary to navigate
      socket.on('votingComplete', ({ markResults: results }) => {
        setMarkResults(results || []);
        setPhase('preview');
        // Navigation is now driven by roundSummary, NOT movementComplete
      });

      // Voting timer expired (or GM force-advanced C) — stay on screen, wait for roundSummary
      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'C') {
          clearInterval(votingTimerRef.current);
          // Do NOT navigate away yet — roundSummary (emitted on the next GM advance)
          // will drive the transition. Navigating here causes a socket reconnection gap
          // that loses the roundSummary event.
          setPhase((prev) => (prev === 'voting' || prev === 'waiting' ? 'waitingForSummary' : prev));
        }
      });

      // GM resolved votes and summarized the round — navigate to round summary screen
      socket.on('roundSummary', (summary) => {
        if (onRoundSummary) onRoundSummary(summary);
      });

      // Game ended directly (supermajority or edge case) — forward to App.js
      socket.on('gameOver', (result) => {
        if (onGameOver) onGameOver(result);
      });

      socket.on('connect_error', (err) => console.warn('[Voting] Socket error:', err.message));
    };

    connect().catch(console.error);

    return () => {
      clearInterval(votingTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, groupId, lobbyId, token]);

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
      console.warn('[Voting] Submit error:', err.message);
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
          {member.isMarked && (
            <View style={styles.currentMarkBadge}>
              <Text style={styles.currentMarkText}>MARKED</Text>
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
      {markResults.length === 0 ? (
        <Text style={styles.previewNoChange}>No changes this round.</Text>
      ) : (
        <View style={styles.previewList}>
          {markResults.map((r) => (
            <View key={r.userId} style={styles.previewRow}>
              <Text style={styles.previewName}>{r.username}</Text>
              <Text style={[
                styles.previewAction,
                r.action === 'mark' ? { color: colors.primary.neonRed } : { color: colors.accent.neonGreen },
              ]}>
                {r.action === 'mark' ? 'MARKED' : 'UNMARKED'}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.previewCountdown}>Continuing shortly...</Text>
    </View>
  );

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>MOVEMENT C — VOTING</Text>
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
  currentMarkBadge: {
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.35)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentMarkText: {
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
