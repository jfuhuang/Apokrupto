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
import { TASKS, TASK_CATEGORY } from '../../data/tasks';
import { submitMovementBTask } from '../../utils/api';
import TaskScreen from '../tasks/TaskScreen';
import TaskSprite from '../../components/TaskSprite';

const DIFFICULTY_COLOR = {
  easy:   colors.accent.neonGreen,
  medium: colors.accent.amber,
  hard:   colors.primary.neonRed,
};

// Category tab definitions
const CATEGORIES = [
  {
    key: TASK_CATEGORY.SCRIPTURE,
    label: 'SCRIPTURE',
    icon: '✝️',
    color: colors.accent.ultraviolet,
    description: 'Verse recall',
  },
  {
    key: TASK_CATEGORY.TRIVIA,
    label: 'TRIVIA',
    icon: '❓',
    color: colors.accent.amber,
    description: 'Bible knowledge',
  },
  {
    key: TASK_CATEGORY.CHALLENGES,
    label: 'CHALLENGES',
    icon: '⚡',
    color: colors.primary.electricBlue,
    description: 'Skill-based',
  },
  {
    key: TASK_CATEGORY.COOPERATIVE,
    label: 'COOP',
    icon: '🤝',
    color: colors.accent.neonGreen,
    description: 'Group tasks',
  },
];

export default function MovementBScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  roundNumber,
  movementBEndsAt: initialEndsAt,
  onMovementComplete,
}) {
  const [activeTask, setActiveTask] = useState(null);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [sessionPoints, setSessionPoints] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(TASK_CATEGORY.CHALLENGES);

  const endsAtRef = useRef(null);
  const socketRef = useRef(null);
  const timerBarAnim = useRef(new Animated.Value(1)).current;

  const startCountdown = useCallback((endsAt) => {
    if (!endsAt) return;
    endsAtRef.current = endsAt;
    const totalMs = endsAt - Date.now();
    if (totalMs <= 0) return;
    setSecondsLeft(Math.ceil(totalMs / 1000));
    timerBarAnim.setValue(totalMs / (5 * 60 * 1000));
    Animated.timing(timerBarAnim, {
      toValue: 0,
      duration: totalMs,
      useNativeDriver: false,
    }).start();
  }, [timerBarAnim]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = endsAtRef.current ? Math.ceil((endsAtRef.current - Date.now()) / 1000) : 0;
      setSecondsLeft(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft !== null]);

  useEffect(() => {
    if (initialEndsAt && !endsAtRef.current) {
      startCountdown(initialEndsAt);
    }
  }, [initialEndsAt]);

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

      socket.on('movementStart', ({ movement, movementBEndsAt }) => {
        if (movement === 'B' && movementBEndsAt) {
          startCountdown(movementBEndsAt);
        }
        if (movement === 'C') {
          if (onMovementComplete) onMovementComplete();
        }
      });

      socket.on('movementBInfo', ({ movementBEndsAt }) => {
        if (movementBEndsAt) startCountdown(movementBEndsAt);
      });

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

  const handleTaskComplete = useCallback(async (taskId) => {
    setCompletedTasks((prev) => new Set([...prev, taskId]));
    setActiveTask(null);
    try {
      const { ok, data } = await submitMovementBTask(token, gameId, taskId);
      if (ok) {
        setSessionPoints((prev) => prev + data.pointsEarned);
      }
    } catch (err) {
      console.warn('[MovementB] submit error:', err.message);
    }
  }, [token, gameId]);

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

  // ── Helpers ─────────────────────────────────────────────────────────────
  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerUrgent = secondsLeft !== null && secondsLeft <= 30;

  const activeCat = CATEGORIES.find((c) => c.key === selectedCategory);
  const visibleTasks = TASKS.filter((t) => t.category === selectedCategory);

  // ── Render task selector ────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        {/* ── Header ── */}
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
            <Text style={[styles.timerText, timerUrgent && { color: colors.primary.neonRed }]}>
              {formatTime(secondsLeft)}
            </Text>
          </View>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        {/* ── Points banner ── */}
        <View style={[styles.pointsBanner, { borderBottomColor: teamColor + '40' }]}>
          <Text style={[styles.pointsLabel, { color: teamColor }]}>
            {currentTeam === 'skotia' ? 'ΣΚΟΤΊΑ' : 'ΦΩΣ'} POINTS EARNED
          </Text>
          <Text style={[styles.pointsValue, { color: teamColor }]}>
            +{sessionPoints}
          </Text>
        </View>

        {/* ── Category tabs ── */}
        <View style={styles.tabRow}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            const tasksDone = TASKS.filter(
              (t) => t.category === cat.key && completedTasks.has(t.id)
            ).length;
            const tasksTotal = TASKS.filter((t) => t.category === cat.key).length;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.tab,
                  isSelected && {
                    borderColor: cat.color,
                    backgroundColor: cat.color + '18',
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.tabIcon}>{cat.icon}</Text>
                <Text style={[styles.tabLabel, isSelected && { color: cat.color }]}>
                  {cat.label}
                </Text>
                {tasksDone > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: cat.color }]}>
                    <Text style={styles.tabBadgeText}>{tasksDone}/{tasksTotal}</Text>
                  </View>
                )}
                {isSelected && (
                  <View style={[styles.tabUnderline, { backgroundColor: cat.color }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Category description strip ── */}
        {activeCat && (
          <View style={[styles.catStrip, { borderLeftColor: activeCat.color }]}>
            <Text style={[styles.catStripIcon]}>{activeCat.icon}</Text>
            <View>
              <Text style={[styles.catStripTitle, { color: activeCat.color }]}>
                {activeCat.label}
              </Text>
              <Text style={styles.catStripDesc}>{activeCat.description}</Text>
            </View>

            {/* Cooperative coming soon badge */}
            {selectedCategory === TASK_CATEGORY.COOPERATIVE && (
              <View style={styles.coopBadge}>
                <Text style={styles.coopBadgeText}>GROUP</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Task grid ── */}
        <ScrollView
          style={styles.taskList}
          contentContainerStyle={styles.taskListContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleTasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tasks in this category.</Text>
            </View>
          )}

          {visibleTasks.map((task) => {
            const done = completedTasks.has(task.id);
            const diffColor = DIFFICULTY_COLOR[task.difficulty] || colors.text.tertiary;
            const catDef = CATEGORIES.find((c) => c.key === task.category);
            const accentColor = catDef ? catDef.color : colors.primary.electricBlue;
            const isCoopStub = task.category === TASK_CATEGORY.COOPERATIVE;

            return (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskCard,
                  done && styles.taskCardDone,
                  isCoopStub && styles.taskCardCoop,
                  { borderLeftColor: done ? colors.accent.neonGreen : accentColor },
                ]}
                onPress={() => !done && !isCoopStub && setActiveTask(task)}
                activeOpacity={done || isCoopStub ? 1 : 0.75}
                disabled={done || isCoopStub}
              >
                {/* Sprite column */}
                <View style={[styles.spriteCol, { backgroundColor: accentColor + '22' }]}>
                  <TaskSprite taskId={task.id} size={28} color={accentColor} />
                  {done && <Text style={styles.spriteDone}>✓</Text>}
                </View>

                {/* Info column */}
                <View style={styles.infoCol}>
                  <View style={styles.infoTop}>
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
                      <Text style={[styles.taskPts, done && { color: colors.accent.neonGreen }]}>
                        {done ? 'DONE' : `+${task.points.alive}`}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.taskSynopsis, done && styles.taskSynopsisDone]}
                    numberOfLines={2}>
                    {isCoopStub
                      ? task.synopsis + ' (Requires your full group)'
                      : task.synopsis}
                  </Text>
                  <Text style={styles.taskRef}>{task.reference}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

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

  // ── Category tabs ─────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
    gap: 2,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 7,
    letterSpacing: 1,
    color: colors.text.tertiary,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tabBadgeText: {
    fontFamily: fonts.accent.bold,
    fontSize: 7,
    color: colors.background.space,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 1,
  },

  // ── Category description strip ────────────────────────────────────────
  catStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderLeftWidth: 3,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.background.void,
    borderRadius: 6,
    gap: 10,
  },
  catStripIcon: {
    fontSize: 22,
  },
  catStripTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
  },
  catStripDesc: {
    ...typography.small,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  coopBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.accent.neonGreen + '30',
    borderWidth: 1,
    borderColor: colors.accent.neonGreen,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coopBadgeText: {
    fontFamily: fonts.display.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.accent.neonGreen,
  },

  // ── Task list ─────────────────────────────────────────────────────────
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  // ── Task card ─────────────────────────────────────────────────────────
  taskCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderLeftWidth: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  taskCardDone: {
    opacity: 0.5,
    borderLeftColor: colors.accent.neonGreen,
  },
  taskCardCoop: {
    borderStyle: 'dashed',
    opacity: 0.8,
  },

  // Sprite column
  spriteCol: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  spriteText: {
    fontSize: 26,
  },
  spriteDone: {
    fontFamily: fonts.accent.bold,
    fontSize: 11,
    color: colors.accent.neonGreen,
  },

  // Info column
  infoCol: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 8,
    gap: 4,
  },
  infoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.text.primary,
    flex: 1,
    marginRight: 6,
  },
  taskTitleDone: {
    color: colors.accent.neonGreen,
  },
  taskMeta: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  taskDiff: {
    fontFamily: fonts.display.bold,
    fontSize: 7,
    letterSpacing: 1,
  },
  taskPts: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.accent.amber,
  },
  taskSynopsis: {
    ...typography.small,
    color: colors.text.secondary,
    lineHeight: 15,
  },
  taskSynopsisDone: {
    color: colors.text.disabled,
  },
  taskRef: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 9,
    color: colors.accent.amber,
    letterSpacing: 0.5,
  },

  // ── Empty state ────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    ...typography.small,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
});
