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

// phase: 'voting' | 'waiting' | 'preview'

export default function VotingScreen({
  token,
  gameId,
  groupId,
  currentUserId,
  currentTeam,
  roundNumber,
  groupMembers,
  onMovementComplete,
}) {
  const [phase, setPhase] = useState('voting');
  const [myVotes, setMyVotes] = useState({});       // { [playerId]: 'phos' | 'skotia' }
  const [markResults, setMarkResults] = useState([]); // [{ playerId, username, action }]
  const [submitting, setSubmitting] = useState(false);

  const socketRef = useRef(null);
  const previewTimerRef = useRef(null);

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
        socket.emit('joinRoom', { lobbyId: groupId });
      });

      // All votes tallied — results come back with mark/unmark actions
      socket.on('votingComplete', ({ markResults: results, roundSummary }) => {
        setMarkResults(results || []);
        setPhase('preview');

        // Auto-advance to round summary after 3s preview
        previewTimerRef.current = setTimeout(() => {
          if (onMovementComplete) onMovementComplete(roundSummary || null);
        }, 3000);
      });

      socket.on('connect_error', (err) => console.warn('[Voting] Socket error:', err.message));
    };

    connect().catch(console.error);

    return () => {
      clearTimeout(previewTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, groupId, token]);

  const toggleVote = (playerId) => {
    if (phase !== 'voting') return;
    setMyVotes((prev) => {
      const current = prev[playerId];
      // Cycle: unset → skotia → phos → skotia...
      const next = current === 'skotia' ? 'phos' : 'skotia';
      return { ...prev, [playerId]: next };
    });
  };

  const allVoted = others.length > 0 && others.every((m) => myVotes[m.id] !== undefined);

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

  // ── Render ────────────────────────────────────────────────────────────────

  const renderVoteRow = (member) => {
    const vote = myVotes[member.id];
    const isPhosVote = vote === 'phos';
    const isSkotiaVote = vote === 'skotia';

    return (
      <View key={member.id} style={styles.memberCard}>
        <View style={styles.memberLeft}>
          <Text style={styles.memberName}>{member.username}</Text>
          {member.isMarked && (
            <View style={styles.currentMarkBadge}>
              <Text style={styles.currentMarkText}>MARKED</Text>
            </View>
          )}
        </View>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={[styles.voteBtn, styles.phosBtn, isPhosVote && styles.phosBtnActive]}
            onPress={() => { setMyVotes((prev) => ({ ...prev, [member.id]: 'phos' })); }}
            disabled={phase !== 'voting'}
            activeOpacity={0.8}
          >
            <Text style={[styles.voteBtnText, isPhosVote && styles.phosBtnTextActive]}>ΦΩΣ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.voteBtn, styles.skotiaBtn, isSkotiaVote && styles.skotiaBtnActive]}
            onPress={() => { setMyVotes((prev) => ({ ...prev, [member.id]: 'skotia' })); }}
            disabled={phase !== 'voting'}
            activeOpacity={0.8}
          >
            <Text style={[styles.voteBtnText, isSkotiaVote && styles.skotiaBtnTextActive]}>ΣΚΟΤΊΑ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPreview = () => (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>ROUND RESULTS</Text>
      <Text style={styles.previewHint}>This round in your group:</Text>
      {markResults.length === 0 ? (
        <Text style={styles.previewNoChange}>No changes this round.</Text>
      ) : (
        <View style={styles.previewList}>
          {markResults.map((r) => (
            <View key={r.playerId} style={styles.previewRow}>
              <Text style={styles.previewName}>{r.username}</Text>
              <Text style={[
                styles.previewAction,
                r.action === 'mark'
                  ? { color: colors.primary.neonRed }
                  : { color: colors.accent.neonGreen },
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>MOVEMENT C — VOTING</Text>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        {phase === 'preview' ? (
          renderPreview()
        ) : (
          <>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                {phase === 'voting'
                  ? 'Vote on each group member. Majority vote marks or unmarks them.'
                  : 'Votes submitted. Waiting for the rest of your group...'}
              </Text>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {others.map(renderVoteRow)}
            </ScrollView>

            {phase === 'voting' && (
              <View style={styles.footer}>
                <Text style={styles.footerCount}>
                  {Object.keys(myVotes).length} / {others.length} voted
                </Text>
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
    paddingVertical: 12,
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
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
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
  list: {
    flex: 1,
    marginTop: 12,
    marginHorizontal: 16,
  },
  listContent: {
    gap: 10,
    paddingBottom: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberLeft: {
    flex: 1,
    gap: 4,
  },
  memberName: {
    ...typography.body,
    color: colors.text.primary,
  },
  currentMarkBadge: {
    alignSelf: 'flex-start',
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
  voteButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 62,
    alignItems: 'center',
  },
  phosBtn: {
    borderColor: 'rgba(0, 212, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  phosBtnActive: {
    borderColor: colors.primary.electricBlue,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
  skotiaBtn: {
    borderColor: 'rgba(255, 51, 102, 0.3)',
    backgroundColor: 'transparent',
  },
  skotiaBtnActive: {
    borderColor: colors.primary.neonRed,
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
  },
  voteBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.text.disabled,
  },
  phosBtnTextActive: {
    color: colors.primary.electricBlue,
  },
  skotiaBtnTextActive: {
    color: colors.primary.neonRed,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    gap: 12,
  },
  footerCount: {
    ...typography.small,
    color: colors.text.tertiary,
    flex: 1,
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
    gap: 20,
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
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.void,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
