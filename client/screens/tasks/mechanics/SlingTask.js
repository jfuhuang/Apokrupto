import React, { useRef, useState, useEffect } from 'react';
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

const { width: W } = Dimensions.get('window');
const STONE_SIZE = 36;
const ARC_R      = 110;          // radius of the guide ring
const GX         = W / 2;        // Goliath center X
const TARGET_W   = 80;
const TARGET_H   = 140;

const TOLERANCE      = 45;  // how far from ring the finger can be (px)
const TOTAL_SECTORS  = 36;  // ring divided into 36 sectors (10° each)
const REQUIRED_SECTORS = 30; // need 30/36 ≈ 83% coverage to win

// ── Goliath SVG silhouette ───────────────────────────────────────────────

function GoliathSvg({ hit }) {
  const bodyColor  = hit ? colors.accent.neonGreen : '#8B0000';
  const armorColor = hit ? colors.accent.neonGreen : '#555555';
  const spearColor = '#A07820';
  return (
    <Svg width={TARGET_W} height={TARGET_H} viewBox="0 0 80 140">
      <Rect x="26" y="100" width="12" height="36" rx="4" fill={armorColor} />
      <Rect x="42" y="100" width="12" height="36" rx="4" fill={armorColor} />
      <Rect x="24" y="130" width="16" height="10" rx="3" fill="#333" />
      <Rect x="40" y="130" width="16" height="10" rx="3" fill="#333" />
      <Rect x="20" y="55" width="40" height="50" rx="6" fill={armorColor} />
      <Rect x="22" y="58" width="16" height="20" rx="3" fill={bodyColor} opacity="0.6" />
      <Rect x="42" y="58" width="16" height="20" rx="3" fill={bodyColor} opacity="0.6" />
      <Rect x="5"  y="58" width="16" height="35" rx="5" fill={armorColor} />
      <Rect x="59" y="58" width="16" height="35" rx="5" fill={armorColor} />
      <Ellipse cx="20" cy="60" rx="10" ry="8" fill={bodyColor} />
      <Ellipse cx="60" cy="60" rx="10" ry="8" fill={bodyColor} />
      <Rect x="32" y="38" width="16" height="18" rx="4" fill={armorColor} />
      <Ellipse cx="40" cy="30" rx="18" ry="20" fill={bodyColor} />
      <Path d="M28 16 Q40 2 52 16 Q46 10 40 8 Q34 10 28 16Z" fill={bodyColor} opacity="0.8" />
      <Rect x="36" y="2" width="8" height="14" rx="2" fill={bodyColor} />
      <Ellipse cx="33" cy="28" rx="4" ry="4" fill="#1A0000" />
      <Ellipse cx="47" cy="28" rx="4" ry="4" fill="#1A0000" />
      <Rect x="3" y="55" width="3" height="80" rx="1" fill={spearColor} />
      <Polygon points="4.5,55 0,45 9,45" fill="#C0C0C0" />
      <Ellipse cx="68" cy="78" rx="9" ry="14" fill={armorColor} opacity="0.9" />
      <Ellipse cx="68" cy="78" rx="6" ry="10" fill={bodyColor} opacity="0.5" />
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
      <Line x1="9"  y1="14" x2="18" y2="11" stroke="#7A8B9A" strokeWidth="1.2" />
      <Line x1="19" y1="24" x2="28" y2="21" stroke="#7A8B9A" strokeWidth="1.2" />
      <Line x1="10" y1="22" x2="20" y2="25" stroke="#7A8B9A" strokeWidth="1" />
      <Ellipse cx="12" cy="13" rx="4" ry="3" fill="#B8C8D8" opacity="0.6" />
    </Svg>
  );
}

// ── Progress arc path ─────────────────────────────────────────────────────

function buildArcPath(cx, cy, r, progress) {
  if (progress <= 0) return null;
  if (progress >= 1) {
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  }
  const endAngle = 2 * Math.PI * progress;
  const x1 = cx + r;
  const y1 = cy;
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = progress > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// ── Main component ────────────────────────────────────────────────────────

export default function SlingTask({ config, onSuccess }) {
  const [layout,   setLayout]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [hit,      setHit]      = useState(false);
  const [done,     setDone]     = useState(false);

  const visitedRef = useRef(new Set());
  const doneRef    = useRef(false);
  const gYRef      = useRef(0);

  const stoneX = useRef(new Animated.Value(0)).current;
  const stoneY = useRef(new Animated.Value(0)).current;

  // Position stone at ring start once layout is measured
  useEffect(() => {
    if (layout) {
      const gy = layout.height * 0.38;
      gYRef.current = gy;
      stoneX.setValue(GX + ARC_R - STONE_SIZE / 2);
      stoneY.setValue(gy - STONE_SIZE / 2);
    }
  }, [layout]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: () => !doneRef.current,

      onPanResponderMove: (evt) => {
        if (doneRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;

        // Move stone to finger
        stoneX.setValue(locationX - STONE_SIZE / 2);
        stoneY.setValue(locationY - STONE_SIZE / 2);

        // Check proximity to ring
        const gy = gYRef.current;
        const dx = locationX - GX;
        const dy = locationY - gy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(dist - ARC_R) < TOLERANCE) {
          // Compute sector index (0..TOTAL_SECTORS-1)
          const angle = Math.atan2(dy, dx);
          const norm  = (angle + 2 * Math.PI) % (2 * Math.PI); // 0..2π
          const sector = Math.floor((norm / (2 * Math.PI)) * TOTAL_SECTORS) % TOTAL_SECTORS;

          if (!visitedRef.current.has(sector)) {
            visitedRef.current.add(sector);
            const newProgress = Math.min(visitedRef.current.size / REQUIRED_SECTORS, 1);
            setProgress(newProgress);

            if (newProgress >= 1) {
              doneRef.current = true;
              setHit(true);
              setDone(true);
              onSuccess();
            }
          }
        }
      },

      onPanResponderRelease: () => {},
    })
  ).current;

  const gY   = layout ? layout.height * 0.38 : 0;
  const arcD = buildArcPath(GX, gY, ARC_R, progress);

  return (
    <View
      style={styles.container}
      onLayout={e => setLayout(e.nativeEvent.layout)}
      {...panResponder.panHandlers}
    >
      {layout && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Text style={styles.hint}>
            {done ? 'Goliath falls!' : 'Trace the ring around Goliath!'}
          </Text>
          {!done && (
            <Text style={styles.counter}>{Math.round(progress * 100)}%</Text>
          )}

          {/* Guide ring + progress arc */}
          <Svg style={StyleSheet.absoluteFill}>
            <Circle
              cx={GX} cy={gY} r={ARC_R}
              stroke={colors.text.tertiary}
              strokeWidth={1.5}
              strokeDasharray="8,6"
              fill="none"
              opacity={0.3}
            />
            {arcD && (
              <Path
                d={arcD}
                stroke={colors.primary.electricBlue}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            )}
          </Svg>

          {/* Goliath */}
          <View style={{ position: 'absolute', left: GX - TARGET_W / 2, top: gY - TARGET_H / 2 }}>
            <GoliathSvg hit={hit} />
          </View>

          {/* Stone — follows the finger */}
          <Animated.View style={[styles.stone, { left: stoneX, top: stoneY }]}>
            <StoneSvg />
          </Animated.View>
        </View>
      )}
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
