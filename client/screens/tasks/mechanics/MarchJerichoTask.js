import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');

const WALL_R        = 80;   // city wall visual radius
const ORBIT_R       = 125;  // ring the player traces
const TOLERANCE     = 55;   // px tolerance from orbit ring
const LAPS_REQUIRED = 7;
const TWO_PI        = Math.PI * 2;
const MARCHER_W     = 24;
const MARCHER_H     = 32;

// ── Jericho city wall (bird's-eye view) ───────────────────────────────────

function JerichoWallSvg({ collapsed }) {
  const wallColor  = collapsed ? colors.accent.neonGreen : '#8B7355';
  const innerColor = collapsed ? '#1A3A1A'                : '#C4A35A';
  const towerColor = collapsed ? colors.accent.neonGreen : '#6B5232';

  return (
    <Svg width={WALL_R * 2} height={WALL_R * 2} viewBox="-80 -80 160 160">
      {/* City ground */}
      <Circle cx={0} cy={0} r={58} fill={innerColor} />

      {/* Dirt roads */}
      <Line x1={-40} y1={0} x2={40} y2={0} stroke={wallColor} strokeWidth={3} opacity={0.3} />
      <Line x1={0} y1={-40} x2={0} y2={40} stroke={wallColor} strokeWidth={3} opacity={0.3} />

      {/* Interior buildings */}
      {[[-28, -28], [10, -28], [-28, 10], [10, 10]].map(([x, y], i) => (
        <Rect key={i} x={x} y={y} width={18} height={18} rx={2} fill={towerColor} opacity={0.5} />
      ))}

      {/* Outer stone wall ring */}
      <Circle cx={0} cy={0} r={70} fill={wallColor} />
      <Circle cx={0} cy={0} r={58} fill={innerColor} />

      {/* Corner towers at 8 positions */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <Rect
            key={deg}
            x={Math.cos(rad) * 65 - 7}
            y={Math.sin(rad) * 65 - 7}
            width={14}
            height={14}
            rx={2}
            fill={towerColor}
            stroke={collapsed ? colors.accent.neonGreen : '#3A2A10'}
            strokeWidth={1}
          />
        );
      })}

      {/* Gate (south side) */}
      <Rect x={-8} y={58} width={16} height={14} rx={2} fill={'#2A1A08'} />
    </Svg>
  );
}

// ── Simple marcher figure ─────────────────────────────────────────────────

function MarcherSvg() {
  return (
    <Svg width={MARCHER_W} height={MARCHER_H} viewBox="0 0 24 32">
      <Circle cx={12} cy={5} r={4} fill={colors.accent.amber} />
      <Line x1={12} y1={9}  x2={12} y2={22} stroke={colors.accent.amber} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={5}  y1={14} x2={19} y2={14} stroke={colors.accent.amber} strokeWidth={2}   strokeLinecap="round" />
      <Line x1={12} y1={22} x2={6}  y2={31} stroke={colors.accent.amber} strokeWidth={2}   strokeLinecap="round" />
      <Line x1={12} y1={22} x2={18} y2={31} stroke={colors.accent.amber} strokeWidth={2}   strokeLinecap="round" />
    </Svg>
  );
}

// ── Arc path: clockwise from startAngle, covering `progress` of the circle ─

function buildArcPath(cx, cy, r, startAngle, progress) {
  if (progress <= 0) return null;

  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);

  if (progress >= 1) {
    // Full circle via two half-arcs
    const mx = cx - r * Math.cos(startAngle);
    const my = cy - r * Math.sin(startAngle);
    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${mx} ${my} A ${r} ${r} 0 1 1 ${x1} ${y1}`;
  }

  const endAngle  = startAngle + TWO_PI * progress;
  const x2        = cx + r * Math.cos(endAngle);
  const y2        = cy + r * Math.sin(endAngle);
  const largeArc  = progress > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ── Main component ────────────────────────────────────────────────────────

export default function MarchJerichoTask({ onSuccess }) {
  const [laps,            setLaps]            = useState(0);
  const [partialProgress, setPartialProgress] = useState(0);
  const [done,            setDone]            = useState(false);
  const [onRing,          setOnRing]          = useState(false);
  const [centerXY,        setCenterXY]        = useState({ cx: W / 2, cy: 200 });

  const doneRef       = useRef(false);
  const totalAngleRef = useRef(0);
  const prevAngleRef  = useRef(null);
  const layoutRef     = useRef({ width: W, height: 400 });

  const marcherX = useRef(new Animated.Value(W / 2 + ORBIT_R - MARCHER_W / 2)).current;
  const marcherY = useRef(new Animated.Value(200             - MARCHER_H / 2)).current;

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    layoutRef.current = { width, height };
    const cx = width / 2;
    const cy = height * 0.45;
    setCenterXY({ cx, cy });
    marcherX.setValue(cx + ORBIT_R - MARCHER_W / 2);
    marcherY.setValue(cy           - MARCHER_H / 2);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder:  () => !doneRef.current,

      onPanResponderGrant: (evt) => {
        if (doneRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = layoutRef.current;
        prevAngleRef.current = Math.atan2(locationY - height * 0.45, locationX - width / 2);
      },

      onPanResponderMove: (evt) => {
        if (doneRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = layoutRef.current;
        const cx = width / 2;
        const cy = height * 0.45;

        const dx   = locationX - cx;
        const dy   = locationY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Move marcher to finger
        marcherX.setValue(locationX - MARCHER_W / 2);
        marcherY.setValue(locationY - MARCHER_H / 2);

        const nearRing     = Math.abs(dist - ORBIT_R) < TOLERANCE;
        const currentAngle = Math.atan2(dy, dx);

        setOnRing(nearRing);

        if (!nearRing) {
          // Keep tracking angle so resuming on the ring doesn't jump
          prevAngleRef.current = currentAngle;
          return;
        }

        if (prevAngleRef.current === null) {
          prevAngleRef.current = currentAngle;
          return;
        }

        // Angular delta normalized to [-π, π]; clockwise = positive
        let delta = currentAngle - prevAngleRef.current;
        if (delta >  Math.PI) delta -= TWO_PI;
        if (delta < -Math.PI) delta += TWO_PI;

        totalAngleRef.current = Math.max(0, totalAngleRef.current + delta);
        prevAngleRef.current  = currentAngle;

        const newLaps = Math.floor(totalAngleRef.current / TWO_PI);
        const partial = (totalAngleRef.current % TWO_PI) / TWO_PI;

        setLaps(Math.min(newLaps, LAPS_REQUIRED));
        setPartialProgress(partial);

        if (totalAngleRef.current >= LAPS_REQUIRED * TWO_PI && !doneRef.current) {
          doneRef.current = true;
          setDone(true);
          onSuccess();
        }
      },

      onPanResponderRelease: () => {
        prevAngleRef.current = null;
        setOnRing(false);
      },
    })
  ).current;

  const { cx, cy } = centerXY;
  const arcD = buildArcPath(cx, cy, ORBIT_R, -Math.PI / 2, partialProgress);

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} style={{ backgroundColor: colors.background.space }} onLayout={handleLayout} {...panResponder.panHandlers}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">

        {/* Instruction */}
        <Text style={styles.hint}>
          {done ? 'The walls fall!' : 'March around Jericho 7 times!'}
        </Text>

        {/* Lap progress dots */}
        <View style={styles.lapRow}>
          {Array.from({ length: LAPS_REQUIRED }).map((_, i) => (
            <View key={i} style={[styles.lapDot, i < laps && styles.lapDotFilled]} />
          ))}
        </View>

        {/* Lap counter */}
        {!done && (
          <Text style={styles.lapCounter}>
            {`LAP ${Math.min(laps + 1, LAPS_REQUIRED)} / ${LAPS_REQUIRED}`}
          </Text>
        )}

        {/* SVG: orbit guide ring + progress arc */}
        <Svg style={StyleSheet.absoluteFill}>
          <Circle
            cx={cx}
            cy={cy}
            r={ORBIT_R}
            stroke={onRing ? colors.accent.amber : colors.text.tertiary}
            strokeWidth={onRing ? 2 : 1.5}
            strokeDasharray="10,8"
            fill="none"
            opacity={onRing ? 0.8 : 0.3}
          />
          {arcD && (
            <Path
              d={arcD}
              stroke={colors.primary.electricBlue}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
            />
          )}
        </Svg>

        {/* City wall */}
        <View style={{ position: 'absolute', left: cx - WALL_R, top: cy - WALL_R }}>
          <JerichoWallSvg collapsed={done} />
        </View>

        {/* Marcher follows the finger */}
        <Animated.View style={[styles.marcher, { left: marcherX, top: marcherY }]}>
          <MarcherSvg />
        </Animated.View>

      </View>
    </TaskContainer>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 10,
  },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  lapDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.text.disabled,
    backgroundColor: 'transparent',
  },
  lapDotFilled: {
    backgroundColor: colors.primary.electricBlue,
    borderColor: colors.primary.electricBlue,
  },
  lapCounter: {
    fontFamily: fonts.accent.bold,
    fontSize: 18,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  marcher: {
    position: 'absolute',
    width: MARCHER_W,
    height: MARCHER_H,
  },
});
