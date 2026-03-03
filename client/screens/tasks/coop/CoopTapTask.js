import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function CoopTapTask({ task, role, currentTeam, onAction, update }) {
  const [localTaps, setLocalTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(task.timeLimit || 15);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timeoutFiredRef = useRef(false);

  const teamColor =
    currentTeam === 'skotia' ? colors.primary.neonRed : colors.primary.electricBlue;

  const targetTaps = task.config?.targetTaps || 50;
  const serverTotal = update?.totalTaps ?? 0;
  const totalTaps = Math.max(serverTotal, localTaps);
  const progress = Math.min(totalTaps / targetTaps, 1);

  const myTaps = role === 'A' ? (update?.tapsA ?? localTaps) : (update?.tapsB ?? localTaps);
  const partnerTaps = role === 'A' ? (update?.tapsB ?? 0) : (update?.tapsA ?? 0);

  // Client-side countdown
  useEffect(() => {
    if (update?.phase === 'resolved') return;
    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [update?.phase]);

  // Fire tapTimeout when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !timeoutFiredRef.current && update?.phase !== 'resolved') {
      timeoutFiredRef.current = true;
      onAction('tapTimeout', {});
    }
  }, [timeLeft, update?.phase, onAction]);

  const handleTap = useCallback(() => {
    if (update?.phase === 'resolved') return;
    setLocalTaps((t) => t + 1);
    onAction('tap', {});

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [update?.phase, onAction, scaleAnim]);

  // Resolved
  if (update?.phase === 'resolved') {
    const success = update.success;
    return (
      <View style={styles.container}>
        <Text style={[styles.resultTitle, { color: success ? colors.state.success : colors.primary.neonRed }]}>
          {success ? 'SUCCESS!' : 'TIME UP!'}
        </Text>
        <Text style={[styles.resultPoints, { color: success ? colors.state.success : colors.text.tertiary }]}>
          +{update.pointsAwarded ?? 0}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.timer, timeLeft <= 5 && { color: colors.primary.neonRed }]}>
        {timeLeft}s
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: teamColor }]} />
      </View>
      <Text style={styles.progressText}>{totalTaps} / {targetTaps}</Text>

      {/* Tap button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.tapButton, { borderColor: teamColor, shadowColor: teamColor }]}
          onPress={handleTap}
          activeOpacity={0.6}
        >
          <Text style={styles.tapEmoji}>👆</Text>
          <Text style={[styles.tapLabel, { color: teamColor }]}>TAP!</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Score breakdown */}
      <View style={styles.scoreRow}>
        <Text style={styles.scoreText}>You: {myTaps}</Text>
        <Text style={styles.scoreDivider}>|</Text>
        <Text style={styles.scoreText}>Partner: {partnerTaps}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  timer: {
    fontFamily: fonts.accent.bold,
    fontSize: 28,
    color: colors.text.primary,
    letterSpacing: 2,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.background.frost,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  tapButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    backgroundColor: colors.background.void,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  tapEmoji: {
    fontSize: 40,
  },
  tapLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 16,
    letterSpacing: 3,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  scoreText: {
    fontFamily: fonts.ui.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  scoreDivider: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  resultTitle: {
    fontFamily: fonts.display.bold,
    fontSize: 28,
    letterSpacing: 4,
  },
  resultPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    letterSpacing: 2,
  },
});
