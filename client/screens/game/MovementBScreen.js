import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getApiUrl } from '../../config';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';
import { TASKS } from '../../data/tasks';
import TaskScreen from '../tasks/TaskScreen';

export default function MovementBScreen({
  token,
  gameId,
  lobbyId,
  currentTeam,
  roundNumber,
  onMovementComplete,
}) {
  const [assignedTask, setAssignedTask] = useState(null);
  const [taskDone, setTaskDone] = useState(false);

  const socketRef = useRef(null);

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
        // joinRoom triggers server to re-emit taskAssigned if Movement B is active
        socket.emit('joinRoom', { lobbyId });
      });

      socket.on('taskAssigned', ({ taskId }) => {
        const task = TASKS.find((t) => t.id === taskId);
        if (task) setAssignedTask(task);
        else console.warn('[MovementB] Unknown taskId:', taskId);
      });

      socket.on('movementComplete', ({ movement }) => {
        if (movement === 'B') {
          if (onMovementComplete) onMovementComplete();
        }
      });

      // Fallback: GM force-advanced past B directly to C
      socket.on('movementStart', ({ movement }) => {
        if (movement === 'C') {
          if (onMovementComplete) onMovementComplete();
        }
      });

      socket.on('connect_error', (err) => console.warn('[MovementB] Socket error:', err.message));
    };

    connect().catch(console.error);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, lobbyId]);

  // Task is active — render TaskScreen inline
  if (assignedTask && !taskDone) {
    return (
      <TaskScreen
        task={assignedTask}
        role={currentTeam}
        token={token}
        lobbyId={lobbyId}
        onComplete={() => setTaskDone(true)}
        onCancel={() => setTaskDone(true)}
      />
    );
  }

  // Task done or waiting for assignment
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerLabel}>MOVEMENT B — TASKS</Text>
          <Text style={styles.headerRound}>ROUND {roundNumber}</Text>
        </View>

        <View style={styles.body}>
          {taskDone ? (
            <>
              <Text style={styles.doneTitle}>TASK COMPLETE</Text>
              <Text style={styles.doneHint}>Waiting for the round to end...</Text>
            </>
          ) : (
            <>
              <ActivityIndicator
                size="large"
                color={colors.primary.electricBlue}
                style={styles.spinner}
              />
              <Text style={styles.waitingTitle}>ASSIGNING TASK</Text>
              <Text style={styles.waitingHint}>Your task is being assigned...</Text>
            </>
          )}
        </View>
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
    color: colors.primary.electricBlue,
  },
  headerRound: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  spinner: {
    marginBottom: 8,
  },
  waitingTitle: {
    ...typography.screenTitle,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    textAlign: 'center',
  },
  waitingHint: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  doneTitle: {
    ...typography.screenTitle,
    color: colors.accent.neonGreen,
    textShadowColor: 'rgba(57, 255, 20, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    textAlign: 'center',
  },
  doneHint: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
