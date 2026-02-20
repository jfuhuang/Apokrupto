import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const COUNTDOWN_FROM = 5;

export default function CountdownScreen({ onCountdownComplete }) {
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pulse = () => {
    scaleAnim.setValue(1.6);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    pulse();
    const interval = setInterval(() => {
      setCount((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          setTimeout(onCountdownComplete, 400);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    pulse();
  }, [count]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.subtitle}>GAME STARTING</Text>
        <Animated.Text style={[styles.number, { transform: [{ scale: scaleAnim }] }]}>
          {count}
        </Animated.Text>
        <Text style={styles.hint}>Get ready...</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    ...typography.screenTitle,
    color: colors.text.tertiary,
    marginBottom: 40,
    letterSpacing: 6,
  },
  number: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 140,
    color: colors.primary.electricBlue,
    textShadowColor: colors.shadow.electricBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
    lineHeight: 160,
  },
  hint: {
    ...typography.subtitle,
    color: colors.text.muted,
    marginTop: 40,
    letterSpacing: 2,
  },
});
