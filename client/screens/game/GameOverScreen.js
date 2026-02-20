import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';

export default function GameOverScreen({ result, onReturn }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  const isDeceiverWin = result?.winner === 'deceivers';
  const winColor = isDeceiverWin ? colors.primary.crimson : colors.accent.neonGreen;
  const winShadow = isDeceiverWin ? colors.shadow.neonRed : colors.accent.neonGreen;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={[styles.title, { color: winColor, textShadowColor: winShadow }]}>
            {isDeceiverWin ? 'DECEIVERS WIN' : 'INNOCENTS WIN'}
          </Text>

          {result?.reason ? (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>CAUSE</Text>
              <Text style={styles.reasonText}>{result.reason}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.returnBtn} onPress={onReturn} activeOpacity={0.8}>
            <Text style={styles.returnBtnText}>RETURN TO LOBBY LIST</Text>
          </TouchableOpacity>
        </Animated.View>
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
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: 36,
    letterSpacing: 4,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  reasonBox: {
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
  },
  reasonLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 3,
    color: colors.text.tertiary,
  },
  reasonText: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  returnBtn: {
    marginTop: 8,
    backgroundColor: colors.background.void,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  returnBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
});
