import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { useGame } from '../../context/GameContext';
import { COOP_TASK_LABELS, COOP_TASK_ICONS } from '../../data/coopTasks';
import { MOVEMENT_B_DURATION_MS } from '../../constants/timings';
import DeceptionTask from '../tasks/coop/DeceptionTask';
import SecretBallotTask from '../tasks/coop/SecretBallotTask';
import CoopTapTask from '../tasks/coop/CoopTapTask';
import CoopHoldTask from '../tasks/coop/CoopHoldTask';
import SimonSaysTask from '../tasks/coop/SimonSaysTask';
import TaskContainer from '../../components/TaskContainer';

export default function CoopRushScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  isSus,
  movementBEndsAt,
  sessionId,
  partnerId,
  partnerUsername,
  role,
  initialTask,
  onSessionEnd,
}) {
  const { setSocketConnected } = useGame();

  const socketRef = useRef(null);
  const [currentTask, setCurrentTask] = useState(initialTask);
  const [myRole, setMyRole] = useState(role);
  const [taskUpdate, setTaskUpdate] = useState(null);
  const [sessionPoints, setSessionPoints] = useState(0);
  const sessionPointsRef = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [simonPatterns, setSimonPatterns] = useState(null);
  const endsAtRef = useRef(null);
  const totalDurationRef = useRef(MOVEMENT_B_DURATION_MS);
  const sessionEndedRef = useRef(false);
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const resultFadeAnim = useRef(new Animated.Value(0)).current;

  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  // Timer — driven entirely by epoch timestamp so all devices stay in sync
  const startCountdown = useCallback((endsAt) => {
    if (!endsAt) return;
    endsAtRef.current = endsAt;
    const remaining = endsAt - Date.now();
    totalDurationRef.current = Math.max(remaining, MOVEMENT_B_DURATION_MS);
    setSecondsLeft(Math.max(0, Math.ceil(remaining / 1000)));
  }, []);

  useEffect(() => {
    if (movementBEndsAt) startCountdown(movementBEndsAt);
  }, [movementBEndsAt, startCountdown]);

  // Single 250ms tick drives both the text counter and the progress bar
  useEffect(() => {
    if (secondsLeft === null) return;
    const id = setInterval(() => {
      const remaining = endsAtRef.current
        ? Math.max(0, endsAtRef.current - Date.now())
        : 0;
      const secs = Math.ceil(remaining / 1000);
      setSecondsLeft(secs);
      timerBarAnim.setValue(remaining / totalDurationRef.current);
      if (remaining <= 0 && !sessionEndedRef.current) {
        sessionEndedRef.current = true;
        onSessionEnd({ reason: 'movementEnd', sessionPoints: sessionPointsRef.current, teamPoints: null });
      }
    }, 250);
    return () => clearInterval(id);
  }, [secondsLeft !== null, timerBarAnim]);

  // Socket connection
  useEffect(() => {
    let socket;
    const connect = async () => {
      const baseUrl = await getApiUrl();
      socket = io(baseUrl, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        forceNew: true,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('joinRoom', { lobbyId });
        if (sessionId) {
          socket.emit('coopRejoin', { sessionId }, (res) => {
            if (res?.error) console.warn('[CoopRush] Rejoin error:', res.error);
          });
        }
      });

      socket.on('coopTaskUpdate', (data) => {
        if (data.sessionId !== sessionId) return;
        const { sessionId: _sid, ...update } = data;
        setTaskUpdate(update);
      });

      socket.on('coopSimonPatterns', ({ sessionId: sid, phosPattern, skotiaPattern }) => {
        if (sid !== sessionId) return;
        setSimonPatterns({ phosPattern, skotiaPattern });
      });

      socket.on('coopNextTask', ({ sessionId: sid, task, sessionPoints: pts, role: newRole }) => {
        if (sid !== sessionId) return;
        // Update effective role sent directly by the server for this task
        if (newRole) {
          setMyRole(newRole);
        }
        // Switch to the new task immediately, show overlay on top
        setCurrentTask(task);
        setTaskUpdate(null);
        setSimonPatterns(null);
        setSessionPoints(pts);
        sessionPointsRef.current = pts;
        setShowResult(true);
        resultFadeAnim.setValue(1);
        Animated.timing(resultFadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setShowResult(false);
        });
      });

      socket.on('coopSessionEnd', ({ sessionId: sid, reason, sessionPoints: pts, teamPoints }) => {
        if (sid !== sessionId) return;
        if (sessionEndedRef.current) return;
        sessionEndedRef.current = true;
        onSessionEnd({ reason, sessionPoints: pts, teamPoints });
      });

      socket.on('movementComplete', ({ movement }) => {
        if (movement !== 'B') return;
        if (sessionEndedRef.current) return;
        sessionEndedRef.current = true;
        onSessionEnd({ reason: 'movementEnd', sessionPoints: sessionPointsRef.current, teamPoints: null });
      });

      socket.on('connect_error', (err) =>
        console.warn('[CoopRush] Socket error:', err.message)
      );
    };

    connect().catch(console.error);
    return () => {
      setSocketConnected(false);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId, sessionId]);

  // Action handler for task components
  const handleAction = useCallback((action, data) => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('coopAction', { sessionId, action, data }, (res) => {
      if (res?.error) console.warn('[CoopRush] Action error:', res.error);
    });
  }, [sessionId]);

  // Exit
  const handleExit = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('coopExit', { sessionId }, () => {});
    }
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    onSessionEnd({ reason: 'exit', sessionPoints: sessionPointsRef.current, teamPoints: null });
  }, [sessionId, onSessionEnd]);

  const formatTime = (s) => {
    if (s === null || s === undefined) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerUrgent = secondsLeft !== null && secondsLeft <= 30;
  const taskType = currentTask?.taskType;
  const taskLabel = COOP_TASK_LABELS[taskType] || 'TASK';
  const taskIcon = COOP_TASK_ICONS[taskType] || '❓';

  // Render active task
  const renderTask = () => {
    if (!currentTask) return null;
    // key: taskId forces React to remount the component when the task changes,
    // even if two consecutive tasks have the same type (e.g. deception → deception).
    const taskKey = currentTask.taskId;
    const taskProps = {
      task: currentTask,
      role: myRole,
      currentTeam,
      onAction: handleAction,
      update: taskUpdate,
    };

    switch (currentTask.taskType) {
      case 'deception':
        return <DeceptionTask key={taskKey} {...taskProps} />;
      case 'secret_ballot':
        return <SecretBallotTask key={taskKey} {...taskProps} />;
      case 'coop_tap':
        return <CoopTapTask key={taskKey} {...taskProps} />;
      case 'coop_hold':
        return <CoopHoldTask key={taskKey} {...taskProps} />;
      case 'simon_says':
        return <SimonSaysTask key={taskKey} {...taskProps} simonPatterns={simonPatterns} />;
      default:
        return (
          <View style={styles.unknownTask}>
            <Text style={styles.unknownText}>Unknown task type: {currentTask.taskType}</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <Text style={styles.hudIcon}>{taskIcon}</Text>
            <View>
              <Text style={[styles.hudTaskLabel, { color: teamColor }]}>{taskLabel}</Text>
              <Text style={styles.hudPartner}>
              w/ {partnerUsername} · Role {myRole}
              </Text>
            </View>
          </View>
          <View style={styles.hudRight}>
            <Text style={[styles.hudPoints, { color: teamColor }]}>+{sessionPoints}</Text>
            <TouchableOpacity onPress={handleExit} activeOpacity={0.7}>
              <Text style={styles.exitText}>EXIT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timer bar */}
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

        {/* Task area */}
        <TaskContainer scrollable={false} padded={false} centered={false}>
          {renderTask()}
        </TaskContainer>

        {/* Result overlay */}
        {showResult && (
          <Animated.View style={[styles.resultOverlay, { opacity: resultFadeAnim }]}>
            <Text style={[styles.resultText, { color: teamColor }]}>NEXT TASK!</Text>
          </Animated.View>
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

  // HUD
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hudIcon: {
    fontSize: 24,
  },
  hudTaskLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
  },
  hudPartner: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  hudRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hudPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    letterSpacing: 1,
  },
  exitText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },

  // Timer
  timerBarTrack: {
    height: 4,
    backgroundColor: colors.background.frost,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
  },
  timerText: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.text.primary,
    textAlign: 'center',
    paddingVertical: 4,
  },

  // Unknown task
  unknownTask: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unknownText: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.tertiary,
  },

  // Result overlay
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    fontFamily: fonts.display.bold,
    fontSize: 28,
    letterSpacing: 4,
  },
});
