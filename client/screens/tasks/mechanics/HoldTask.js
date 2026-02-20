import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const SIZE = 180;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function HoldTask({ config, onSuccess, onFail }) {
  const { duration } = config; // seconds
  const fillAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const [holding, setHolding] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);

  const startHold = () => {
    if (completed || failed) return;
    setHolding(true);
    animRef.current = Animated.timing(fillAnim, {
      toValue: 1,
      duration: duration * 1000,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) {
        setCompleted(true);
        onSuccess();
      }
    });
  };

  const endHold = () => {
    if (completed) return;
    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }
    setHolding(false);
    // Reset the arc
    Animated.timing(fillAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setFailed(true);
    onFail();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: startHold,
      onPanResponderRelease: endHold,
      onPanResponderTerminate: endHold,
    })
  ).current;

  const strokeDashoffset = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const ringColor = completed
    ? colors.accent.neonGreen
    : failed
    ? colors.state.error
    : holding
    ? colors.accent.amber
    : colors.primary.electricBlue;

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        {completed
          ? 'Done!'
          : failed
          ? 'Released too early!'
          : `Hold for ${duration} seconds`}
      </Text>

      <View style={styles.ringWrapper} {...panResponder.panHandlers}>
        {/* Background circle */}
        <View
          style={[
            styles.circle,
            {
              borderColor: colors.background.frost,
              borderWidth: STROKE,
            },
          ]}
        />
        {/* Filled arc using border hack — approximate with opacity change */}
        <Animated.View
          style={[
            styles.fillIndicator,
            {
              opacity: fillAnim.interpolate({ inputRange: [0, 0.01], outputRange: [0, 1] }),
              borderColor: ringColor,
              borderWidth: STROKE,
              // We clip to progress using a rotation trick isn't ideal in RN without SVG
              // Simple approach: scale the height to show progress
            },
          ]}
        />

        <View style={styles.centerContent}>
          <Text style={[styles.holdText, { color: ringColor }]}>
            {completed ? '✓' : failed ? '✕' : 'HOLD'}
          </Text>
        </View>
      </View>

      <Text style={styles.subText}>
        {completed || failed ? '' : 'Press and hold without releasing'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 24,
  },
  instruction: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  ringWrapper: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    width: SIZE - STROKE,
    height: SIZE - STROKE,
    borderRadius: (SIZE - STROKE) / 2,
  },
  fillIndicator: {
    position: 'absolute',
    width: SIZE - STROKE,
    height: SIZE - STROKE,
    borderRadius: (SIZE - STROKE) / 2,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdText: {
    fontFamily: fonts.display.black,
    fontSize: 28,
    letterSpacing: 3,
  },
  subText: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
});
