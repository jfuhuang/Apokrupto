import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

export default function CoopHoldTask({ task, role, currentTeam, onAction, update }) {
  const [holding, setHolding] = useState(false);
  const [timeLeft, setTimeLeft] = useState(task.timeLimit || 20);
  const [localElapsedMs, setLocalElapsedMs] = useState(0);
  const youRingAnim = useRef(new Animated.Value(0)).current;
  const partnerRingAnim = useRef(new Animated.Value(0)).current;
  const timeoutFiredRef = useRef(false);

  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  const targetMs = task.config?.targetMs || 5000;

  const partnerHolding = role === 'A'
    ? (update?.holdB ?? false)
    : (update?.holdA ?? false);

  const bothHolding = holding && partnerHolding;

  // Sync local elapsed from server whenever a new update arrives
  useEffect(() => {
    if (update?.elapsed !== undefined) {
      setLocalElapsedMs(update.elapsed);
    }
  }, [update?.elapsed]);

  // Client-side ticker: advance elapsed while both players are actively holding
  const holdCheckFiredRef = useRef(false);
  useEffect(() => {
    if (!bothHolding || update?.phase === 'resolved') return;
    holdCheckFiredRef.current = false;
    const TICK = 50;
    const id = setInterval(() => {
      setLocalElapsedMs((prev) => {
        const next = Math.min(prev + TICK, targetMs);
        if (next >= targetMs && !holdCheckFiredRef.current) {
          holdCheckFiredRef.current = true;
          onAction('holdCheck', {});
        }
        return next;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [bothHolding, update?.phase, targetMs, onAction]);

  const elapsedMs = localElapsedMs;
  const progress = Math.min(elapsedMs / targetMs, 1);

  // Animate ring fills
  useEffect(() => {
    Animated.timing(youRingAnim, {
      toValue: holding ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [holding, youRingAnim]);

  useEffect(() => {
    Animated.timing(partnerRingAnim, {
      toValue: partnerHolding ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [partnerHolding, partnerRingAnim]);

  // Client-side countdown
  useEffect(() => {
    if (update?.phase === 'resolved') return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [update?.phase]);

  // Fire holdTimeout when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !timeoutFiredRef.current && update?.phase !== 'resolved') {
      timeoutFiredRef.current = true;
      onAction('holdTimeout', {});
    }
  }, [timeLeft, update?.phase, onAction]);

  const handlePressIn = useCallback(() => {
    if (update?.phase === 'resolved') return;
    setHolding(true);
    onAction('holdStart', {});
  }, [update?.phase, onAction]);

  const handlePressOut = useCallback(() => {
    if (update?.phase === 'resolved') return;
    setHolding(false);
    onAction('holdEnd', {});
  }, [update?.phase, onAction]);

  // Resolved
  if (update?.phase === 'resolved') {
    const success = update.success;
    return (
      <TaskContainer>
        <Text style={[styles.resultTitle, { color: success ? colors.state.success : colors.primary.neonRed }]}>
          {success ? 'SYNCHRONIZED!' : 'OUT OF SYNC!'}
        </Text>
        <Text style={[styles.resultPoints, { color: success ? colors.state.success : colors.text.tertiary }]}>
          +{update.pointsAwarded ?? 0}
        </Text>
      </TaskContainer>
    );
  }

  const youBorderColor = youRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background.frost, teamColor],
  });

  const partnerBorderColor = partnerRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background.frost, teamColor],
  });

  return (
    <TaskContainer>
      <Text style={[styles.timer, timeLeft <= 5 && { color: colors.primary.neonRed }]}>
        {timeLeft}s
      </Text>

      <Text style={styles.instruction}>Both players must hold down at the same time</Text>

      {/* Ring indicators */}
      <View style={styles.ringRow}>
        <View style={styles.ringWrapper}>
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: youBorderColor,
                backgroundColor: holding ? teamColor + '20' : 'transparent',
              },
            ]}
          >
            <Text style={styles.ringEmoji}>{holding ? '✋' : '👋'}</Text>
          </Animated.View>
          <Text style={styles.ringLabel}>YOU</Text>
        </View>

        <View style={styles.ringWrapper}>
          <Animated.View
            style={[
              styles.ring,
              {
                borderColor: partnerBorderColor,
                backgroundColor: partnerHolding ? teamColor + '20' : 'transparent',
              },
            ]}
          >
            <Text style={styles.ringEmoji}>{partnerHolding ? '✋' : '👋'}</Text>
          </Animated.View>
          <Text style={styles.ringLabel}>PARTNER</Text>
        </View>
      </View>

      {/* Elapsed timer */}
      <Text style={[styles.elapsed, { color: teamColor }]}>
        {(elapsedMs / 1000).toFixed(1)}s / {(targetMs / 1000).toFixed(1)}s
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: teamColor }]} />
      </View>

      {/* Hold area */}
      <Pressable
        style={[styles.holdButton, holding && { borderColor: teamColor, backgroundColor: teamColor + '15' }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={[styles.holdLabel, holding && { color: teamColor }]}>
          {holding ? 'HOLDING...' : 'HOLD HERE'}
        </Text>
      </Pressable>
    </TaskContainer>
  );
}

const styles = StyleSheet.create({
  timer: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  instruction: {
    fontFamily: fonts.ui.regular,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  ringRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringEmoji: {
    fontSize: 22,
  },
  ringLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  elapsed: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    letterSpacing: 1,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.background.frost,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  holdButton: {
    width: '100%',
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.background.frost,
    backgroundColor: colors.background.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 16,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  resultTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 24,
    letterSpacing: 4,
  },
  resultPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    letterSpacing: 2,
  },
});
