import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

const TURN_TIME_LIMIT = 30;

// phase: 'waiting_turn' | 'my_turn' | 'waiting_others' | 'deliberation'

export default function MovementAScreen({
  token,
  gameId,
  lobbyId,
  groupId,
  currentUserId,
  currentTeam,
  roundNumber,
  groupMembers,
  onMovementComplete,
}) {
  const [phase, setPhase] = useState('waiting_turn');
  const [prompt, setPrompt] = useState('');
  const [myWord, setMyWord] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState(null);
  const [currentTurnPlayerName, setCurrentTurnPlayerName] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(TURN_TIME_LIMIT);
  const [allWords, setAllWords] = useState([]); // [{ userId, username, word }]
  const [submittedWords, setSubmittedWords] = useState([]); // live word reveal list
  const [deliberationSecondsLeft, setDeliberationSecondsLeft] = useState(120);
  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  const socketRef = useRef(null);
  const turnTimerRef = useRef(null);
  const deliberationTimerRef = useRef(null);
  const prevTurnPlayerIdRef = useRef(null);

  // Fetch prompt on mount (server returns team-specific prompt via JWT)
  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const baseUrl = await getApiUrl();
        const res = await fetch(`${baseUrl}/api/games/${gameId}/movement-a/prompt`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.prompt) setPrompt(data.prompt);
      } catch (err) {
        console.warn('[MovementA] Could not fetch prompt:', err.message);
        setPrompt('Think of a word that fits your theme.');
      }
    };
    if (gameId) fetchPrompt();
  }, [gameId, token]);

  // Socket connection
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
        // Join group room for turn-level events (turnStart, deliberationStart)
        socket.emit('joinRoom', { lobbyId: groupId });
        // Join lobby room to receive GM advance signals (movementStart)
        if (lobbyId) socket.emit('joinRoom', { lobbyId });
      });

      // Server announces whose turn it is
      socket.on('turnStart', ({ currentPlayerId, completedCount: cc, timeLimit, lastWord }) => {
        clearInterval(turnTimerRef.current);

        // The player whose turn just ended has submitted
        if (prevTurnPlayerIdRef.current) {
          setSubmittedIds((prev) => new Set([...prev, String(prevTurnPlayerIdRef.current)]));
        }
        prevTurnPlayerIdRef.current = currentPlayerId;

        // Append the just-submitted word to the live reveal list
        if (lastWord) {
          setSubmittedWords((prev) => {
            // Avoid duplicates (e.g. if we already added our own word on submit)
            if (prev.some((w) => String(w.userId) === String(lastWord.userId))) return prev;
            return [...prev, lastWord];
          });
        }

        setCurrentTurnPlayerId(currentPlayerId);
        setCompletedCount(cc);

        const name =
          groupMembers?.find((m) => String(m.id) === String(currentPlayerId))?.username ||
          'Someone';
        setCurrentTurnPlayerName(name);

        const limit = timeLimit || TURN_TIME_LIMIT;
        setTurnSecondsLeft(limit);

        if (String(currentPlayerId) === String(currentUserId)) {
          setPhase('my_turn');
        } else {
          setPhase('waiting_turn');
        }

        // Countdown for current turn
        let secs = limit;
        turnTimerRef.current = setInterval(() => {
          secs -= 1;
          setTurnSecondsLeft(secs);
          if (secs <= 0) {
            clearInterval(turnTimerRef.current);
            // If it's still our turn and we haven't submitted, auto-submit blank
            if (String(currentPlayerId) === String(currentUserId)) {
              handleSubmit('');
            }
          }
        }, 1000);
      });

      // All players submitted — show words for deliberation
      socket.on('deliberationStart', ({ words, lastWord }) => {
        clearInterval(turnTimerRef.current);
        // Mark everyone as submitted
        setSubmittedIds(new Set((groupMembers || []).map((m) => String(m.id))));
        // Append final word to live reveal list
        if (lastWord) {
          setSubmittedWords((prev) => {
            if (prev.some((w) => String(w.userId) === String(lastWord.userId))) return prev;
            return [...prev, lastWord];
          });
        }
        // words is now [{ userId, username, word }]
        setAllWords(words || []);
        setPhase('deliberation');

        let secs = 120;
        setDeliberationSecondsLeft(secs);
        deliberationTimerRef.current = setInterval(() => {
          secs -= 1;
          setDeliberationSecondsLeft(secs);
          if (secs <= 0) clearInterval(deliberationTimerRef.current);
        }, 1000);
      });

      // GM advanced to next movement — server emits movementStart to the lobby room
      socket.on('movementStart', ({ movement }) => {
        if (movement !== 'A') {
          clearInterval(deliberationTimerRef.current);
          if (onMovementComplete) onMovementComplete();
        }
      });
      socket.on('movementAComplete', () => {
        clearInterval(deliberationTimerRef.current);
        if (onMovementComplete) onMovementComplete();
      });

      socket.on('connect_error', (err) => console.warn('[MovementA] Socket error:', err.message));
    };

    connect().catch(console.error);

    return () => {
      clearInterval(turnTimerRef.current);
      clearInterval(deliberationTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, groupId, lobbyId, token, currentUserId]);

  const handleSubmit = async (word) => {
    const finalWord = (word ?? wordInput).trim();
    if (submitting) return;
    setSubmitting(true);
    clearInterval(turnTimerRef.current);
    setMyWord(finalWord);
    setSubmittedIds((prev) => new Set([...prev, String(currentUserId)]));
    // Add our own word to the live reveal list
    const myUsername = groupMembers?.find((m) => String(m.id) === String(currentUserId))?.username || 'You';
    setSubmittedWords((prev) => {
      if (prev.some((w) => String(w.userId) === String(currentUserId))) return prev;
      return [...prev, { userId: String(currentUserId), username: myUsername, word: finalWord }];
    });
    setPhase('waiting_others');

    try {
      const baseUrl = await getApiUrl();
      await fetch(`${baseUrl}/api/games/${gameId}/movement-a/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: finalWord }),
      });
    } catch (err) {
      console.warn('[MovementA] Submit error:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const total = groupMembers?.length || 5;

  // ── Group Roster (always visible) ─────────────────────────────────────────

  const renderGroupRoster = () => (
    <View style={styles.roster}>
      {(groupMembers || []).map((member) => {
        const memberId = String(member.id);
        const isMe = memberId === String(currentUserId);
        const hasSubmitted = submittedIds.has(memberId);
        const isCurrentTurn =
          memberId === String(currentTurnPlayerId) &&
          phase !== 'deliberation';

        return (
          <View
            key={memberId}
            style={[
              styles.rosterItem,
              isCurrentTurn && styles.rosterItemActive,
              hasSubmitted && styles.rosterItemDone,
            ]}
          >
            <View
              style={[
                styles.rosterDot,
                isCurrentTurn && styles.rosterDotActive,
                hasSubmitted && styles.rosterDotDone,
              ]}
            />
            <Text
              style={[styles.rosterName, isMe && styles.rosterNameMe]}
              numberOfLines={1}
            >
              {member.username}
              {isMe ? ' (you)' : ''}
            </Text>
            {hasSubmitted && (
              <Text style={styles.rosterCheck}>✓</Text>
            )}
            {isCurrentTurn && !hasSubmitted && (
              <Text style={styles.rosterChoosingDot}>•••</Text>
            )}
          </View>
        );
      })}
    </View>
  );

  // ── Submitted Words So Far (shown during turns) ────────────────────────

  const renderSubmittedSoFar = () => {
    if (submittedWords.length === 0) return null;
    return (
      <View style={styles.submittedSection}>
        <Text style={styles.submittedLabel}>SUBMITTED SO FAR</Text>
        {submittedWords.map((entry, i) => {
          const isMe = String(entry.userId) === String(currentUserId);
          return (
            <View key={i} style={styles.submittedRow}>
              <Text style={[styles.submittedName, isMe && styles.submittedNameMe]} numberOfLines={1}>
                {isMe ? 'You' : entry.username}
              </Text>
              <Text style={styles.submittedWord} numberOfLines={1}>{entry.word}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  // ── Phase Content ──────────────────────────────────────────────────────────

  const renderPhase = () => {
    if (phase === 'waiting_turn') {
      return (
        <View style={styles.phaseContainer}>
          <View style={styles.promptSection}>
            <Text style={styles.promptLabel}>YOUR PROMPT</Text>
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>{prompt || '...'}</Text>
            </View>
            <Text style={styles.promptHint}>Think of your word while you wait.</Text>
          </View>

          <View style={styles.turnIndicator}>
            <View style={styles.turnIndicatorLeft}>
              <Text style={styles.turnIndicatorLabel}>CURRENT TURN</Text>
              <Text style={styles.turnIndicatorName}>{currentTurnPlayerName}</Text>
            </View>
            <View style={styles.turnTimerBadge}>
              <Text style={styles.turnTimer}>{turnSecondsLeft}s</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount} / {total} submitted</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completedCount / total) * 100}%` }]} />
            </View>
          </View>

          {renderSubmittedSoFar()}
        </View>
      );
    }

    if (phase === 'my_turn') {
      return (
        <KeyboardAvoidingView
          style={styles.phaseContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.myTurnHeader}>
            <Text style={styles.yourTurnLabel}>YOUR TURN</Text>
            <View style={[styles.timerCircle, turnSecondsLeft <= 10 && styles.timerCircleUrgent]}>
              <Text style={[styles.timerValue, turnSecondsLeft <= 10 && styles.timerValueUrgent]}>
                {turnSecondsLeft}
              </Text>
            </View>
          </View>

          <View style={styles.promptSection}>
            <Text style={styles.promptLabel}>YOUR PROMPT</Text>
            <View style={[styles.promptBox, styles.promptBoxActive]}>
              <Text style={styles.promptText}>{prompt || '...'}</Text>
            </View>
          </View>

          {renderSubmittedSoFar()}

          <TextInput
            style={styles.wordInput}
            placeholder="Type one word..."
            placeholderTextColor={colors.text.placeholder}
            value={wordInput}
            onChangeText={setWordInput}
            autoFocus
            maxLength={30}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => handleSubmit()}
          />

          <TouchableOpacity
            style={[styles.submitBtn, !wordInput.trim() && styles.submitBtnDisabled]}
            onPress={() => handleSubmit()}
            disabled={!wordInput.trim() || submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitBtnText}>SUBMIT</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      );
    }

    if (phase === 'waiting_others') {
      return (
        <View style={styles.phaseContainer}>
          <View style={styles.myWordSection}>
            <Text style={styles.myWordLabel}>YOU CHOSE</Text>
            <Text style={styles.myWordDisplay}>{myWord || '—'}</Text>
          </View>

          <Text style={styles.waitingLabel}>Waiting for the group...</Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>{completedCount} / {total} submitted</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completedCount / total) * 100}%` }]} />
            </View>
          </View>

          {renderSubmittedSoFar()}
        </View>
      );
    }

    if (phase === 'deliberation') {
      return (
        <View style={styles.phaseContainer}>
          <Text style={styles.deliberationTitle}>DISCUSS</Text>
          <Text style={styles.deliberationHint}>
            One of these words may not belong. Talk it over.
          </Text>

          <View style={styles.wordList}>
            {allWords.map((entry, i) => {
              const isMe = String(entry.userId) === String(currentUserId);
              return (
                <View key={i} style={[styles.wordItem, isMe && styles.wordItemMe]}>
                  <Text style={styles.wordItemAuthor}>
                    {isMe ? 'You' : entry.username}
                  </Text>
                  <Text style={styles.wordItemText}>{entry.word}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.deliberationTimerRow}>
            <Text style={styles.deliberationTimerLabel}>Time remaining</Text>
            <Text style={[
              styles.deliberationTimerValue,
              deliberationSecondsLeft <= 30 && { color: colors.accent.amber },
            ]}>
              {Math.floor(deliberationSecondsLeft / 60)}:{String(deliberationSecondsLeft % 60).padStart(2, '0')}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>MOVEMENT A — DEDUCTION</Text>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderGroupRoster()}
          <View style={styles.divider} />
          {renderPhase()}
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
    color: colors.primary.electricBlue,
  },
  headerRound: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },

  // ── Group Roster ──────────────────────────────────────────────────────────
  roster: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rosterItemActive: {
    borderColor: colors.primary.electricBlue,
    backgroundColor: 'rgba(0, 212, 255, 0.06)',
  },
  rosterItemDone: {
    borderColor: colors.border.subtle,
    opacity: 0.6,
  },
  rosterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.frost,
  },
  rosterDotActive: {
    backgroundColor: colors.primary.electricBlue,
  },
  rosterDotDone: {
    backgroundColor: colors.accent.neonGreen,
  },
  rosterName: {
    flex: 1,
    fontFamily: fonts.ui.regular,
    fontSize: 15,
    color: colors.text.secondary,
  },
  rosterNameMe: {
    color: colors.text.primary,
    fontFamily: fonts.ui.semiBold,
  },
  rosterCheck: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.accent.neonGreen,
  },
  rosterChoosingDot: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.primary.electricBlue,
    letterSpacing: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },

  // ── Phase container ───────────────────────────────────────────────────────
  phaseContainer: {
    padding: 20,
    gap: 20,
  },

  // Prompt section (shared between waiting_turn and my_turn)
  promptSection: {
    gap: 10,
    alignItems: 'center',
  },
  promptLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  promptBox: {
    width: '100%',
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 20,
    alignItems: 'center',
  },
  promptBoxActive: {
    borderColor: colors.primary.electricBlue,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
  },
  promptText: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  promptHint: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Turn indicator (waiting_turn)
  turnIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  turnIndicatorLeft: {
    flex: 1,
    gap: 2,
  },
  turnIndicatorLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  turnIndicatorName: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.text.primary,
  },
  turnTimerBadge: {
    backgroundColor: 'rgba(255, 166, 61, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  turnTimer: {
    fontFamily: fonts.accent.bold,
    fontSize: 22,
    color: colors.accent.amber,
  },

  // Progress bar (waiting_turn and waiting_others)
  progressRow: {
    gap: 8,
  },
  progressText: {
    ...typography.small,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background.frost,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 2,
  },

  // My turn
  myTurnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yourTurnLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 4,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  timerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
  },
  timerCircleUrgent: {
    borderColor: colors.primary.neonRed,
    backgroundColor: 'rgba(255, 51, 102, 0.08)',
  },
  timerValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 24,
    color: colors.primary.electricBlue,
    letterSpacing: 1,
  },
  timerValueUrgent: {
    color: colors.primary.neonRed,
  },
  wordInput: {
    width: '100%',
    backgroundColor: colors.input.background,
    borderWidth: 1,
    borderColor: colors.input.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  submitBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: colors.background.panel,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 14,
    letterSpacing: 3,
    color: colors.background.space,
  },

  // Waiting others
  myWordSection: {
    alignItems: 'center',
    gap: 6,
  },
  myWordLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  myWordDisplay: {
    fontFamily: fonts.accent.bold,
    fontSize: 42,
    color: colors.primary.electricBlue,
    letterSpacing: 3,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  waitingLabel: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // Submitted words so far (live reveal during turns)
  submittedSection: {
    gap: 8,
  },
  submittedLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  submittedName: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    width: 80,
  },
  submittedNameMe: {
    color: colors.primary.electricBlue,
    fontFamily: fonts.ui.semiBold,
  },
  submittedWord: {
    flex: 1,
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    color: colors.text.primary,
    letterSpacing: 1,
  },

  // Deliberation
  deliberationTitle: {
    ...typography.screenTitle,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    textAlign: 'center',
  },
  deliberationHint: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  wordList: {
    gap: 10,
  },
  wordItem: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  wordItemMe: {
    borderColor: 'rgba(0, 212, 255, 0.25)',
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  wordItemAuthor: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  wordItemText: {
    fontFamily: fonts.accent.bold,
    fontSize: 22,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  deliberationTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deliberationTimerLabel: {
    ...typography.small,
    color: colors.text.tertiary,
  },
  deliberationTimerValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 1,
  },
});
