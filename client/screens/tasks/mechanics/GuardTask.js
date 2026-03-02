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
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');
const ENEMY_SIZE    = 56;
const SPAWN_INTERVAL = 2200;
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

// ── Soldier SVG (for pillar_of_fire) ─────────────────────────────────────

function SoldierSvg() {
  return (
    <Svg width={ENEMY_SIZE} height={ENEMY_SIZE} viewBox="0 0 56 56">
      <G>
        {/* Body */}
        <Rect x="18" y="24" width="20" height="22" rx="4" fill="#2A3A2A" />
        {/* Head */}
        <Ellipse cx="28" cy="15" rx="10" ry="11" fill="#2A3A2A" />
        {/* Helmet crest */}
        <Rect x="24" y="4" width="8" height="10" rx="2" fill="#1A2A1A" />
        {/* Eyes */}
        <Ellipse cx="23" cy="14" rx="2.5" ry="2.5" fill="#FF3366" opacity="0.8" />
        <Ellipse cx="33" cy="14" rx="2.5" ry="2.5" fill="#FF3366" opacity="0.8" />
        {/* Arms */}
        <Rect x="6"  y="26" width="13" height="6" rx="3" fill="#2A3A2A" />
        <Rect x="37" y="26" width="13" height="6" rx="3" fill="#2A3A2A" />
        {/* Legs */}
        <Rect x="18" y="44" width="9"  height="12" rx="3" fill="#1A2A1A" />
        <Rect x="29" y="44" width="9"  height="12" rx="3" fill="#1A2A1A" />
        {/* Spear */}
        <Rect x="47" y="10" width="3" height="40" rx="1" fill="#8B6914" />
        <Polygon points="48.5,10 45,3 52,3" fill="#C0C0C0" />
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

// ── Pillar of fire background ─────────────────────────────────────────────

function PillarOfFireBg({ pulseAnim }) {
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transform: [{ scale: pulseAnim }] }]}
      pointerEvents="none"
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Desert ground */}
        <Rect x="0" y="72" width="100" height="28" fill="#5C3A1A" />
        {/* Fire column outer glow */}
        <Ellipse cx="50" cy="40" rx="12" ry="34" fill="#FFA63D" opacity="0.3" />
        {/* Fire column bright core */}
        <Ellipse cx="50" cy="40" rx="6" ry="25" fill="#FFE082" opacity="0.45" />
        {/* Base ground glow */}
        <Ellipse cx="50" cy="72" rx="18" ry="4" fill="#FFA63D" opacity="0.3" />
      </Svg>
    </Animated.View>
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
    <View style={styles.container} onLayout={handleLayout}>
      {areaSize && <GuardTaskInner {...props} areaW={areaSize.w} areaH={areaSize.h} />}
    </View>
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

  // Pillar of fire pulse
  useEffect(() => {
    if (taskId !== 'pillar_of_fire') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
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
      {isPillar && <PillarOfFireBg pulseAnim={pulseAnim} />}
      {isSheep  && <SheepPenBg areaH={areaH} />}

      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.missRow}>
        {Array.from({ length: maxMisses }).map((_, i) => (
          <Text key={i} style={[styles.missHeart, { opacity: i < misses ? 0.25 : 1 }]}>
            ♥
          </Text>
        ))}
      </View>

      {/* Center: sheep emoji for sheep tasks, fire glyph for pillar */}
      <View style={[styles.center, { left: CENTER_X, top: centerY }]}>
        <Text style={styles.centerIcon}>{isPillar ? '🔥' : '🐑'}</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background.space,
  },
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
