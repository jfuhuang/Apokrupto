import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function TaskResultOverlay({ success, pointsEarned }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const icon = success ? '✓' : '✕';
  const label = success ? 'COMPLETE!' : 'FAILED';
  const mainColor = success ? colors.accent.neonGreen : colors.primary.neonRed;
  const shadowColor = success ? colors.shadow.cyan : colors.shadow.neonRed;

  return (
    <View style={styles.backdrop}>
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: mainColor,
            shadowColor,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={[styles.icon, { color: mainColor }]}>{icon}</Text>
        <Text style={[styles.label, { color: mainColor }]}>{label}</Text>
        {success && pointsEarned != null && (
          <Text style={styles.points}>+{pointsEarned} pts</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 12, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.background.void,
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  icon: {
    fontFamily: fonts.display.black,
    fontSize: 52,
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.display.bold,
    fontSize: 22,
    letterSpacing: 4,
  },
  points: {
    fontFamily: fonts.accent.bold,
    fontSize: 32,
    color: colors.accent.neonGreen,
    marginTop: 8,
    textShadowColor: colors.accent.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
