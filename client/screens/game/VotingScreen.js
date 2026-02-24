import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

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
  const [phase, setPhase] = useState('voting'); // 'voting' | 'waiting' | 'preview'
  const [myVotes, setMyVotes] = useState({});        // { [playerId]: 'phos' | 'skotia' }
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

      socket.on('votingComplete', ({ markResults: results, roundSummary }) => {
        setMarkResults(results || []);
        setPhase('preview');
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
      <TouchableOpacity
        key={member.id}
        style={[
          styles.memberCard,
          isPhosVote && styles.memberCardPhos,
          isSkotiaVote && styles.memberCardSkotia,
        ]}
        onPress={() => toggleVote(member.id)}
        disabled={phase !== 'voting'}
        activeOpacity={0.75}
      >
        <View style={styles.cardLeft}>
          <Text style={[
            styles.memberName,
            isPhosVote && { color: colors.primary.electricBlue },
            isSkotiaVote && { color: colors.primary.neonRed },
          ]}>
            {member.username}
          </Text>
          {member.isMarked && (
            <View style={styles.currentMarkBadge}>
              <Text style={styles.currentMarkText}>MARKED</Text>
            </View>
          )}
        </View>
        <View style={styles.cardRight}>
          {isVoted ? (
            <Text style={[
              styles.voteLabel,
              isPhosVote ? { color: colors.primary.electricBlue } : { color: colors.primary.neonRed },
            ]}>
              {isPhosVote ? 'ΦΩΣ' : 'ΣΚΟΤΊΑ'}
            </Text>
          ) : (
            <Text style={styles.tapHint}>TAP</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Preview ──────────────────────────────────────────────────────────────

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

        {phase === 'preview' ? renderPreview() : (
          <>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                {phase === 'voting'
                  ? 'Tap once for ΦΩΣ (blue), tap again for ΣΚΟΤΊΑ (red).'
                  : 'Votes submitted. Waiting for your group...'}
              </Text>
            </View>

            <View style={styles.cardList}>
              {others.map(renderVoteCard)}
            </View>

            {phase === 'voting' && (
              <View style={styles.footer}>
                <Text style={styles.footerCount}>
                  {votedCount} / {others.length} voted
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
    marginHorizontal: 14,
    marginTop: 10,
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

  // Card list fills remaining vertical space, no scroll
  cardList: {
    flex: 1,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    gap: 8,
  },

  // Vote card — takes equal flex share
  memberCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  memberCardPhos: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderColor: colors.primary.electricBlue,
  },
  memberCardSkotia: {
    backgroundColor: 'rgba(220, 20, 60, 0.1)',
    borderColor: colors.primary.neonRed,
  },
  cardLeft: {
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
  cardRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  voteLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
  },
  tapHint: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.text.disabled,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
