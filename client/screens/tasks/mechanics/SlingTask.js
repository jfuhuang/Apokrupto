import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const STONE_SIZE = 36;
const TARGET_SIZE = 70;
const TARGET_X = W / 2 - TARGET_SIZE / 2;
const TARGET_Y = 80;
const STONE_START_X = W / 2 - STONE_SIZE / 2;
const STONE_START_Y = H * 0.55;

export default function SlingTask({ config, onSuccess, onFail }) {
  const { attempts, minVelocity } = config;
  const [attemptsLeft, setAttemptsLeft] = useState(attempts);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPos = useRef({ x: STONE_START_X, y: STONE_START_Y });
  const prevPos = useRef({ x: STONE_START_X, y: STONE_START_Y });
  const stone = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !done,
      onPanResponderMove: (_, g) => {
        prevPos.current = { ...lastPos.current };
        lastPos.current = { x: STONE_START_X + g.dx, y: STONE_START_Y + g.dy };
        pan.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        // Estimate velocity from last two positions
        const vx = lastPos.current.x - prevPos.current.x;
        const vy = lastPos.current.y - prevPos.current.y;
        const velocity = Math.sqrt(vx * vx + vy * vy) * 60; // rough px/s

        // Animate stone flying
        const flyX = g.dx + vx * 15;
        const flyY = g.dy + vy * 15;

        Animated.timing(pan, {
          toValue: { x: flyX, y: flyY },
          duration: 400,
          useNativeDriver: false,
        }).start(() => {
          // Check hit: stone final position vs target
          const finalX = STONE_START_X + flyX + STONE_SIZE / 2;
          const finalY = STONE_START_Y + flyY + STONE_SIZE / 2;
          const tcx = TARGET_X + TARGET_SIZE / 2;
          const tcy = TARGET_Y + TARGET_SIZE / 2;
          const dist = Math.sqrt((finalX - tcx) ** 2 + (finalY - tcy) ** 2);
          const hit = dist < TARGET_SIZE * 0.75 && velocity >= minVelocity;

          if (hit) {
            setDone(true);
            setMessage('Direct hit!');
            onSuccess();
          } else {
            const remaining = attemptsLeft - 1;
            setAttemptsLeft(remaining);
            if (velocity < minVelocity) {
              setMessage('Too slow! Swipe faster.');
            } else {
              setMessage('Missed! Try again.');
            }
            // Reset
            setTimeout(() => {
              pan.setValue({ x: 0, y: 0 });
              if (remaining <= 0) {
                setDone(true);
                onFail();
              }
            }, 500);
          }
        });
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {done ? message : 'Swipe the stone upward at Goliath!'}
      </Text>
      {!done && (
        <Text style={styles.attempts}>Attempts left: {attemptsLeft}</Text>
      )}
      {message !== '' && !done && (
        <Text style={styles.message}>{message}</Text>
      )}

      {/* Target — Goliath */}
      <View style={[styles.target, { left: TARGET_X, top: TARGET_Y }]}>
        <Text style={styles.targetLabel}>GOLIATH</Text>
      </View>

      {/* Stone */}
      <Animated.View
        style={[
          styles.stone,
          { left: STONE_START_X, top: STONE_START_Y },
          pan.getLayout(),
        ]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.stoneIcon}>🪨</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 10,
  },
  attempts: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    marginTop: 4,
  },
  message: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
    color: colors.accent.amber,
    textAlign: 'center',
    marginTop: 4,
  },
  target: {
    position: 'absolute',
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: 12,
    backgroundColor: 'rgba(220,20,60,0.15)',
    borderWidth: 2,
    borderColor: colors.primary.crimson,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.primary.neonRed,
  },
  stone: {
    position: 'absolute',
    width: STONE_SIZE,
    height: STONE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stoneIcon: {
    fontSize: 28,
  },
});
