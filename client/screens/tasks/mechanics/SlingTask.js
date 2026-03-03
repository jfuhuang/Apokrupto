import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, Line, Polygon } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const STONE_SIZE = 36;
const ORBIT_R    = 90;           // initial distance from Goliath center to stone
const ARC_R      = 110;          // radius of the visual orbit guide ring
const GX         = W / 2;        // Goliath center X (view-relative)
const GY         = H * 0.38;     // Goliath center Y (view-relative)
const TARGET_W   = 80;
const TARGET_H   = 140;

// Stone starts to the right of Goliath
const STONE_START_X = GX + ORBIT_R - STONE_SIZE / 2;
const STONE_START_Y = GY - STONE_SIZE / 2;

// ── Goliath SVG silhouette ───────────────────────────────────────────────

function GoliathSvg({ hit }) {
  const bodyColor  = hit ? colors.accent.neonGreen : '#8B0000';
  const armorColor = hit ? colors.accent.neonGreen : '#555555';
  const spearColor = '#A07820';
  return (
    <Svg width={TARGET_W} height={TARGET_H} viewBox="0 0 80 140">
      {/* Legs */}
      <Rect x="26" y="100" width="12" height="36" rx="4" fill={armorColor} />
      <Rect x="42" y="100" width="12" height="36" rx="4" fill={armorColor} />
      {/* Boots */}
      <Rect x="24" y="130" width="16" height="10" rx="3" fill="#333" />
      <Rect x="40" y="130" width="16" height="10" rx="3" fill="#333" />
      {/* Body / Armor */}
      <Rect x="20" y="55" width="40" height="50" rx="6" fill={armorColor} />
      {/* Chest plates */}
      <Rect x="22" y="58" width="16" height="20" rx="3" fill={bodyColor} opacity="0.6" />
      <Rect x="42" y="58" width="16" height="20" rx="3" fill={bodyColor} opacity="0.6" />
      {/* Arms */}
      <Rect x="5"  y="58" width="16" height="35" rx="5" fill={armorColor} />
      <Rect x="59" y="58" width="16" height="35" rx="5" fill={armorColor} />
      {/* Shoulders */}
      <Ellipse cx="20" cy="60" rx="10" ry="8" fill={bodyColor} />
      <Ellipse cx="60" cy="60" rx="10" ry="8" fill={bodyColor} />
      {/* Neck */}
      <Rect x="32" y="38" width="16" height="18" rx="4" fill={armorColor} />
      {/* Head */}
      <Ellipse cx="40" cy="30" rx="18" ry="20" fill={bodyColor} />
      {/* Helmet crest */}
      <Path d="M28 16 Q40 2 52 16 Q46 10 40 8 Q34 10 28 16Z" fill={bodyColor} opacity="0.8" />
      <Rect x="36" y="2" width="8" height="14" rx="2" fill={bodyColor} />
      {/* Eyes */}
      <Ellipse cx="33" cy="28" rx="4" ry="4" fill="#1A0000" />
      <Ellipse cx="47" cy="28" rx="4" ry="4" fill="#1A0000" />
      {/* Spear — held in right hand */}
      <Rect x="3" y="55" width="3" height="80" rx="1" fill={spearColor} />
      <Polygon points="4.5,55 0,45 9,45" fill="#C0C0C0" />
      {/* Shield — on left arm */}
      <Ellipse cx="68" cy="78" rx="9" ry="14" fill={armorColor} opacity="0.9" />
      <Ellipse cx="68" cy="78" rx="6" ry="10" fill={bodyColor} opacity="0.5" />
      {/* Hit flash */}
      {hit && (
        <Path d="M10 10 L30 5 L20 20 L40 15 L25 30 L50 22" stroke="#FFE082" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}

// ── Stone SVG ─────────────────────────────────────────────────────────────

function StoneSvg() {
  return (
    <Svg width={STONE_SIZE} height={STONE_SIZE} viewBox="0 0 36 36">
      <Ellipse cx="18" cy="18" rx="15" ry="13" fill="#8B9CB0" />
      <Ellipse cx="18" cy="18" rx="14" ry="12" fill="#9AACC0" />
      {/* Surface texture lines */}
      <Line x1="9"  y1="14" x2="18" y2="11" stroke="#7A8B9A" strokeWidth="1.2" />
      <Line x1="19" y1="24" x2="28" y2="21" stroke="#7A8B9A" strokeWidth="1.2" />
      <Line x1="10" y1="22" x2="20" y2="25" stroke="#7A8B9A" strokeWidth="1" />
      {/* Highlight */}
      <Ellipse cx="12" cy="13" rx="4" ry="3" fill="#B8C8D8" opacity="0.6" />
    </Svg>
  );
}

// ── Progress arc path ─────────────────────────────────────────────────────

function buildArcPath(cx, cy, r, progress) {
  if (progress <= 0) return null;
  if (progress >= 1) {
    // Full circle — drawn as two semicircles since SVG can't arc 360°
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  }
  const startAngle = 0; // starts at the 3 o'clock position (where stone begins)
  const endAngle   = 2 * Math.PI * progress;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = progress > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ── Main component ────────────────────────────────────────────────────────

export default function SlingTask({ config, onSuccess }) {
  const { circles } = config;

  const [progress, setProgress] = useState(0);
  const [hit,      setHit]      = useState(false);
  const [done,     setDone]     = useState(false);

  // Cumulative stone displacement across multiple touch gestures
  const cumulDxRef    = useRef(0);
  const cumulDyRef    = useRef(0);
  // Angle tracking
  const prevAngleRef  = useRef(Math.atan2(0, ORBIT_R)); // = 0 (pointing right)
  const totalAngleRef = useRef(0);
  const doneRef       = useRef(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,

      onPanResponderGrant: () => {
        // Anchor pan offset to current accumulated stone position
        pan.setOffset({ x: cumulDxRef.current, y: cumulDyRef.current });
        pan.setValue({ x: 0, y: 0 });
        // Re-seed the previous angle from the stone's current resting position
        const relX = ORBIT_R + cumulDxRef.current;
        const relY = cumulDyRef.current;
        prevAngleRef.current = Math.atan2(relY, relX);
      },

      onPanResponderMove: (_, g) => {
        if (doneRef.current) return;

        pan.setValue({ x: g.dx, y: g.dy });

        // Stone center relative to Goliath
        const relX = ORBIT_R + cumulDxRef.current + g.dx;
        const relY = cumulDyRef.current + g.dy;

        // Skip angle update if stone is too close to center (prevents atan2 instability)
        if (Math.sqrt(relX * relX + relY * relY) < 15) return;

        const currentAngle = Math.atan2(relY, relX);
        let delta = currentAngle - prevAngleRef.current;
        // Normalise delta to (-π, π] to handle wrap-around
        if (delta >  Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        totalAngleRef.current += delta;
        prevAngleRef.current = currentAngle;

        const newProgress = Math.min(
          Math.abs(totalAngleRef.current) / (2 * Math.PI * circles),
          1,
        );
        setProgress(newProgress);

        if (newProgress >= 1) {
          doneRef.current = true;
          setHit(true);
          setDone(true);
          onSuccess();
        }
      },

      onPanResponderRelease: (_, g) => {
        // Commit current gesture displacement into cumulative offset
        cumulDxRef.current += g.dx;
        cumulDyRef.current += g.dy;
        pan.flattenOffset();
      },
    })
  ).current;

  const arcD             = buildArcPath(GX, GY, ARC_R, progress);
  const completedCircles = Math.floor(progress * circles);

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {done ? 'Goliath falls!' : 'Circle the stone around Goliath!'}
      </Text>
      {!done && (
        <Text style={styles.counter}>{completedCircles} / {circles} circles</Text>
      )}

      {/* Orbit guide ring + progress arc */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle
          cx={GX}
          cy={GY}
          r={ARC_R}
          stroke={colors.text.tertiary}
          strokeWidth={1}
          strokeDasharray="8,6"
          fill="none"
          opacity={0.3}
        />
        {arcD ? (
          <Path
            d={arcD}
            stroke={colors.primary.electricBlue}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}
      </Svg>

      {/* Goliath */}
      <View style={{ position: 'absolute', left: GX - TARGET_W / 2, top: GY - TARGET_H / 2 }}>
        <GoliathSvg hit={hit} />
      </View>

      {/* Stone — follows the finger */}
      <Animated.View
        style={[styles.stone, { left: STONE_START_X, top: STONE_START_Y }, pan.getLayout()]}
        {...panResponder.panHandlers}
      >
        <StoneSvg />
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
  counter: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    marginTop: 6,
  },
  stone: {
    position: 'absolute',
    width: STONE_SIZE,
    height: STONE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
