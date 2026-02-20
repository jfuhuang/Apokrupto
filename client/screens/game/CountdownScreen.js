import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const COUNTDOWN_FROM = 5;

// Replace these files with real audio assets:
//   assets/sounds/tick.mp3  — short beep/click played on each number
//   assets/sounds/go.mp3    — distinct sound played when countdown hits 0
const TICK_FILE = require('../../assets/sounds/tick.mp3');
const GO_FILE   = require('../../assets/sounds/go.mp3');

export default function CountdownScreen({ onCountdownComplete }) {
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tickRef = useRef(null);
  const goRef   = useRef(null);

  const pulse = () => {
    scaleAnim.setValue(1.6);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  // Load both sounds once on mount; unload on unmount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [{ sound: tick }, { sound: go }] = await Promise.all([
          Audio.Sound.createAsync(TICK_FILE),
          Audio.Sound.createAsync(GO_FILE),
        ]);
        if (mounted) {
          tickRef.current = tick;
          goRef.current   = go;
        } else {
          // Component unmounted before load finished — release immediately
          tick.unloadAsync();
          go.unloadAsync();
        }
      } catch (err) {
        // Sound files are placeholders — countdown runs silently until replaced
        console.warn('[CountdownScreen] Sound unavailable:', err.message);
      }
    })();

    return () => {
      mounted = false;
      tickRef.current?.unloadAsync();
      goRef.current?.unloadAsync();
    };
  }, []);

  // Start the countdown interval
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

  // Pulse + sound on every tick
  useEffect(() => {
    pulse();
    const sound = count === 0 ? goRef.current : tickRef.current;
    sound?.replayAsync().catch(() => {});
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
