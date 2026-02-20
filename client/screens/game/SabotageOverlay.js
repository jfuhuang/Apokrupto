import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { typography, fonts } from '../../theme/typography';

export default function SabotageOverlay({ sabotage, secondsLeft, canFix, onPressFix }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse border on critical sabotages
  useEffect(() => {
    if (!sabotage.isCritical) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [sabotage.isCritical, pulseAnim]);

  const timerCritical = sabotage.isCritical && secondsLeft !== null && secondsLeft <= 15;

  return (
    <Animated.View style={[styles.banner, { borderColor: colors.primary.crimson, opacity: sabotage.isCritical ? pulseAnim : 1 }]}>
      <View style={styles.row}>
        <Text style={styles.symbol}>{sabotage.symbol}</Text>
        <View style={styles.textBlock}>
          <Text style={styles.label}>{sabotage.label.toUpperCase()}</Text>
          <Text style={styles.reference}>{sabotage.reference}</Text>
          <Text style={styles.description} numberOfLines={2}>{sabotage.description}</Text>
        </View>

        {sabotage.isCritical && secondsLeft !== null && (
          <Text style={[styles.countdown, timerCritical && styles.countdownCritical]}>
            {secondsLeft}
          </Text>
        )}

        {canFix && (
          <TouchableOpacity style={styles.fixBtn} onPress={onPressFix} activeOpacity={0.75}>
            <Text style={styles.fixBtnText}>FIX</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(220, 20, 60, 0.14)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: colors.primary.crimson,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symbol: {
    fontSize: 28,
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary.neonRed,
    textShadowColor: colors.shadow.neonRed,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  reference: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 10,
    color: colors.accent.amber,
    marginTop: 1,
  },
  description: {
    fontFamily: fonts.ui.regular,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 3,
  },
  countdown: {
    fontFamily: fonts.accent.bold,
    fontSize: 32,
    color: colors.primary.neonRed,
    minWidth: 44,
    textAlign: 'right',
  },
  countdownCritical: {
    color: colors.primary.crimson,
    textShadowColor: colors.primary.crimson,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  fixBtn: {
    backgroundColor: 'rgba(220, 20, 60, 0.22)',
    borderWidth: 1.5,
    borderColor: colors.primary.neonRed,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 4,
  },
  fixBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.primary.neonRed,
  },
});
