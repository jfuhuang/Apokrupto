import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { TASKS } from '../../data/tasks';
import { submitMovementBTask } from '../../utils/api';
import TaskScreen from '../tasks/TaskScreen';

// Only show individual (free_roam) tasks for now
const INDIVIDUAL_TASKS = TASKS.filter((t) => t.taskType === 'free_roam');

const DIFFICULTY_COLOR = {
  easy:   colors.accent.neonGreen,
  medium: colors.accent.amber,
  hard:   colors.primary.neonRed,
};

export default function MovementBScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  roundNumber,
  movementBEndsAt: initialEndsAt,
  onMovementComplete,
}) {
  // Which task the player is currently playing (null = on selector)
  const [activeTask, setActiveTask] = useState(null);
  // Set of task IDs completed this session
  const [completedTasks, setCompletedTasks] = useState(new Set());
  // Points earned this movement
  const [sessionPoints, setSessionPoints] = useState(0);
  // Countdown
  const [secondsLeft, setSecondsLeft] = useState(null);
  const endsAtRef = useRef(null);

  const socketRef = useRef(null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  // Start the countdown animation + interval from an epoch-ms end time
  const startCountdown = useCallback((endsAt) => {
    if (!endsAt) return;
    endsAtRef.current = endsAt;
    const totalMs = endsAt - Date.now();
    if (totalMs <= 0) return;

    setSecondsLeft(Math.ceil(totalMs / 1000));

    // Animate the timer bar from current position to 0
    timerBarAnim.setValue(totalMs / (5 * 60 * 1000)); // proportion of 5 min
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: totalMs,
      useNativeDriver: false,
    }).start();
  }, [timerBarAnim]);

  // Countdown tick
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = endsAtRef.current ? Math.ceil((endsAtRef.current - Date.now()) / 1000) : 0;
      setSecondsLeft(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft !== null]);

  // Initialize countdown from prop (passed from App.js / RoundHubScreen)
  useEffect(() => {
    if (initialEndsAt && !endsAtRef.current) {
      startCountdown(initialEndsAt);
    }
  }, [initialEndsAt]);

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
        socket.emit('joinRoom', { lobbyId });
      });

      // Initial timer info from movementStart or reconnect
      socket.on('movementStart', ({ movement, movementBEndsAt }) => {
        if (movement === 'B' && movementBEndsAt) {
          startCountdown(movementBEndsAt);
        }
        // GM advanced past B → exit
        if (movement === 'C') {
          if (onMovementComplete) onMovementComplete();
        }
      });

      // Reconnect: server sends timer info
      socket.on('movementBInfo', ({ movementBEndsAt }) => {
        if (movementBEndsAt) startCountdown(movementBEndsAt);
      });

      // B completed (timer expired or GM force)
      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'B') {
          if (onMovementComplete) onMovementComplete();
        }
      });

      socket.on('connect_error', (err) =>
        console.warn('[MovementB] Socket error:', err.message)
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

  // Task completed successfully
  const handleTaskComplete = useCallback(async (taskId) => {
    setCompletedTasks((prev) => new Set([...prev, taskId]));
    setActiveTask(null);

    // Submit to server for real point award
    try {
      const { ok, data } = await submitMovementBTask(token, gameId, taskId);
      if (ok) {
        setSessionPoints((prev) => prev + data.pointsEarned);
      }
    } catch (err) {
      console.warn('[MovementB] submit error:', err.message);
    }
  }, [token, gameId]);

  // Task cancelled/failed — return to selector
  const handleTaskCancel = useCallback(() => {
    setActiveTask(null);
  }, []);

  // ── Render active task ──────────────────────────────────────────────────
  if (activeTask) {
    return (
      <TaskScreen
        task={activeTask}
        role={currentTeam}
        token={token}
        lobbyId={lobbyId}
        onComplete={() => handleTaskComplete(activeTask.id)}
        onCancel={handleTaskCancel}
      />
    );
  }

  // ── Render task selector ────────────────────────────────────────────────
  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerUrgent = secondsLeft !== null && secondsLeft <= 30;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>MOVEMENT B</Text>
            <Text style={styles.headerSub}>TASKS</Text>
          </View>
          <View style={styles.headerCenter}>
            <View style={styles.timerBarTrack}>
              <Animated.View
                style={[
                  styles.timerBarFill,
                  {
                    width: timerBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: timerUrgent
                      ? colors.primary.neonRed
                      : colors.primary.electricBlue,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.timerText,
                timerUrgent && { color: colors.primary.neonRed },
              ]}
            >
              {formatTime(secondsLeft)}
            </Text>
          </View>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        {/* Points earned banner */}
        <View style={styles.pointsBanner}>
          <Text style={[styles.pointsLabel, { color: teamColor }]}>
            {currentTeam === 'skotia' ? 'ΣΚΟΤΊΑ' : 'ΦΩΣ'} POINTS EARNED
          </Text>
          <Text style={[styles.pointsValue, { color: teamColor }]}>
            +{sessionPoints}
          </Text>
        </View>

        {/* Task list */}
        <ScrollView
          style={styles.taskList}
          contentContainerStyle={styles.taskListContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>INDIVIDUAL TASKS</Text>
          {INDIVIDUAL_TASKS.map((task) => {
            const done = completedTasks.has(task.id);
            const diffColor = DIFFICULTY_COLOR[task.difficulty] || colors.text.tertiary;
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskCard, done && styles.taskCardDone]}
                onPress={() => !done && setActiveTask(task)}
                activeOpacity={done ? 1 : 0.7}
                disabled={done}
              >
                <View style={styles.taskCardTop}>
                  <Text
                    style={[styles.taskTitle, done && styles.taskTitleDone]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                  <View style={styles.taskMeta}>
                    <Text style={[styles.taskDiff, { color: diffColor }]}>
                      {task.difficulty.toUpperCase()}
                    </Text>
                    <Text style={styles.taskPts}>
                      {done ? '✓' : `+${task.points.alive}`}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.taskSynopsis, done && styles.taskSynopsisDone]}
                  numberOfLines={2}
                >
                  {task.synopsis}
                </Text>
                <Text style={styles.taskRef}>{task.reference}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Cooperative placeholder */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            COOPERATIVE TASKS
          </Text>
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>Coming soon...</Text>
          </View>

          <View style={{ height: 32 }} />
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

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.primary.electricBlue,
  },
  headerSub: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.text.tertiary,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.background.frost,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.text.primary,
    minWidth: 42,
    textAlign: 'right',
  },
  headerRound: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },

  // ── Points banner ─────────────────────────────────────────────────────
  pointsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  pointsLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 2,
  },
  pointsValue: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    letterSpacing: 1,
  },

  // ── Task list ─────────────────────────────────────────────────────────
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  sectionLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.text.tertiary,
    marginBottom: 10,
  },

  // ── Task card ─────────────────────────────────────────────────────────
  taskCard: {
    backgroundColor: colors.background.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  taskCardDone: {
    opacity: 0.45,
    borderColor: colors.accent.neonGreen,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.neonGreen,
  },
  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  taskTitleDone: {
    color: colors.accent.neonGreen,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  taskDiff: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1,
  },
  taskPts: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.accent.amber,
  },
  taskSynopsis: {
    ...typography.small,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  taskSynopsisDone: {
    color: colors.text.disabled,
  },
  taskRef: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 10,
    color: colors.accent.amber,
    letterSpacing: 0.5,
  },

  // ── Cooperative placeholder ───────────────────────────────────────────
  comingSoon: {
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  comingSoonText: {
    ...typography.small,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
});
