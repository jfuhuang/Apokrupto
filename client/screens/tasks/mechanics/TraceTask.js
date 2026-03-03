import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Ellipse, Polyline } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');

const GUIDE_CX    = W / 2;
const GUIDE_R     = W * 0.30;

const TASK_RING_COLOR = {
  circle_of_prayer: '#8B5CF6',
};

// ── Prayer ring center SVG ────────────────────────────────────────────────

function PrayerRingSvg({ color }) {
  const s = 80;
  const r = 28;
  return (
    <Svg width={s} height={s} viewBox="0 0 80 80">
      <Circle cx="40" cy="40" r={r} stroke={color} strokeWidth="3" fill="none" opacity="0.8" />
      <Circle cx="40" cy="40" r={r * 0.48} stroke={color} strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Hands at cardinal points */}
      <Ellipse cx="40" cy="9"  rx="5" ry="4.5" fill={color} opacity="0.9" />
      <Ellipse cx="40" cy="71" rx="5" ry="4.5" fill={color} opacity="0.9" />
      <Ellipse cx="9"  cy="40" rx="4.5" ry="5" fill={color} opacity="0.9" />
      <Ellipse cx="71" cy="40" rx="4.5" ry="5" fill={color} opacity="0.9" />
      {/* Diagonal */}
      <Ellipse cx="18" cy="18" rx="4" ry="4" fill={color} opacity="0.7" />
      <Ellipse cx="62" cy="18" rx="4" ry="4" fill={color} opacity="0.7" />
      <Ellipse cx="18" cy="62" rx="4" ry="4" fill={color} opacity="0.7" />
      <Ellipse cx="62" cy="62" rx="4" ry="4" fill={color} opacity="0.7" />
    </Svg>
  );
}

// ── Circularity evaluation ────────────────────────────────────────────────

function evaluate(points, config) {
  const { minPoints = 20, closureThreshold = 65, circularityThreshold = 0.58 } = config;

  if (points.length < minPoints) {
    return { pass: false, message: 'Keep drawing — complete the circle!' };
  }

  // Centroid
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  // Radii + circularity
  const radii  = points.map(p => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2));
  const avgR   = radii.reduce((a, b) => a + b, 0) / radii.length;
  const variance = radii.reduce((s, r) => s + (r - avgR) ** 2, 0) / radii.length;
  const stdDev = Math.sqrt(variance);
  const circScore = 1 - stdDev / avgR;

  if (circScore < circularityThreshold) {
    return { pass: false, message: 'Too jagged — try a smoother circle!' };
  }

  // Angular sector coverage (12 × 30° sectors)
  const sectors = new Set(
    points.map(p => {
      const angle = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI;
      return Math.floor(((angle + 360) % 360) / 30);
    })
  );
  if (sectors.size < 10) {
    return { pass: false, message: 'Go all the way around!' };
  }

  // Closure
  const first = points[0];
  const last  = points[points.length - 1];
  const closureDist = Math.sqrt((last.x - first.x) ** 2 + (last.y - first.y) ** 2);
  if (closureDist > closureThreshold) {
    return { pass: false, message: 'Close the loop — finish where you started!' };
  }

  return { pass: true, message: 'Circle complete!' };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function TraceTask({ config, onSuccess, onFail, taskId }) {
  const ringColor  = TASK_RING_COLOR[taskId] || colors.primary.electricBlue;
  const doneRef    = useRef(false);

  const [layout, setLayout]               = useState(null);
  const [drawnPoints, setDrawnPoints]      = useState([]);
  const [status, setStatus]                = useState('idle'); // idle | drawing | success | fail
  const [message, setMessage]              = useState('');

  const pointsRef   = useRef([]);
  const frameCount  = useRef(0);
  const traceColorAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim      = useRef(new Animated.Value(1)).current;

  // Guide circle pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onPanResponderGrant: (evt) => {
        pointsRef.current = [];
        frameCount.current = 0;
        setDrawnPoints([]);
        setStatus('drawing');
        setMessage('');
        const { locationX: x, locationY: y } = evt.nativeEvent;
        pointsRef.current.push({ x, y });
      },
      onPanResponderMove: (evt) => {
        if (doneRef.current) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        pointsRef.current.push({ x, y });
        frameCount.current += 1;
        // Throttle state updates to every 3rd point
        if (frameCount.current % 3 === 0) {
          setDrawnPoints([...pointsRef.current]);
        }
      },
      onPanResponderRelease: () => {
        if (doneRef.current) return;
        // Final flush of remaining points
        setDrawnPoints([...pointsRef.current]);

        const result = evaluate(pointsRef.current, config);
        if (result.pass) {
          doneRef.current = true;
          setStatus('success');
          setMessage(result.message);
          // Animate trace to green
          Animated.timing(traceColorAnim, {
            toValue:  1,
            duration: 400,
            useNativeDriver: false,
          }).start(() => onSuccess());
        } else {
          setStatus('fail');
          setMessage(result.message);
          // Brief red flash then reset
          Animated.sequence([
            Animated.timing(traceColorAnim, { toValue: -1, duration: 200, useNativeDriver: false }),
            Animated.timing(traceColorAnim, { toValue:  0, duration: 400, useNativeDriver: false }),
          ]).start(() => {
            setDrawnPoints([]);
            setStatus('idle');
            setMessage('');
            onFail();
          });
        }
      },
      onPanResponderTerminate: () => {
        if (!doneRef.current) {
          setDrawnPoints([]);
          setStatus('idle');
        }
      },
    })
  ).current;

  // Derive trace stroke color from animation value
  const traceStroke = traceColorAnim.interpolate({
    inputRange:  [-1, 0, 1],
    outputRange: ['#FF3366', ringColor, colors.accent.neonGreen],
  });

  const guideScale = pulseAnim.interpolate({
    inputRange:  [1, 1.04],
    outputRange: ['1', '1.04'],
  });

  const polylinePoints = drawnPoints.length > 1
    ? drawnPoints.map(p => `${p.x},${p.y}`).join(' ')
    : null;

  const instructionText = status === 'success'
    ? message
    : status === 'fail'
    ? message
    : 'Trace a complete circle';

  // Derive layout-dependent positions from measured container
  const guideCY    = layout ? layout.height * 0.45 : 0;
  const textAreaTop = layout ? layout.height * 0.78 : 0;

  return (
    <View
      style={styles.container}
      onLayout={e => setLayout(e.nativeEvent.layout)}
      {...panResponder.panHandlers}
    >
      {layout && (
        <>
          {/* Guide circle — pulsing dashed ring */}
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ scale: pulseAnim }] },
            ]}
            pointerEvents="none"
          >
            <Svg style={StyleSheet.absoluteFill}>
              <Circle
                cx={GUIDE_CX}
                cy={guideCY}
                r={GUIDE_R}
                stroke={ringColor}
                strokeWidth={2}
                strokeDasharray="12,8"
                fill="none"
                opacity={0.35}
              />
            </Svg>
          </Animated.View>

          {/* Center art */}
          <View
            style={[styles.centerArt, { left: GUIDE_CX - 40, top: guideCY - 40 }]}
            pointerEvents="none"
          >
            <PrayerRingSvg color={ringColor} />
          </View>

          {/* Live trace path */}
          {polylinePoints && (
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Polyline
                points={polylinePoints}
                stroke={status === 'success' ? colors.accent.neonGreen : status === 'fail' ? '#FF3366' : ringColor}
                strokeWidth={3.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            </Svg>
          )}

          {/* UI text */}
          <View style={[styles.textArea, { top: textAreaTop }]} pointerEvents="none">
            <Text style={styles.instruction}>{instructionText}</Text>
            {status === 'idle' && (
              <Text style={styles.subText}>Draw with your finger</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
  centerArt: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  instruction: {
    fontFamily: fonts.ui.semiBold,
    fontSize:   16,
    color:      colors.text.secondary,
    textAlign:  'center',
  },
  subText: {
    fontFamily: fonts.ui.regular,
    fontSize:   13,
    color:      colors.text.disabled,
    textAlign:  'center',
    marginTop:  6,
  },
});
