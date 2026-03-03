import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { TASKS, TASK_CATEGORY, MECHANIC } from '../../data/tasks';
import { submitMovementBTask } from '../../utils/api';
import RushResultOverlay from '../tasks/components/RushResultOverlay';
import SusIcon from '../../components/SusIcon';
import TaskSprite from '../../components/TaskSprite';

// Mechanic components (same imports as TaskScreen)
import SlingTask from '../tasks/mechanics/SlingTask';
import CollectTask from '../tasks/mechanics/CollectTask';
import DragPlaceTask from '../tasks/mechanics/DragPlaceTask';
import GuardTask from '../tasks/mechanics/GuardTask';
import RapidTapTask from '../tasks/mechanics/RapidTapTask';
import HoldTask from '../tasks/mechanics/HoldTask';
import TraceTask from '../tasks/mechanics/TraceTask';
import PatienceTask from '../tasks/mechanics/PatienceTask';
import BuildTask from '../tasks/mechanics/BuildTask';
import TriviaTask from '../tasks/mechanics/TriviaTask';
import ScriptureBlankTask from '../tasks/mechanics/ScriptureBlankTask';

const RUSH_RESULT_MS = 350;
const CHALLENGE_TASKS = TASKS.filter((t) => t.category === TASK_CATEGORY.CHALLENGES);

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getMultiplier(streak) {
  if (streak <= 1) return 1.0;
  return Math.min(1.0 + (streak - 1) * 0.25, 2.0);
}

export default function TaskRushScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  roundNumber,
  movementBEndsAt,
  isSus,
  onExitRush,
  onMovementComplete,
}) {
  const accentColor = currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  // Task queue
  const [rushQueue, setRushQueue] = useState(() => shuffled(CHALLENGE_TASKS));
  const [currentIndex, setCurrentIndex] = useState(0);

  // Streak & scoring
  const [streak, setStreak] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);

  // Phase control
  const [phase, setPhase] = useState('playing'); // 'playing' | 'result'
  const [lastResult, setLastResult] = useState(null);

  // Movement B countdown
  const [secondsLeft, setSecondsLeft] = useState(null);

  // Per-task timer
  const taskTimerRef = useRef(null);
  const handledRef = useRef(false);
  const socketRef = useRef(null);

  // Points animation
  const pointsBounce = useRef(new Animated.Value(0)).current;

  // Background flash
  const bgFlashOpacity = useRef(new Animated.Value(0)).current;
  const bgFlashColor   = useRef('#FFFFFF');

  const flashBg = useCallback((color) => {
    bgFlashColor.current = color;
    bgFlashOpacity.setValue(0.28);
    Animated.timing(bgFlashOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [bgFlashOpacity]);

  const currentTask = rushQueue[currentIndex] || null;

  // ── Movement B countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!movementBEndsAt) return;
    const remaining = Math.ceil((movementBEndsAt - Date.now()) / 1000);
    setSecondsLeft(Math.max(0, remaining));

    const id = setInterval(() => {
      const secs = Math.ceil((movementBEndsAt - Date.now()) / 1000);
      const clamped = Math.max(0, secs);
      setSecondsLeft(clamped);
      if (clamped <= 0) {
        clearInterval(id);
        if (onExitRush) onExitRush();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [movementBEndsAt]);

  // ── Socket for exit signals ─────────────────────────────────────────────
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
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'B' && onMovementComplete) onMovementComplete();
      });

      socket.on('movementStart', ({ movement }) => {
        if (movement === 'C' && onMovementComplete) onMovementComplete();
      });

      socket.on('connect_error', (err) =>
        console.warn('[TaskRush] Socket error:', err.message)
      );
    };

    connect().catch(console.error);
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  // ── Per-task timer ──────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(taskTimerRef.current);
    handledRef.current = false;

    if (phase !== 'playing' || !currentTask) return;

    if (currentTask.timeLimit > 0) {
      taskTimerRef.current = setTimeout(() => {
        handleFail();
      }, currentTask.timeLimit * 1000);
    }

    return () => clearTimeout(taskTimerRef.current);
  }, [currentIndex, phase, rushQueue]);

  // ── Advance to next task ────────────────────────────────────────────────
  const advanceToNextTask = useCallback(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= rushQueue.length) {
      // Reshuffle for another pass
      setRushQueue(shuffled(CHALLENGE_TASKS));
      setCurrentIndex(0);
    } else {
      setCurrentIndex(nextIdx);
    }
    setLastResult(null);
    setPhase('playing');
  }, [currentIndex, rushQueue.length]);

  // ── Success handler ─────────────────────────────────────────────────────
  const handleSuccess = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    clearTimeout(taskTimerRef.current);

    const task = rushQueue[currentIndex];
    if (!task) return;

    const newStreak = streak + 1;
    const multiplier = getMultiplier(newStreak);
    const basePoints = task.points.alive;
    const bonusPoints = Math.floor(basePoints * (multiplier - 1.0));
    const totalEarned = basePoints + bonusPoints;

    setStreak(newStreak);
    setSessionPoints((prev) => prev + totalEarned);
    setLastResult({ success: true, basePoints, bonusPoints, streakCount: newStreak });
    setPhase('result');

    // Background flash
    flashBg('success');

    // Animate points badge
    pointsBounce.setValue(1);
    Animated.timing(pointsBounce, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Submit to server (fire-and-forget)
    submitMovementBTask(token, gameId, task.id, bonusPoints).catch(() => {});

    setTimeout(() => advanceToNextTask(), RUSH_RESULT_MS);
  }, [currentIndex, rushQueue, streak, token, gameId, advanceToNextTask]);

  // ── Fail handler ────────────────────────────────────────────────────────
  const handleFail = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    clearTimeout(taskTimerRef.current);

    setLastResult({ success: false, basePoints: 0, bonusPoints: 0, streakCount: streak });
    setStreak(0);
    setPhase('result');

    flashBg('fail');

    setTimeout(() => advanceToNextTask(), RUSH_RESULT_MS);
  }, [streak, advanceToNextTask]);

  // ── Render mechanic ─────────────────────────────────────────────────────
  const renderMechanic = () => {
    if (!currentTask || phase !== 'playing') return null;

    const props = {
      config: currentTask.config,
      onSuccess: handleSuccess,
      onFail: handleFail,
      timeLimit: currentTask.timeLimit,
      taskId: currentTask.id,
    };

    switch (currentTask.mechanic) {
      case MECHANIC.SLING:      return <SlingTask {...props} />;
      case MECHANIC.COLLECT:    return <CollectTask {...props} />;
      case MECHANIC.DRAG_PLACE: return <DragPlaceTask {...props} />;
      case MECHANIC.GUARD:      return <GuardTask {...props} />;
      case MECHANIC.RAPID_TAP:  return <RapidTapTask {...props} />;
      case MECHANIC.HOLD:       return <HoldTask {...props} />;
      case MECHANIC.TRACE:      return <TraceTask {...props} />;
      case MECHANIC.PATIENCE:   return <PatienceTask {...props} />;
      case MECHANIC.BUILD:            return <BuildTask {...props} />;
      case MECHANIC.TRIVIA:           return <TriviaTask {...props} />;
      case MECHANIC.SCRIPTURE_BLANK:  return <ScriptureBlankTask {...props} />;
      default:                        return null;
    }
  };

  // ── HUD helpers ─────────────────────────────────────────────────────────
  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerUrgent = secondsLeft !== null && secondsLeft <= 30;
  const multiplier = getMultiplier(streak + 1); // preview what the NEXT success would earn

  return (
    <View style={styles.container}>
      {/* Background flash overlays */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: successFlashOpacity, backgroundColor: colors.accent.amber }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: failFlashOpacity, backgroundColor: colors.primary.neonRed }]}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* ── Rush HUD ── */}
        <View style={styles.hud}>
          {/* Streak */}
          <View style={styles.hudCell}>
            {streak > 0 ? (
              <>
                <Text style={styles.streakLabel}>STREAK</Text>
                <Text style={styles.streakValue}>x{streak}</Text>
                {streak >= 2 && (
                  <Text style={styles.multiplierLabel}>{getMultiplier(streak)}x</Text>
                )}
              </>
            ) : (
              <Text style={styles.streakEmpty}>NO STREAK</Text>
            )}
          </View>

          {/* Task title + Timer */}
          <View style={styles.hudCenterCell}>
            <View style={styles.hudTaskRow}>
              {currentTask && <TaskSprite taskId={currentTask.id} size={18} color={accentColor} />}
              <Text style={styles.hudTaskTitle} numberOfLines={1}>
                {currentTask ? currentTask.title : 'CHALLENGE RUSH'}
              </Text>
            </View>
            <Text style={[styles.hudTimer, timerUrgent && styles.hudTimerUrgent]}>
              {formatTime(secondsLeft)}
            </Text>
          </View>

          {/* Points + Exit */}
          <View style={styles.hudCell}>
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsLabel}>PTS</Text>
              <Text style={styles.pointsValue}>+{sessionPoints}</Text>
              <Animated.Text
                style={[
                  styles.pointsPopup,
                  {
                    opacity: pointsBounce,
                    transform: [{
                      translateY: pointsBounce.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    }],
                  },
                ]}
              >
                {lastResult?.success ? `+${lastResult.basePoints + lastResult.bonusPoints}` : ''}
              </Animated.Text>
            </View>
            <TouchableOpacity style={styles.exitBtn} onPress={onExitRush} activeOpacity={0.7}>
              <Text style={styles.exitBtnText}>EXIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Sus penalty banner ── */}
        {isSus && (
          <View style={styles.susBanner}>
            <SusIcon size={12} />
            <Text style={styles.susBannerText}>SUS PENALTY — 50% PTS</Text>
          </View>
        )}

        {/* ── Mechanic area ── */}
        <View style={styles.mechanicArea} key={currentIndex}>
          {renderMechanic()}
        </View>

        {/* ── Result overlay ── */}
        {phase === 'result' && lastResult && (
          <RushResultOverlay
            success={lastResult.success}
            basePoints={lastResult.basePoints}
            bonusPoints={lastResult.bonusPoints}
            streakCount={lastResult.streakCount}
          />
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
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  safeArea: {
    flex: 1,
  },

  // ── HUD ──────────────────────────────────────────────────────────────────
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  hudCell: {
    width: 80,
    alignItems: 'center',
    gap: 2,
  },
  hudCenterCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  streakLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.accent.amber,
  },
  streakValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 22,
    color: colors.accent.amber,
    textShadowColor: colors.accent.amber,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  multiplierLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 10,
    color: colors.accent.amber,
    opacity: 0.7,
  },
  streakEmpty: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.text.disabled,
  },
  hudTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: 160,
  },
  hudTaskTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.text.primary,
    flexShrink: 1,
  },
  hudTimer: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    color: colors.text.primary,
  },
  hudTimerUrgent: {
    color: colors.primary.neonRed,
  },
  pointsContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  pointsLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  pointsValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    color: colors.accent.neonGreen,
  },
  pointsPopup: {
    position: 'absolute',
    top: -16,
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.accent.neonGreen,
  },

  // ── Exit button (inline in HUD points cell) ────────────────────────────
  exitBtn: {
    marginTop: 4,
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  exitBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },

  // ── Sus penalty banner ─────────────────────────────────────────────────
  susBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    backgroundColor: colors.primary.neonRed + '20',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.neonRed + '40',
  },
  susBannerText: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1.5,
    color: colors.primary.neonRed,
  },

  // ── Mechanic area ───────────────────────────────────────────────────────
  mechanicArea: {
    flex: 1,
    paddingBottom: 8,
  },
});
