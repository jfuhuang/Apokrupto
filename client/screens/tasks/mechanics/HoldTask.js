import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import Svg, { Circle, Path, Ellipse, Rect, Line, G } from 'react-native-svg';
import TaskSprite from '../../../components/TaskSprite';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const SIZE   = 180;
const STROKE = 14;
const R      = (SIZE - STROKE) / 2;
const CIRC   = 2 * Math.PI * R;

const { width: W } = Dimensions.get('window');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Task-specific center content ─────────────────────────────────────────

function TorchCenter({ fillAnim, color }) {
  const flameH = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 48] });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={40} height={24} viewBox="0 0 40 24">
        {/* Handle */}
        <Rect x="17" y="10" width="6" height="14" rx="3" fill={color} />
        {/* Wrap */}
        <Rect x="14" y="6"  width="12" height="6" rx="1" fill={color} opacity="0.8" />
      </Svg>
      <Animated.View style={{ height: flameH, overflow: 'hidden' }}>
        <Svg width={32} height={50} viewBox="0 0 32 50">
          <Path d="M16 50 C10 40 8 28 12 18 C12 26 16 26 15 18 C16 24 18 24 17 18 C20 28 22 40 16 50Z" fill="#FFA63D" />
          <Path d="M16 44 C13 36 14 28 16 22 C18 28 19 36 16 44Z" fill="#FFE082" opacity="0.9" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function FurnaceCenter({ fillAnim }) {
  const fireH = fillAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 46] });
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={60} height={30} viewBox="0 0 60 30">
        {/* Furnace arch */}
        <Path d="M5 30 L5 18 Q5 5 30 5 Q55 5 55 18 L55 30Z" fill="#A04020" />
        {/* Dark opening */}
        <Path d="M15 30 L15 20 Q15 12 30 12 Q45 12 45 20 L45 30Z" fill="#1A0A00" />
      </Svg>
      <Animated.View style={{ height: fireH, overflow: 'hidden' }}>
        <Svg width={32} height={50} viewBox="0 0 32 50">
          <Path d="M16 50 C10 40 8 28 12 18 C12 26 16 26 15 18 C16 24 18 24 17 18 C20 28 22 40 16 50Z" fill="#FF5500" />
          <Path d="M16 44 C13 36 14 28 16 22 C18 28 19 36 16 44Z" fill="#FFA63D" opacity="0.9" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function PrayerCenter({ color }) {
  return (
    <Svg width={60} height={60} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="22" stroke={color} strokeWidth="3" fill="none" />
      <Ellipse cx="30" cy="7"  rx="5" ry="4" fill={color} />
      <Ellipse cx="30" cy="53" rx="5" ry="4" fill={color} />
      <Ellipse cx="7"  cy="30" rx="4" ry="5" fill={color} />
      <Ellipse cx="53" cy="30" rx="4" ry="5" fill={color} />
      <Ellipse cx="14" cy="14" rx="4" ry="4" fill={color} />
      <Ellipse cx="46" cy="14" rx="4" ry="4" fill={color} />
      <Ellipse cx="14" cy="46" rx="4" ry="4" fill={color} />
      <Ellipse cx="46" cy="46" rx="4" ry="4" fill={color} />
    </Svg>
  );
}

const TASK_RING_COLOR = {
  gideons_torch:   '#FFA63D',  // amber
  fiery_furnace:   '#FF5500',  // orange-red
  circle_of_prayer:'#8B5CF6',  // ultraviolet
};

export default function HoldTask({ config, onSuccess, onFail, taskId }) {
  const { duration } = config;
  const fillAnim = useRef(new Animated.Value(0)).current;
  const animRef  = useRef(null);
  const [holding,   setHolding]   = useState(false);
  const [completed, setCompleted] = useState(false);
  const [failed,    setFailed]    = useState(false);

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
      onPanResponderGrant:    startHold,
      onPanResponderRelease:  endHold,
      onPanResponderTerminate: endHold,
    })
  ).current;

  const dashOffset = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [CIRC, 0],
  });

  const ringColor = completed
    ? colors.accent.neonGreen
    : failed
    ? colors.state.error
    : holding
    ? colors.accent.amber
    : TASK_RING_COLOR[taskId] || colors.primary.electricBlue;

  // Center content per task
  const renderCenter = () => {
    if (completed || failed) {
      return (
        <Text style={[styles.holdText, { color: ringColor }]}>
          {completed ? '✓' : '✕'}
        </Text>
      );
    }
    switch (taskId) {
      case 'gideons_torch':
        return <TorchCenter fillAnim={fillAnim} color={ringColor} />;
      case 'fiery_furnace':
        return <FurnaceCenter fillAnim={fillAnim} />;
      case 'circle_of_prayer':
        return <PrayerCenter color={ringColor} />;
      default:
        return <TaskSprite taskId={taskId} size={52} color={ringColor} />;
    }
  };

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
        <Svg width={SIZE} height={SIZE}>
          {/* Background track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.background.frost}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Animated progress arc */}
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={ringColor}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.centerContent}>
          {renderCenter()}
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
  centerContent: {
    position: 'absolute',
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
