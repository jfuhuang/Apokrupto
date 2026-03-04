import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Polygon,
  Rect,
  Line,
  Path,
  G,
} from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');
const ENEMY_SIZE    = 56;
const SPAWN_INTERVAL = 1000;
const ENEMY_DURATION = 5000;
const CENTER_X = W / 2 - ENEMY_SIZE / 2;

let _id = 0;

function makeEnemy(centerY, areaH) {
  const side = Math.floor(Math.random() * 4);
  let sx, sy;
  if (side === 0) { sx = Math.random() * W; sy = -ENEMY_SIZE; }
  else if (side === 1) { sx = W + ENEMY_SIZE; sy = Math.random() * centerY; }
  else if (side === 2) { sx = Math.random() * W; sy = areaH; }
  else { sx = -ENEMY_SIZE; sy = Math.random() * centerY; }
  return { id: ++_id, sx, sy, pan: new Animated.ValueXY({ x: sx, y: sy }), anim: null };
}

// ── Wolf SVG silhouette ─────────────────────────────────────────────────

function WolfSvg() {
  return (
    <Svg width={ENEMY_SIZE} height={ENEMY_SIZE} viewBox="0 0 56 56">
      <G>
        {/* Body */}
        <Ellipse cx="28" cy="36" rx="16" ry="11" fill="#555" />
        {/* Head */}
        <Ellipse cx="28" cy="20" rx="11" ry="10" fill="#555" />
        {/* Pointed ears */}
        <Polygon points="19,14 14,4 24,10" fill="#555" />
        <Polygon points="37,14 42,4 32,10" fill="#555" />
        {/* Inner ears */}
        <Polygon points="20,13 16,7 24,10" fill="#FF3366" opacity="0.6" />
        <Polygon points="36,13 40,7 32,10" fill="#FF3366" opacity="0.6" />
        {/* Eyes - glowing red */}
        <Circle cx="23" cy="18" r="2.5" fill="#FF3366" />
        <Circle cx="33" cy="18" r="2.5" fill="#FF3366" />
        <Circle cx="23" cy="18" r="1"   fill="#FF0000" />
        <Circle cx="33" cy="18" r="1"   fill="#FF0000" />
        {/* Snout */}
        <Ellipse cx="28" cy="25" rx="7" ry="5" fill="#444" />
        {/* Nose */}
        <Ellipse cx="28" cy="23" rx="3" ry="2" fill="#222" />
        {/* Tail */}
        <Path d="M44 36 Q52 28 50 20" stroke="#555" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Legs */}
        <Rect x="16" y="45" width="7" height="10" rx="3" fill="#555" />
        <Rect x="33" y="45" width="7" height="10" rx="3" fill="#555" />
      </G>
    </Svg>
  );
}

// ── Soldier SVG (for pillar_of_fire) — Egyptian warrior ──────────────────

function SoldierSvg() {
  return (
    <Svg width={ENEMY_SIZE} height={ENEMY_SIZE} viewBox="0 0 56 56">
      <G>
        {/* Dark cape/cloak behind body — gives silhouette width */}
        <Path d="M24 24 Q15 33 14 56 L21 56 Q22 38 28 30Z" fill="#1A0900" opacity="0.85" />
        <Path d="M32 24 Q41 33 42 56 L35 56 Q34 38 28 30Z" fill="#1A0900" opacity="0.85" />
        {/* Legs */}
        <Rect x="19" y="42" width="8"  height="14" rx="3" fill="#2A1200" />
        <Rect x="29" y="42" width="8"  height="14" rx="3" fill="#2A1200" />
        {/* Body armor / breastplate */}
        <Rect x="19" y="24" width="18" height="20" rx="3" fill="#3A1E0A" />
        {/* Bronze scale-armour detail lines */}
        <Line x1="22" y1="29" x2="34" y2="29" stroke="#6B3A00" strokeWidth="1" opacity="0.6" />
        <Line x1="22" y1="34" x2="34" y2="34" stroke="#6B3A00" strokeWidth="1" opacity="0.6" />
        <Line x1="22" y1="39" x2="34" y2="39" stroke="#6B3A00" strokeWidth="1" opacity="0.6" />
        {/* Left arm */}
        <Rect x="8"  y="27" width="12" height="5" rx="2.5" fill="#3A1E0A" />
        {/* Shield on left arm */}
        <Rect x="4"  y="20" width="9"  height="17" rx="3" fill="#5C3A00" />
        <Ellipse cx="8.5" cy="28.5" rx="3.2" ry="6.5" fill="#8B6000" opacity="0.65" />
        <Circle  cx="8.5" cy="28.5" r="1.6"              fill="#CFB200" opacity="0.85" />
        {/* Right arm */}
        <Rect x="36" y="27" width="12" height="5" rx="2.5" fill="#3A1E0A" />
        {/* Neck */}
        <Rect x="24" y="18" width="8"  height="7"  rx="2" fill="#3A1E0A" />
        {/* Head */}
        <Ellipse cx="28" cy="13" rx="9" ry="10" fill="#3A1E0A" />
        {/* Khepresh helmet shape */}
        <Path d="M20 10 Q19 4 28 3 Q37 4 36 10 L34 10 Q33 6 28 5 Q23 6 22 10Z" fill="#1A0900" />
        <Rect x="23" y="3" width="10" height="7" rx="3" fill="#1A0900" />
        <Line x1="23" y1="3" x2="33" y2="3" stroke="#6B3A00" strokeWidth="1.5" opacity="0.45" />
        {/* Glowing ember eyes */}
        <Ellipse cx="24" cy="12" rx="2.5" ry="2" fill="#FF6A00" />
        <Ellipse cx="32" cy="12" rx="2.5" ry="2" fill="#FF6A00" />
        <Circle  cx="24" cy="12" r="1"          fill="#FFD700" opacity="0.9" />
        <Circle  cx="32" cy="12" r="1"          fill="#FFD700" opacity="0.9" />
        {/* Spear shaft */}
        <Rect x="45" y="7" width="3" height="46" rx="1.5" fill="#7A5C22" />
        {/* Spearhead */}
        <Path d="M44.5 7 L46.5 1 L48.5 7Z" fill="#D4D4D4" />
        <Rect  x="44"  y="7"  width="5"  height="3" rx="1" fill="#9B7A2A" />
      </G>
    </Svg>
  );
}

// ── Sheep pen SVG (static background) ────────────────────────────────────

function SheepPenBg({ areaH }) {
  const penTop    = areaH * 0.32;
  const penBottom = areaH * 0.52;
  const postCount = Math.ceil(W / 35);

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      {/* Green pasture */}
      <Rect x="0" y={penTop} width={W} height={penBottom - penTop} fill="#1A3A1A" opacity="0.6" />
      {/* Fence posts */}
      {Array.from({ length: postCount }).map((_, i) => (
        <Rect key={i} x={i * 35} y={penTop - 14} width="6" height={28} rx="2" fill="#8B6914" />
      ))}
      {/* Two horizontal rails */}
      <Line x1="0" y1={penTop + 4}  x2={W} y2={penTop + 4}  stroke="#8B6914" strokeWidth="3" />
      <Line x1="0" y1={penTop + 12} x2={W} y2={penTop + 12} stroke="#8B6914" strokeWidth="2" />
      {/* Fluffy sheep inside pen */}
      {/* Sheep 1 */}
      <Circle cx={W * 0.25}      cy={penTop + 28} r="14" fill="#E8E8E8" />
      <Circle cx={W * 0.25 + 10} cy={penTop + 28} r="14" fill="#E8E8E8" />
      <Circle cx={W * 0.25 + 5}  cy={penTop + 16} r="11" fill="#E8E8E8" />
      <Ellipse cx={W * 0.25 + 17} cy={penTop + 12} rx="7" ry="6" fill="#DCDCDC" />
      <Circle  cx={W * 0.25 + 20} cy={penTop + 9}  r="1.5" fill="#555" />
      {/* Sheep 2 */}
      <Circle cx={W * 0.65}      cy={penTop + 28} r="14" fill="#E8E8E8" />
      <Circle cx={W * 0.65 + 10} cy={penTop + 28} r="14" fill="#E8E8E8" />
      <Circle cx={W * 0.65 + 5}  cy={penTop + 16} r="11" fill="#E8E8E8" />
      <Ellipse cx={W * 0.65 + 17} cy={penTop + 12} rx="7" ry="6" fill="#DCDCDC" />
      <Circle  cx={W * 0.65 + 20} cy={penTop + 9}  r="1.5" fill="#555" />
    </Svg>
  );
}

// ── Star positions (fraction of width × height) ──────────────────────────
const STARS = [
  [0.05, 0.04], [0.14, 0.02], [0.27, 0.09], [0.41, 0.03],
  [0.58, 0.07], [0.69, 0.02], [0.81, 0.08], [0.93, 0.05],
  [0.08, 0.17], [0.34, 0.14], [0.54, 0.19], [0.74, 0.13],
  [0.89, 0.22], [0.19, 0.26], [0.47, 0.24], [0.63, 0.28],
  [0.84, 0.21], [0.11, 0.33], [0.40, 0.31], [0.77, 0.30],
];

// ── Camp tent positions (fraction of width) ───────────────────────────────
const TENTS = [
  { fx: 0.08, w: 24, h: 20 },
  { fx: 0.18, w: 30, h: 25 },
  { fx: 0.78, w: 28, h: 22 },
  { fx: 0.90, w: 22, h: 18 },
];

// ── Pillar of fire background — full nighttime desert scene ───────────────

function PillarOfFireBg({ pulseAnim, areaH }) {
  const H  = areaH || 600;
  const cx = W / 2;
  const gY = H * 0.70;  // ground line

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ── Static scene ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {/* Night sky */}
        <Rect x="0" y="0" width={W} height={gY} fill="#0D0810" />

        {/* Stars */}
        {STARS.map(([fx, fy], i) => (
          <Circle
            key={i}
            cx={W * fx}
            cy={H * fy}
            r={i % 3 === 0 ? 1.8 : 1.1}
            fill="white"
            opacity={0.45 + (i % 4) * 0.13}
          />
        ))}

        {/* Distant camp tent silhouettes */}
        {TENTS.map(({ fx, w, h }, i) => {
          const tx = W * fx;
          return (
            <Polygon
              key={i}
              points={`${tx - w / 2},${gY} ${tx},${gY - h} ${tx + w / 2},${gY}`}
              fill="#1A0A00"
              opacity="0.75"
            />
          );
        })}

        {/* Fire-pillar outer halo — layered ellipses simulate glow */}
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.22} ry={H * 0.40} fill="#FF4500" opacity="0.04" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.16} ry={H * 0.34} fill="#FF6A00" opacity="0.06" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.11} ry={H * 0.28} fill="#FF8C00" opacity="0.09" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.07} ry={H * 0.22} fill="#FFA500" opacity="0.12" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.04} ry={H * 0.16} fill="#FFD700" opacity="0.16" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.025} ry={H * 0.11} fill="#FFFDE7" opacity="0.20" />

        {/* Ground illumination from the fire */}
        <Ellipse cx={cx} cy={gY} rx={W * 0.32} ry={15} fill="#FF6A00" opacity="0.18" />
        <Ellipse cx={cx} cy={gY} rx={W * 0.18} ry={8}  fill="#FFD700" opacity="0.22" />

        {/* Desert dunes */}
        <Path
          d={`M0 ${gY} Q${W*0.15} ${gY-22} ${W*0.35} ${gY} Q${W*0.50} ${gY+14} ${W*0.65} ${gY-14} Q${W*0.82} ${gY-26} ${W} ${gY} L${W} ${H} L0 ${H} Z`}
          fill="#4A2A08"
        />
        <Path
          d={`M0 ${gY+12} Q${W*0.22} ${gY} ${W*0.46} ${gY+16} Q${W*0.72} ${gY+26} ${W} ${gY+10} L${W} ${H} L0 ${H} Z`}
          fill="#5C3A12"
        />
      </Svg>

      {/* ── Animated fire-core pulse (only this element scales) ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - 22,
          top: H * 0.05,
          width: 44,
          height: H * 0.65,
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Svg width={44} height={H * 0.65}>
          <Ellipse
            cx={22}
            cy={H * 0.325}
            rx={22}
            ry={H * 0.29}
            fill="#FFD700"
            opacity="0.32"
          />
          <Ellipse
            cx={22}
            cy={H * 0.325}
            rx={12}
            ry={H * 0.19}
            fill="#FFFDE7"
            opacity="0.42"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Pillar fire icon (center target) ──────────────────────────────────────

function PillarFireIcon() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      {/* Base ground glow */}
      <Ellipse cx="28" cy="51" rx="20" ry="5"  fill="#FF8C00" opacity="0.35" />
      <Ellipse cx="28" cy="51" rx="12" ry="3"  fill="#FFD700" opacity="0.50" />
      {/* Outer flame */}
      <Path
        d="M13 51 Q9 36 15 24 Q12 31 14 21 Q17 11 28 6 Q39 11 42 21 Q44 31 41 24 Q47 36 43 51Z"
        fill="#FF4500"
        opacity="0.92"
      />
      {/* Mid flame */}
      <Path
        d="M17 51 Q14 38 18 28 Q16 34 18 25 Q21 16 28 12 Q35 16 38 25 Q40 34 38 28 Q42 38 39 51Z"
        fill="#FFA500"
      />
      {/* Inner flame */}
      <Path
        d="M21 51 Q19 41 22 33 Q21 38 23 30 Q25 22 28 18 Q31 22 33 30 Q35 38 34 33 Q37 41 35 51Z"
        fill="#FFD700"
      />
      {/* White-hot core */}
      <Path
        d="M25 51 Q24 44 26 38 Q27.5 44 28 38 Q28.5 44 30 38 Q32 44 31 51Z"
        fill="#FFFDE7"
        opacity="0.95"
      />
    </Svg>
  );
}

// ── Main wrapper (measures layout) ──────────────────────────────────────

export default function GuardTask(props) {
  const [areaSize, setAreaSize] = useState(null);

  const handleLayout = useCallback((e) => {
    if (!areaSize) {
      setAreaSize({
        w: e.nativeEvent.layout.width,
        h: e.nativeEvent.layout.height,
      });
    }
  }, [areaSize]);

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} style={{ backgroundColor: colors.background.space }} onLayout={handleLayout}>
      {areaSize && <GuardTaskInner {...props} areaW={areaSize.w} areaH={areaSize.h} />}
    </TaskContainer>
  );
}

// ── Inner component (has measured dimensions) ───────────────────────────

function GuardTaskInner({ config, onSuccess, onFail, taskId, areaW, areaH }) {
  const { waveDuration, maxMisses } = config;
  const centerY = areaH * 0.35;

  const [enemies, setEnemies] = useState([]);
  const [misses,  setMisses]  = useState(0);
  const [done,    setDone]    = useState(false);
  const missRef  = useRef(0);
  const doneRef  = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pillar of fire — fire-core flicker pulse
  useEffect(() => {
    if (taskId !== 'pillar_of_fire') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.96, duration: 500,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 400,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600,  useNativeDriver: true }),
      ])
    ).start();
  }, [taskId]);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      if (doneRef.current) return;
      const e = makeEnemy(centerY, areaH);
      setEnemies((prev) => [...prev, e]);
      e.anim = Animated.timing(e.pan, {
        toValue:  { x: CENTER_X, y: centerY },
        duration: ENEMY_DURATION,
        useNativeDriver: false,
      });
      e.anim.start(({ finished }) => {
        if (finished && !doneRef.current) {
          missRef.current += 1;
          setMisses(missRef.current);
          setEnemies((prev) => prev.filter((en) => en.id !== e.id));
          if (missRef.current >= maxMisses) {
            doneRef.current = true;
            setDone(true);
            onFail();
          }
        }
      });
    }, SPAWN_INTERVAL);

    const waveTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        clearInterval(spawnInterval);
        onSuccess();
      }
    }, waveDuration);

    return () => {
      clearInterval(spawnInterval);
      clearTimeout(waveTimer);
      doneRef.current = true;
    };
  }, []);

  const killEnemy = (id) => {
    if (doneRef.current) return;
    setEnemies((prev) => {
      const e = prev.find((en) => en.id === id);
      if (e && e.anim) e.anim.stop();
      return prev.filter((en) => en.id !== id);
    });
  };

  const isPillar = taskId === 'pillar_of_fire';
  const isSheep  = taskId === 'protect_the_sheep' || taskId === 'the_lost_sheep';
  const EnemyComponent = isPillar ? SoldierSvg : WolfSvg;

  const hint = isPillar
    ? 'Guard the camp! Tap soldiers before they breach the fire!'
    : 'Tap enemies before they reach the flock!';

  return (
    <>
      {/* Backgrounds */}
      {isPillar && <PillarOfFireBg pulseAnim={pulseAnim} areaH={areaH} />}
      {isSheep  && <SheepPenBg areaH={areaH} />}

      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.missRow}>
        {Array.from({ length: maxMisses }).map((_, i) => (
          <Text key={i} style={[styles.missHeart, { opacity: i < misses ? 0.25 : 1 }]}>
            ♥
          </Text>
        ))}
      </View>

      {/* Center target: SVG fire column for pillar, sheep emoji for sheep tasks */}
      <View style={[styles.center, { left: CENTER_X, top: centerY }]}>
        {isPillar
          ? <PillarFireIcon />
          : <Text style={styles.centerIcon}>🐑</Text>
        }
      </View>

      {enemies.map((e) => (
        <Animated.View
          key={e.id}
          style={[styles.enemy, e.pan.getLayout()]}
        >
          <TouchableOpacity
            style={styles.enemyTouch}
            onPress={() => killEnemy(e.id)}
            activeOpacity={0.6}
          >
            <EnemyComponent />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  missRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  missHeart: {
    fontSize: 22,
    color: colors.state.error,
  },
  center: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIcon: {
    fontSize: 36,
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
  },
  enemyTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
