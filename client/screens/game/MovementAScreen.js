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
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { io } from 'socket.io-client';
import logger from '../../utils/logger';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { MOVEMENT_NAMES } from '../../constants/movementNames';
import SketchCanvas from '../../components/SketchCanvas';
import SketchThumbnail from '../../components/SketchThumbnail';
import { useGame } from '../../context/GameContext';

const TURN_TIME_LIMIT = 30;

// ── Sketch carousel component used in deliberation phase ─────────────────────
function SketchCarousel({ sketches, currentUserId, slideSize, containerWidth }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const pageWidth = containerWidth || slideSize + 16;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (!sketches || sketches.length === 0) return null;

  const renderItem = ({ item: entry }) => {
    const isMe = String(entry.userId) === String(currentUserId);
    return (
      <View style={[sketchCarouselStyles.page, { width: pageWidth }]}>
        <View
          style={[
            sketchCarouselStyles.slide,
            { width: slideSize, height: slideSize },
            isMe && sketchCarouselStyles.slideMine,
          ]}
        >
          <Text style={isMe ? sketchCarouselStyles.authorMe : sketchCarouselStyles.author}>
            {isMe ? 'You' : entry.username}
          </Text>
          <View style={sketchCarouselStyles.thumbnailWrapper}>
            <SketchThumbnail
              sketchData={entry.sketchData}
              size={slideSize - 48}
              strokeColor={colors.text.primary}
              strokeWidth={2.5}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={sketchCarouselStyles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={sketches}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={pageWidth}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Dot indicators */}
      {sketches.length > 1 && (
        <View style={sketchCarouselStyles.dots}>
          {sketches.map((_, i) => (
            <View
              key={i}
              style={[
                sketchCarouselStyles.dot,
                i === activeIndex && sketchCarouselStyles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const sketchCarouselStyles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 10,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    backgroundColor: colors.background.void,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },
  slideMine: {
    borderColor: colors.primary.electricBlue,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  author: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  authorMe: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary.electricBlue,
    textTransform: 'uppercase',
  },
  thumbnailWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.default,
  },
  dotActive: {
    backgroundColor: colors.primary.electricBlue,
    width: 16,
    borderRadius: 3,
  },
});

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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isPortrait = windowHeight > windowWidth;
  const { setSocketConnected } = useGame();

  const [phase, setPhase] = useState('waiting_turn');
  const [prompt, setPrompt] = useState('');
  const [promptMode, setPromptMode] = useState('word'); // 'word' | 'sketch'
  const [myWord, setMyWord] = useState('');
  const [wordInput, setWordInput] = useState('');
  const [sketchData, setSketchData] = useState(null); // current drawing (sketch mode)
  const [allSketches, setAllSketches] = useState([]); // deliberation gallery (sketch mode)
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState(null);
  const [currentTurnPlayerName, setCurrentTurnPlayerName] = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState(TURN_TIME_LIMIT);
  const [allWords, setAllWords] = useState([]); // [{ userId, username, word }]
  const [submittedWords, setSubmittedWords] = useState([]); // live word reveal list (word mode)
  const [deliberationSecondsLeft, setDeliberationSecondsLeft] = useState(null); // null = waiting for server time
  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState(new Set());
  const [turnOrder, setTurnOrder] = useState(null); // [userId, ...] from server
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef(null);
  const turnTimerRef = useRef(null);
  const deliberationTimerRef = useRef(null);
  const prevTurnPlayerIdRef = useRef(null);
  const wordInputRef = useRef(''); // mirrors wordInput state to avoid stale closure in timer
  const submittedRef = useRef(false); // true after this player submits; prevents double auto-submit
  const sketchCanvasRef = useRef(null); // ref to SketchCanvas for getSketchData() on auto-submit
  const promptModeRef = useRef(promptMode); // mirror for stale closure in timer
  const sketchDataRef = useRef(null); // mirror of sketchData for stale closure fallback

  // Keep refs in sync with state so interval/timer callbacks always have the latest value
  useEffect(() => { wordInputRef.current = wordInput; }, [wordInput]);
  useEffect(() => { promptModeRef.current = promptMode; }, [promptMode]);
  useEffect(() => { sketchDataRef.current = sketchData; }, [sketchData]);

  // Unlock orientation while the player is actively drawing so they can freely
  // rotate to portrait or landscape. Lock back to landscape on any other phase.
  useEffect(() => {
    const isDrawing = phase === 'my_turn' && promptMode === 'sketch';
    if (isDrawing) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
  }, [phase, promptMode]);

  // Fetch prompt (server returns team-specific prompt via JWT).
  // Used on mount (with retries) and on pull-to-refresh (single attempt).
  const fetchPrompt = async ({ retries = 0 } = {}) => {
    const attempt = async (n = 1) => {
      try {
        const baseUrl = await getApiUrl();
        const res = await fetch(`${baseUrl}/api/games/${gameId}/movement-a/prompt`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let errBody = null;
          try { errBody = await res.json(); } catch (_) {}
          const errMsg = errBody?.error ?? '(no body)';
          if (n <= retries) {
            logger.poll('MovementA', `prompt fetch attempt ${n} failed — HTTP ${res.status}: ${errMsg}. Retrying...`);
            await new Promise((r) => setTimeout(r, 1500));
            return attempt(n + 1);
          }
          logger.error('MovementA', `prompt fetch failed after ${n} attempt(s) — HTTP ${res.status}: ${errMsg}`);
          return;
        }
        const data = await res.json();
        if (data.prompt) {
          setPrompt(data.prompt);
          if (data.promptMode) setPromptMode(data.promptMode);
        }
      } catch (err) {
        if (n <= retries) {
          await new Promise((r) => setTimeout(r, 1500));
          return attempt(n + 1);
        }
        logger.error('MovementA', 'could not fetch prompt', err);
      }
    };
    await attempt();
  };

  // Fetch on mount with retries — turn state may not be initialised yet
  useEffect(() => {
    if (gameId) fetchPrompt({ retries: 2 });
  }, [gameId, token]);

  const handleRefreshPrompt = async () => {
    setRefreshing(true);
    await fetchPrompt();
    setRefreshing(false);
  };

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
        logger.socket('MovementA', 'connected');
        // Join group room for turn-level events (turnStart, deliberationStart)
        socket.emit('joinRoom', { lobbyId: groupId });
        // Join lobby room to receive GM advance signals (movementStart)
        if (lobbyId) socket.emit('joinRoom', { lobbyId });
      });

      // Server announces whose turn it is
      socket.on('turnStart', ({ currentPlayerId, completedCount: cc, timeLimit, lastWord, turnOrder: order }) => {
        logger.game('MovementA', `turn ${cc + 1} start — currentPlayer: ${currentPlayerId}`);
        if (order) setTurnOrder(order);
        clearInterval(turnTimerRef.current);
        submittedRef.current = false; // reset for this new turn

        // The player whose turn just ended has submitted (fallback for reconnect)
        if (prevTurnPlayerIdRef.current) {
          setSubmittedIds((prev) => new Set([...prev, String(prevTurnPlayerIdRef.current)]));
        }
        prevTurnPlayerIdRef.current = currentPlayerId;

        // Append the just-submitted word to the live reveal list (fallback for reconnect;
        // normally wordSubmitted handles this before turnStart fires)
        if (lastWord) {
          setSubmittedWords((prev) => {
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

        // Countdown for current turn.
        // After a player submits early the timer keeps running (showing "next turn in Xs").
        // submittedRef prevents auto-submit from firing again.
        let secs = limit;
        turnTimerRef.current = setInterval(() => {
          secs -= 1;
          setTurnSecondsLeft(secs);
          if (secs <= 0) {
            clearInterval(turnTimerRef.current);
            // Auto-submit only if it's still our turn and we haven't submitted yet
            if (String(currentPlayerId) === String(currentUserId) && !submittedRef.current) {
              if (promptModeRef.current === 'sketch') {
                handleSubmit(); // sketch data retrieved from canvas ref inside handleSubmit
              } else {
                handleSubmit(wordInputRef.current.trim() || '—');
              }
            }
          }
        }, 1000);
      });

      // Server notifies the group immediately when a player submits.
      // Word mode: reveals the word; sketch mode: only reveals that the player submitted.
      socket.on('wordSubmitted', ({ userId: submittedUserId, username: submittedUsername, word: submittedWord }) => {
        setSubmittedIds((prev) => new Set([...prev, String(submittedUserId)]));
        // Only add to live word list in word mode (sketch submissions have no word to reveal)
        if (submittedWord !== undefined) {
          setSubmittedWords((prev) => {
            if (prev.some((w) => String(w.userId) === String(submittedUserId))) return prev;
            return [...prev, { userId: String(submittedUserId), username: submittedUsername, word: submittedWord }];
          });
        }
        // Mark as "done" in prevTurnPlayerIdRef so turnStart's fallback doesn't double-add
        prevTurnPlayerIdRef.current = String(submittedUserId);
      });

      // All players submitted — show content for deliberation.
      // Timer comes separately via deliberationReady (game-level, not per-group).
      socket.on('deliberationStart', (data) => {
        logger.game('MovementA', 'deliberation started');
        clearInterval(turnTimerRef.current);
        setSubmittedIds(new Set((groupMembers || []).map((m) => String(m.id))));

        if (data.promptMode === 'sketch') {
          setAllSketches(data.sketches || []);
        } else {
          // Word mode
          if (data.lastWord) {
            setSubmittedWords((prev) => {
              if (prev.some((w) => String(w.userId) === String(data.lastWord.userId))) return prev;
              return [...prev, data.lastWord];
            });
          }
          setAllWords(data.words || []);
        }

        setPhase('deliberation');
        // deliberationSecondsLeft stays null until deliberationReady arrives
      });

      // Server broadcasts the authoritative end time once ALL groups are done.
      // Drives a timer computed from the absolute timestamp so all clients are in sync.
      socket.on('deliberationReady', ({ deliberationEndsAt }) => {
        clearInterval(deliberationTimerRef.current);
        const tick = () => {
          const secsLeft = Math.max(0, Math.round((deliberationEndsAt - Date.now()) / 1000));
          setDeliberationSecondsLeft(secsLeft);
          if (secsLeft <= 0) clearInterval(deliberationTimerRef.current);
        };
        tick(); // immediate update
        deliberationTimerRef.current = setInterval(tick, 1000);
      });

      // Deliberation timer fired — server marks A complete, clients return to RoundHub
      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'A') {
          clearInterval(turnTimerRef.current);
          clearInterval(deliberationTimerRef.current);
          if (onMovementComplete) onMovementComplete();
        }
      });

      // Fallback: GM force-advanced past A without waiting for deliberation timer
      socket.on('movementStart', ({ movement }) => {
        if (movement !== 'A') {
          logger.game('MovementA', `movementStart → ${movement}, exiting`);
          clearInterval(turnTimerRef.current);
          clearInterval(deliberationTimerRef.current);
          if (onMovementComplete) onMovementComplete();
        }
      });
      socket.on('connect_error', (err) => logger.error('MovementA', `socket error: ${err.message}`));
    };

    connect().catch((err) => logger.error('MovementA', 'socket connect failed', err));

    return () => {
      clearInterval(turnTimerRef.current);
      clearInterval(deliberationTimerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, groupId, lobbyId, token, currentUserId]);

  // ── 3s safety-net poll: exit if GM advanced past Movement A while disconnected ──
  const safetyExitedRef = useRef(false);
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
        if (data.currentMovement && data.currentMovement !== 'A') {
          if (safetyExitedRef.current) return;
          safetyExitedRef.current = true;
          clearInterval(turnTimerRef.current);
          clearInterval(deliberationTimerRef.current);
          if (onMovementComplete) onMovementComplete();
        }
      } catch { /* non-fatal */ }
    };
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [token, gameId]);

  const handleSubmit = async (word) => {
    if (submitting) return;

    const isSketch = promptModeRef.current === 'sketch';

    let finalWord = null;
    if (!isSketch) {
      finalWord = (word ?? wordInput).trim();
    }

    // In sketch mode, get data from canvas ref (includes in-progress stroke)
    // or fall back to state/ref, or an empty sketch if nothing drawn
    const finalSketchData = isSketch
      ? (sketchCanvasRef.current?.getSketchData?.() ?? sketchDataRef.current ?? { strokes: [] })
      : null;

    setSubmitting(true);
    submittedRef.current = true; // prevent auto-submit from triggering again
    // Do NOT clear the turn timer — let it keep counting so waiting_others shows "next turn in Xs"

    if (!isSketch) {
      setMyWord(finalWord);
    }
    setSubmittedIds((prev) => new Set([...prev, String(currentUserId)]));

    if (!isSketch) {
      // Add our own word to the live reveal list
      const myUsername = groupMembers?.find((m) => String(m.id) === String(currentUserId))?.username || 'You';
      setSubmittedWords((prev) => {
        if (prev.some((w) => String(w.userId) === String(currentUserId))) return prev;
        return [...prev, { userId: String(currentUserId), username: myUsername, word: finalWord }];
      });
    }

    setPhase('waiting_others');

    try {
      const baseUrl = await getApiUrl();
      const endpoint = isSketch ? 'submit/sketch' : 'submit/word';
      const body = isSketch ? { sketchData: finalSketchData } : { word: finalWord };
      await fetch(`${baseUrl}/api/games/${gameId}/movement-a/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.error('MovementA', 'word submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const total = groupMembers?.length || 5;

  // ── Group Roster (always visible) ─────────────────────────────────────────

  const renderGroupRoster = () => {
    // Sort members by turn order if available
    const sortedMembers = turnOrder
      ? [...(groupMembers || [])].sort((a, b) => {
          const idxA = turnOrder.indexOf(String(a.id));
          const idxB = turnOrder.indexOf(String(b.id));
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        })
      : groupMembers || [];

    return (
    <View style={styles.roster}>
      {sortedMembers.map((member) => {
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
  };

  // ── Submitted So Far (shown during turns) ──────────────────────────────
  // Word mode: shows names + words; sketch mode: shows names with checkmarks only.

  const renderSubmittedSoFar = () => {
    if (promptMode === 'sketch') {
      // Show submitted players by name (no sketch previews during turn phase)
      const submittedMembers = (groupMembers || []).filter((m) => submittedIds.has(String(m.id)));
      if (submittedMembers.length === 0) return null;
      return (
        <View style={styles.submittedSection}>
          <Text style={styles.submittedLabel}>SUBMITTED SO FAR</Text>
          {submittedMembers.map((member) => {
            const isMe = String(member.id) === String(currentUserId);
            return (
              <View key={member.id} style={styles.submittedRow}>
                <Text style={[styles.submittedName, isMe && styles.submittedNameMe]} numberOfLines={1}>
                  {isMe ? 'You' : member.username}
                </Text>
                <Text style={styles.rosterCheck}>✓</Text>
              </View>
            );
          })}
        </View>
      );
    }

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
          <Text style={styles.waitingForLabel}>
            Waiting for {currentTurnPlayerName}...
          </Text>

          <View style={styles.promptSection}>
            <Text style={styles.promptLabel}>
              {promptMode === 'sketch' ? 'DRAW' : 'YOUR PROMPT'}
            </Text>
            <View style={styles.promptBox}>
              <Text style={styles.promptText}>{prompt || '...'}</Text>
            </View>
            <Text style={styles.promptHint}>
              {promptMode === 'sketch'
                ? 'Think about what you\'ll draw while you wait.'
                : 'Think of your word while you wait.'}
            </Text>
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
      const myTurnHeader = (
        <View style={styles.myTurnHeader}>
          <Text style={styles.yourTurnLabel}>YOUR TURN</Text>
          <View style={[styles.timerCircle, turnSecondsLeft <= 10 && styles.timerCircleUrgent]}>
            <Text style={[styles.timerValue, turnSecondsLeft <= 10 && styles.timerValueUrgent]}>
              {turnSecondsLeft}
            </Text>
          </View>
        </View>
      );

      const promptDisplay = (
        <View style={styles.promptSection}>
          <Text style={styles.promptLabel}>
            {promptMode === 'sketch' ? 'DRAW' : 'YOUR PROMPT'}
          </Text>
          <View style={[styles.promptBox, styles.promptBoxActive]}>
            <Text style={styles.promptText}>{prompt || '...'}</Text>
          </View>
        </View>
      );

      if (promptMode === 'sketch') {
        // Sketch my_turn is rendered in a separate flex layout (see main return below)
        return null;
      }

      return (
        <KeyboardAvoidingView
          style={styles.phaseContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {myTurnHeader}
          {promptDisplay}

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
          {promptMode === 'sketch' ? (
            <View style={styles.myWordSection}>
              <Text style={styles.myWordLabel}>SKETCH SUBMITTED</Text>
              <Text style={styles.waitingLabel}>Your drawing has been recorded.</Text>
            </View>
          ) : (
            <View style={styles.myWordSection}>
              <Text style={styles.myWordLabel}>YOU CHOSE</Text>
              <Text style={styles.myWordDisplay}>{myWord || '—'}</Text>
            </View>
          )}

          <Text style={styles.waitingLabel}>
            {turnSecondsLeft > 0
              ? `Next turn in ${turnSecondsLeft}s`
              : 'Starting next turn...'}
          </Text>

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
      const timerRow = (
        <View style={styles.deliberationTimerRow}>
          <Text style={styles.deliberationTimerLabel}>Time remaining</Text>
          {deliberationSecondsLeft === null ? (
            <Text style={[styles.deliberationTimerValue, { color: colors.text.muted }]}>—:——</Text>
          ) : (
            <Text style={[
              styles.deliberationTimerValue,
              deliberationSecondsLeft <= 30 && { color: colors.accent.amber },
            ]}>
              {Math.floor(deliberationSecondsLeft / 60)}:{String(deliberationSecondsLeft % 60).padStart(2, '0')}
            </Text>
          )}
        </View>
      );

      if (promptMode === 'sketch') {
        const slideSize = Math.min(windowWidth - 80, 320); // one sketch per page, fill available width
        return (
          <View style={styles.phaseContainer}>
            <Text style={styles.deliberationTitle}>DISCUSS</Text>
            <Text style={styles.deliberationHint}>
              One of these drawings may not belong. Talk it over.
            </Text>

            <SketchCarousel
              sketches={allSketches}
              currentUserId={currentUserId}
              slideSize={slideSize}
              containerWidth={windowWidth - 40}
            />

            {timerRow}
          </View>
        );
      }

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

          {timerRow}
        </View>
      );
    }

    return null;
  };

  // ── Sketch drawing mode — fixed flex layout, no ScrollView ────────────────
  // Prevents scroll/draw conflict by keeping the canvas outside a ScrollView.
  if (phase === 'my_turn' && promptMode === 'sketch') {
    const hasStrokes = sketchData?.strokes?.length > 0;
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Text style={styles.headerLabel}>{MOVEMENT_NAMES.A.toUpperCase()}</Text>
            <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
          </View>

          <View style={styles.sketchTurnLayout}>
            {/* Portrait: stack YOUR TURN + timer on one row, prompt on next row.
                Landscape: keep everything on a single row. */}
            {isPortrait ? (
              <View style={styles.sketchTopBarPortrait}>
                <View style={styles.sketchTopBarRow}>
                  <Text style={styles.yourTurnLabel}>YOUR TURN</Text>
                  <View style={[styles.sketchTimerBadge, turnSecondsLeft <= 10 && styles.sketchTimerBadgeUrgent]}>
                    <Text style={[styles.sketchTimerText, turnSecondsLeft <= 10 && styles.sketchTimerTextUrgent]}>
                      {turnSecondsLeft}s
                    </Text>
                  </View>
                </View>
                <Text style={styles.sketchPromptInlinePortrait} numberOfLines={2}>{prompt || '...'}</Text>
              </View>
            ) : (
              <View style={styles.sketchTopBar}>
                <Text style={styles.yourTurnLabel}>YOUR TURN</Text>
                <Text style={styles.sketchPromptInline} numberOfLines={1}>{prompt || '...'}</Text>
                <View style={[styles.sketchTimerBadge, turnSecondsLeft <= 10 && styles.sketchTimerBadgeUrgent]}>
                  <Text style={[styles.sketchTimerText, turnSecondsLeft <= 10 && styles.sketchTimerTextUrgent]}>
                    {turnSecondsLeft}s
                  </Text>
                </View>
              </View>
            )}

            {/* Canvas fills remaining space */}
            <SketchCanvas
              ref={sketchCanvasRef}
              onSketchChange={setSketchData}
              style={{ flex: 1 }}
            />

            {/* Compact submit button */}
            <TouchableOpacity
              style={[styles.sketchSubmitBtn, !hasStrokes && styles.submitBtnDisabled]}
              onPress={() => handleSubmit()}
              disabled={!hasStrokes || submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>SUBMIT SKETCH</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Normal scrollable layout (all other phases) ─────────────────────────────
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>{MOVEMENT_NAMES.A.toUpperCase()}</Text>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefreshPrompt}
              tintColor={colors.primary.electricBlue}
              colors={[colors.primary.electricBlue]}
            />
          }
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

  // ── Sketch turn (non-scrollable flex layout) ────────────────────────────
  sketchTurnLayout: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  sketchTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Portrait-mode header: two rows to keep the canvas tall
  sketchTopBarPortrait: {
    gap: 4,
  },
  sketchTopBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sketchPromptInline: {
    flex: 1,
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  sketchPromptInlinePortrait: {
    fontFamily: fonts.accent.bold,
    fontSize: 15,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  sketchTimerBadge: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sketchTimerBadgeUrgent: {
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
  },
  sketchTimerText: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.primary.electricBlue,
    letterSpacing: 1,
  },
  sketchTimerTextUrgent: {
    color: colors.primary.neonRed,
  },
  sketchSubmitBtn: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
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
  waitingForLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 1,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
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
