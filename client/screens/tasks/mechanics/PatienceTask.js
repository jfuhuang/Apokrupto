import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Circle, Path, Ellipse, Line, Rect, G } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const SIZE   = 180;
const STROKE = 14;
const R      = (SIZE - STROKE) / 2;
const CIRC   = 2 * Math.PI * R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Task-specific temptation visuals ────────────────────────────────────────

function RockTemptation({ pulseAnim }) {
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={70} height={60} viewBox="0 0 70 60">
        {/* Rock body */}
        <Path d="M10 55 Q5 40 10 25 Q15 10 30 8 Q45 5 55 12 Q65 22 63 40 Q60 55 10 55Z" fill="#8B9CB0" />
        <Path d="M12 54 Q8 40 12 27 Q17 12 32 10 Q44 7 53 14 Q62 24 60 40 Q58 54 12 54Z" fill="#9AACC0" />
        {/* Crack line */}
        <Path d="M35 10 L33 22 L37 35" stroke="#0B0C10" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Water drops (temptation) */}
        <Ellipse cx="25" cy="48" rx="4" ry="3" fill="#87CEEB" opacity="0.7" />
        <Ellipse cx="40" cy="50" rx="3" ry="2.5" fill="#87CEEB" opacity="0.6" />
        <Ellipse cx="52" cy="47" rx="3" ry="2.5" fill="#87CEEB" opacity="0.5" />
        {/* Highlight */}
        <Ellipse cx="28" cy="20" rx="10" ry="6" fill="#B8C8D8" opacity="0.4" />
      </Svg>
    </Animated.View>
  );
}

function StillTemptation({ pulseAnim }) {
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={70} height={60} viewBox="0 0 70 60">
        {/* Calm water */}
        <Path d="M5 30 Q15 26 25 30 Q35 34 45 30 Q55 26 65 30" stroke="#0080FF" strokeWidth="2" fill="none" />
        <Path d="M5 38 Q15 34 25 38 Q35 42 45 38 Q55 34 65 38" stroke="#0080FF" strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* Clouds */}
        <Circle cx="20" cy="12" r="8" fill="#334455" opacity="0.4" />
        <Circle cx="35" cy="10" r="10" fill="#334455" opacity="0.5" />
        <Circle cx="50" cy="12" r="8" fill="#334455" opacity="0.4" />
        {/* Glowing center */}
        <Ellipse cx="35" cy="30" rx="12" ry="4" fill="#0080FF" opacity="0.25" />
      </Svg>
    </Animated.View>
  );
}

function EagleTemptation({ pulseAnim }) {
  const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Svg width={70} height={60} viewBox="0 0 70 60">
        {/* Eagle wings spread */}
        <Path d="M35 30 Q20 22 5 15 Q10 25 20 30Z" fill="#8B6914" opacity="0.8" />
        <Path d="M35 30 Q50 22 65 15 Q60 25 50 30Z" fill="#8B6914" opacity="0.8" />
        {/* Body */}
        <Ellipse cx="35" cy="32" rx="6" ry="10" fill="#A07828" />
        {/* Head */}
        <Circle cx="35" cy="20" r="5" fill="#A07828" />
        {/* Beak */}
        <Path d="M35 23 L33 27 L37 27Z" fill="#FFA63D" />
        {/* Eye */}
        <Circle cx="33" cy="19" r="1" fill="#0B0C10" />
        {/* Sun rays behind */}
        <Line x1="35" y1="2" x2="35" y2="8" stroke="#FFA63D" strokeWidth="1.5" opacity="0.4" />
        <Line x1="20" y1="5" x2="24" y2="10" stroke="#FFA63D" strokeWidth="1.5" opacity="0.3" />
        <Line x1="50" y1="5" x2="46" y2="10" stroke="#FFA63D" strokeWidth="1.5" opacity="0.3" />
      </Svg>
    </Animated.View>
  );
}

const TASK_CONFIG = {
  still_waters: {
    ringColor: '#0080FF',
    label: "Don't strike the rock!",
    failMsg: 'You struck the rock instead of speaking!',
    Temptation: RockTemptation,
  },
  be_still: {
    ringColor: '#8B5CF6',
    label: 'Be still...',
    failMsg: 'You could not be still!',
    Temptation: StillTemptation,
  },
  wait_on_the_lord: {
    ringColor: '#FFA63D',
    label: "Don't rush ahead!",
    failMsg: 'You ran ahead instead of waiting!',
    Temptation: EagleTemptation,
  },
};

// ── Main component ──────────────────────────────────────────────────────────

export default function PatienceTask({ config, onSuccess, onFail, taskId }) {
  const { duration } = config;
  const fillAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed]       = useState(false);
  const doneRef = useRef(false);
  const readyRef = useRef(false);

  // Delay before accepting touches — prevents the navigation tap from
  // immediately failing the task on mount
  useEffect(() => {
    const t = setTimeout(() => { readyRef.current = true; }, 500);
    return () => clearTimeout(t);
  }, []);

  const taskCfg = TASK_CONFIG[taskId] || TASK_CONFIG.still_waters;
  const { ringColor, label, failMsg, Temptation } = taskCfg;

  // Auto-fill ring over duration
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue:  1,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !doneRef.current) {
        doneRef.current = true;
        setCompleted(true);
        onSuccess();
      }
    });
  }, []);

  // Temptation pulse loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Any touch = fail
  const handleTouch = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    fillAnim.stopAnimation();
    setFailed(true);
    Animated.timing(fillAnim, {
      toValue:  0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    onFail();
  };

  const dashOffset = fillAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [CIRC, 0],
  });

  const currentColor = completed
    ? colors.accent.neonGreen
    : failed
    ? colors.state.error
    : ringColor;

  return (
    <View
      style={styles.container}
      onStartShouldSetResponder={() => !doneRef.current && readyRef.current}
      onResponderGrant={handleTouch}
    >
      <Text style={styles.instruction}>
        {completed
          ? 'Well done!'
          : failed
          ? failMsg
          : label}
      </Text>

      <View style={styles.ringWrapper}>
        <Svg width={SIZE} height={SIZE}>
          {/* Background track */}
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            stroke={colors.background.frost}
            strokeWidth={STROKE}
            fill="none"
          />
          {/* Auto-filling progress arc */}
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            stroke={currentColor}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${CIRC}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>

        <View style={styles.centerContent}>
          {completed ? (
            <Text style={[styles.resultIcon, { color: colors.accent.neonGreen }]}>✓</Text>
          ) : failed ? (
            <Text style={[styles.resultIcon, { color: colors.state.error }]}>✕</Text>
          ) : (
            <Temptation pulseAnim={pulseAnim} />
          )}
        </View>
      </View>

      <Text style={styles.subText}>
        {completed || failed
          ? ''
          : `Resist for ${duration} seconds — DON'T tap!`}
      </Text>

      {!completed && !failed && (
        <Text style={styles.warning}>⚠ ANY touch = instant fail</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  instruction: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 18,
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
  resultIcon: {
    fontFamily: fonts.display.black,
    fontSize: 42,
    letterSpacing: 3,
  },
  subText: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.disabled,
    textAlign: 'center',
  },
  warning: {
    fontFamily: fonts.accent.bold,
    fontSize: 14,
    color: colors.state.error,
    textAlign: 'center',
    letterSpacing: 1,
    opacity: 0.8,
  },
});
