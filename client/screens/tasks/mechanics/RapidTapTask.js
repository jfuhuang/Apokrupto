import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function RapidTapTask({ config, onSuccess, onFail, timeLimit }) {
  const { targetTaps } = config;
  const [taps, setTaps] = useState(0);
  const [done, setDone] = useState(false);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Time is managed by TaskHeader; we just respond to the task completing
  const handleTap = () => {
    if (done) return;
    const next = taps + 1;
    setTaps(next);

    // Animate fill bar
    Animated.timing(fillAnim, {
      toValue: Math.min(next / targetTaps, 1),
      duration: 80,
      useNativeDriver: false,
    }).start();

    // Button pulse
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
    ]).start();

    if (next >= targetTaps) {
      setDone(true);
      onSuccess();
    }
  };

  // Called by TaskHeader via onTimeUp — parent passes this down indirectly
  // We expose a prop; TaskScreen wires it up
  useEffect(() => {
    return () => {};
  }, []);

  const pct = Math.round((taps / targetTaps) * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>{taps} / {targetTaps}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: fillAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.pct}>{pct}%</Text>

      <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 32 }}>
        <TouchableOpacity
          style={[styles.tapBtn, done && styles.tapBtnDone]}
          onPress={handleTap}
          activeOpacity={0.8}
          disabled={done}
        >
          <Text style={styles.tapBtnText}>TAP!</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  counter: {
    fontFamily: fonts.accent.bold,
    fontSize: 42,
    color: colors.text.primary,
    marginBottom: 16,
  },
  barTrack: {
    width: '100%',
    height: 18,
    backgroundColor: colors.background.frost,
    borderRadius: 9,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent.neonGreen,
    borderRadius: 9,
  },
  pct: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  tapBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 3,
    borderColor: colors.primary.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  tapBtnDone: {
    borderColor: colors.accent.neonGreen,
    backgroundColor: 'rgba(0, 255, 159, 0.12)',
    shadowColor: colors.accent.neonGreen,
  },
  tapBtnText: {
    fontFamily: fonts.display.black,
    fontSize: 32,
    color: colors.primary.electricBlue,
    letterSpacing: 4,
  },
});
