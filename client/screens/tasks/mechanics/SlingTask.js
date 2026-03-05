import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, Line, Polygon, G, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');
const STONE_SIZE = 36;
const ARC_R      = 90;           // radius of the guide ring (shrunk to stay on-screen)
const GX         = W / 2;        // Goliath center X
const TARGET_W   = 80;
const TARGET_H   = 140;

const TOLERANCE      = 45;  // how far from ring the finger can be (px)
const TOTAL_SECTORS  = 36;  // ring divided into 36 sectors (10° each)
const REQUIRED_SECTORS = 30; // need 30/36 ≈ 83% coverage to win

// ── Arid desert hillside background behind Goliath ────────────────────────

function SlingshotBg({ w, h }) {
  const groundY = h * 0.68;
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={w} height={h}>
      <Defs>
        <LinearGradient id="slingSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor="#120810" stopOpacity="1" />
          <Stop offset="0.5" stopColor="#1C0E1A" stopOpacity="1" />
          <Stop offset="1"   stopColor="#2A1A10" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="slingGround" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A2408" stopOpacity="1" />
          <Stop offset="1" stopColor="#1A0E04" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="sunsetGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0"   stopColor="#FF6A00" stopOpacity="0.18" />
          <Stop offset="0.6" stopColor="#CC3300" stopOpacity="0.07" />
          <Stop offset="1"   stopColor="#550000" stopOpacity="0"    />
        </RadialGradient>
      </Defs>

      {/* Sky */}
      <Rect x="0" y="0" width={w} height={groundY} fill="url(#slingSky)" />

      {/* Sunset glow on the horizon */}
      <Ellipse cx={w / 2} cy={groundY} rx={w * 0.55} ry={h * 0.25} fill="url(#sunsetGlow)" />

      {/* Distant ridge / rocky hills */}
      <Path
        d={`M0 ${groundY}
            Q${w*0.10} ${groundY-55} ${w*0.22} ${groundY-30}
            Q${w*0.35} ${groundY-70} ${w*0.50} ${groundY-38}
            Q${w*0.65} ${groundY-62} ${w*0.78} ${groundY-28}
            Q${w*0.90} ${groundY-45} ${w} ${groundY}
            L${w} ${groundY} L0 ${groundY} Z`}
        fill="#2A1608"
      />
      <Path
        d={`M0 ${groundY}
            Q${w*0.15} ${groundY-35} ${w*0.30} ${groundY-18}
            Q${w*0.48} ${groundY-42} ${w*0.62} ${groundY-20}
            Q${w*0.80} ${groundY-32} ${w} ${groundY-10}
            L${w} ${groundY} L0 ${groundY} Z`}
        fill="#3A2010"
      />

      {/* Ground */}
      <Rect x="0" y={groundY} width={w} height={h - groundY} fill="url(#slingGround)" />

      {/* Ground crack lines */}
      <Line x1={w*0.08} y1={groundY+8}  x2={w*0.18} y2={groundY+22} stroke="#1A0A00" strokeWidth="1.2" opacity="0.5" />
      <Line x1={w*0.55} y1={groundY+5}  x2={w*0.70} y2={groundY+18} stroke="#1A0A00" strokeWidth="1"   opacity="0.4" />
      <Line x1={w*0.30} y1={groundY+14} x2={w*0.40} y2={groundY+28} stroke="#1A0A00" strokeWidth="1"   opacity="0.35" />

      {/* Scattered rocks */}
      <Ellipse cx={w*0.12} cy={groundY+18} rx="10" ry="7" fill="#2A1A08" />
      <Ellipse cx={w*0.85} cy={groundY+22} rx="14" ry="9" fill="#251608" />
      <Ellipse cx={w*0.45} cy={groundY+30} rx="8"  ry="5" fill="#2A1A08" />

      {/* Distant Philistine army silhouette — row of tiny figures on the ridge */}
      {[0.08, 0.16, 0.22, 0.30, 0.38, 0.62, 0.70, 0.78, 0.85, 0.92].map((fx, i) => (
        <G key={i}>
          <Rect x={w*fx - 2} y={groundY - 45} width="5" height="18" rx="2" fill="#1A0A04" opacity="0.6" />
          <Circle cx={w*fx}  cy={groundY - 49} r="4"                       fill="#1A0A04" opacity="0.6" />
          {/* Tiny spear */}
          <Line x1={w*fx + 3} y1={groundY - 60} x2={w*fx + 3} y2={groundY - 28} stroke="#3A2410" strokeWidth="1.5" opacity="0.5" />
        </G>
      ))}
    </Svg>
  );
}

// ── Goliath SVG — fully armored Philistine giant ─────────────────────────

function GoliathSvg({ hit }) {
  const skin  = hit ? '#88FF88' : '#6B3A1A';
  const armor = hit ? '#44BB44' : '#4A4030';
  const shine = hit ? '#AAFFAA' : '#8A7850';
  const dark  = hit ? '#228822' : '#1A1408';

  return (
    <Svg width={TARGET_W} height={TARGET_H} viewBox="0 0 80 140">

      {/* Spear — behind body */}
      <Rect  x="6"  y="10" width="4"  height="118" rx="2" fill="#7A5018" />
      <Line  x1="7" y1="10" x2="9" y2="10" stroke="#A07028" strokeWidth="1.5" opacity="0.6" />
      {/* Spearhead */}
      <Polygon points="8,10 4,1 12,1" fill="#C8C0A0" />
      <Rect x="5" y="9" width="6" height="4" rx="1" fill="#8B7030" />
      {/* Spear butt cap */}
      <Ellipse cx="8" cy="128" rx="3" ry="2" fill="#5A3A10" />

      {/* ── Legs ── */}
      {/* Greaves (lower leg armor) */}
      <Rect x="24" y="100" width="13" height="34" rx="4" fill={armor} />
      <Rect x="43" y="100" width="13" height="34" rx="4" fill={armor} />
      {/* Greave sheen */}
      <Rect x="25" y="101" width="4"  height="32" rx="2" fill={shine} opacity="0.22" />
      <Rect x="44" y="101" width="4"  height="32" rx="2" fill={shine} opacity="0.22" />
      {/* Sandals */}
      <Rect x="22" y="131" width="17" height="8" rx="3" fill={dark} />
      <Rect x="41" y="131" width="17" height="8" rx="3" fill={dark} />
      <Line x1="26" y1="131" x2="26" y2="139" stroke={shine} strokeWidth="1" opacity="0.35" />
      <Line x1="45" y1="131" x2="45" y2="139" stroke={shine} strokeWidth="1" opacity="0.35" />
      {/* Knee guards */}
      <Ellipse cx="30" cy="102" rx="7" ry="5" fill={shine} opacity="0.55" />
      <Ellipse cx="49" cy="102" rx="7" ry="5" fill={shine} opacity="0.55" />

      {/* ── Torso armor — scale mail breastplate ── */}
      <Rect x="21" y="55" width="38" height="47" rx="5" fill={armor} />
      {/* Scale rows */}
      {[0, 1, 2, 3, 4].map(row => (
        [0, 1, 2, 3].map(col => {
          const ox = 24 + col * 9 + (row % 2) * 4.5;
          const oy = 60 + row * 8;
          return <Path key={`${row}-${col}`} d={`M${ox} ${oy} Q${ox+4} ${oy} ${ox+4} ${oy+5} Q${ox+4} ${oy+8} ${ox+2} ${oy+8} Q${ox} ${oy+8} ${ox} ${oy+5} Q${ox} ${oy} ${ox} ${oy}Z`} fill={shine} opacity="0.30" />;
        })
      ))}
      {/* Breastplate edge highlight */}
      <Path d="M21 60 Q21 55 26 55 L54 55 Q59 55 59 60" stroke={shine} strokeWidth="1.5" fill="none" opacity="0.50" />

      {/* ── Shield — large oval on left arm ── */}
      <Ellipse cx="15" cy="75" rx="12" ry="28" fill={armor} />
      <Ellipse cx="15" cy="75" rx="9"  ry="22" fill={skin}  opacity="0.25" />
      {/* Shield boss (center boss) */}
      <Circle  cx="15" cy="75" r="5"   fill={shine} opacity="0.70" />
      <Circle  cx="15" cy="75" r="2.5" fill="#E0D090" opacity="0.85" />
      {/* Shield rim */}
      <Ellipse cx="15" cy="75" rx="12" ry="28" fill="none" stroke={shine} strokeWidth="1.5" opacity="0.40" />

      {/* ── Arms ── */}
      {/* Left arm (behind shield) */}
      <Rect x="17" y="60" width="10" height="30" rx="5" fill={skin} />
      {/* Right arm — raised, holding spear */}
      <Rect x="57" y="55" width="11" height="36" rx="5" fill={skin} />
      {/* Right hand gripping spear */}
      <Ellipse cx="61" cy="58" rx="6" ry="5" fill={skin} opacity="0.85" />
      {/* Pauldrons (shoulder guards) */}
      <Ellipse cx="25" cy="57" rx="9" ry="6" fill={shine} opacity="0.60" />
      <Ellipse cx="55" cy="57" rx="9" ry="6" fill={shine} opacity="0.60" />

      {/* ── Neck ── */}
      <Rect x="33" y="40" width="14" height="16" rx="4" fill={skin} />

      {/* ── Head — Philistine feathered helmet ── */}
      <Ellipse cx="40" cy="30" rx="17" ry="18" fill={skin} />
      {/* Helmet cheek guards */}
      <Path d="M23 30 Q21 40 24 46" stroke={armor} strokeWidth="6" fill="none" strokeLinecap="round" />
      <Path d="M57 30 Q59 40 56 46" stroke={armor} strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Helmet cap */}
      <Path d="M23 28 Q23 10 40 7 Q57 10 57 28Z" fill={armor} />
      {/* Helmet sheen */}
      <Path d="M27 24 Q27 13 40 11 Q46 12 50 18" stroke={shine} strokeWidth="1.5" fill="none" opacity="0.45" strokeLinecap="round" />
      {/* Feathered plume — Philistine crests */}
      {[-6, -2, 2, 6].map((ox, i) => (
        <Path key={i} d={`M${40 + ox} 7 C${38 + ox} 0 ${40 + ox - 2} -4 ${40 + ox} -6 C${40 + ox + 2} -4 ${42 + ox} 0 ${40 + ox} 7Z`}
          fill="#A02020" opacity={0.7 - i * 0.05} />
      ))}
      {/* Face */}
      <Ellipse cx="40" cy="32" rx="12" ry="14" fill={skin} />
      {/* Brow ridge shadow */}
      <Path d="M28 26 Q40 22 52 26" fill={dark} opacity="0.25" />
      {/* Deep-set eyes */}
      <Ellipse cx="34" cy="28" rx="4" ry="3.5" fill={dark} />
      <Ellipse cx="46" cy="28" rx="4" ry="3.5" fill={dark} />
      <Circle  cx="34" cy="28" r="2.2"         fill="#3A0000" />
      <Circle  cx="46" cy="28" r="2.2"         fill="#3A0000" />
      <Circle  cx="35" cy="27" r="0.9"         fill="#FF2020" opacity="0.55" />
      <Circle  cx="47" cy="27" r="0.9"         fill="#FF2020" opacity="0.55" />
      {/* Nose & mouth */}
      <Path d="M38 32 Q40 35 42 32" stroke={dark} strokeWidth="1.2" fill="none" opacity="0.6" />
      <Path d="M35 37 Q40 40 45 37" stroke={dark} strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
      {/* Beard */}
      <Path d="M28 38 Q28 46 40 47 Q52 46 52 38" fill={dark} opacity="0.55" />
      <Path d="M30 42 Q40 48 50 42" stroke={dark} strokeWidth="0.8" fill="none" opacity="0.35" />

      {/* Hit flash — lightning bolt */}
      {hit && (
        <Path d="M15 8 L22 18 L17 18 L26 32 L20 32 L30 46" stroke="#FFE082" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
  const layoutRef  = useRef({ width: W, height: 400 });

  const stoneX = useRef(new Animated.Value(0)).current;
  const stoneY = useRef(new Animated.Value(0)).current;

  // Position stone at ring start once layout is measured
  useEffect(() => {
    if (layout) {
      layoutRef.current = { width: layout.width, height: layout.height };
      const gy = layout.height * 0.52;
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
        const { width: lw, height: lh } = layoutRef.current;
        // Clamp to view bounds to prevent jump-to-origin when finger leaves the view
        const locationX = Math.max(0, Math.min(evt.nativeEvent.locationX, lw));
        const locationY = Math.max(0, Math.min(evt.nativeEvent.locationY, lh));

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

  const gY   = layout ? layout.height * 0.52 : 0;
  const arcD = buildArcPath(GX, gY, ARC_R, progress);

  return (
    <TaskContainer
      scrollable={false} centered={false} padded={false}
      style={{ backgroundColor: colors.background.space }}
      onLayout={e => setLayout(e.nativeEvent.layout)}
      {...panResponder.panHandlers}
    >
      {layout && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Atmospheric desert battle background */}
          <SlingshotBg w={layout.width} h={layout.height} />
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
            {/* Clockwise direction arrow at 12-o'clock */}
            {!done && (
              <G transform={`translate(${GX}, ${gY - ARC_R}) rotate(90)`}>
                <Polygon
                  points="-6,-5 6,0 -6,5"
                  fill={colors.text.tertiary}
                  opacity={0.6}
                />
              </G>
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
    </TaskContainer>
  );
}

const styles = StyleSheet.create({
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
