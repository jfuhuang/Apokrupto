import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function RushResultOverlay({ success, basePoints, bonusPoints, streakCount }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const icon = success ? '\u2713' : '\u2715';
  const mainColor = success ? colors.accent.neonGreen : colors.primary.neonRed;
  const totalPoints = basePoints + bonusPoints;

  return (
    <View style={styles.backdrop}>
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: mainColor,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={[styles.icon, { color: mainColor }]}>{icon}</Text>

        {success ? (
          <>
            <Text style={styles.points}>+{totalPoints}</Text>
            {bonusPoints > 0 && (
              <View style={styles.bonusRow}>
                <Text style={styles.bonusText}>STREAK x{streakCount}</Text>
                <Text style={styles.bonusPoints}>+{bonusPoints} bonus</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.failLabel, { color: mainColor }]}>FAILED</Text>
            {streakCount > 0 && (
              <Text style={styles.streakReset}>STREAK RESET</Text>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 12, 16, 0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.background.void,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontFamily: fonts.display.black,
    fontSize: 44,
  },
  points: {
    fontFamily: fonts.accent.bold,
    fontSize: 36,
    color: colors.accent.neonGreen,
    textShadowColor: colors.accent.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bonusText: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accent.amber,
  },
  bonusPoints: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.accent.amber,
  },
  failLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 18,
    letterSpacing: 4,
  },
  streakReset: {
    fontFamily: fonts.display.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.accent.amber,
    marginTop: 4,
  },
});
