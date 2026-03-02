import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Rect, Line, Path, Ellipse } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');
const MARGIN = 20;

// Decoy items for Paul's Belongings "Where's Waldo" mode
const PAULS_DECOYS = ['👡', '🪔', '🍞', '🫙', '🪙', '🐟', '🍇', '🌾', '🏺', '🧵', '🔑', '🪵'];
const PAULS_REAL_ICONS = ['🧥', '📜', '📚'];

const ITEM_VISUALS = {
  pauls_belongings: {
    color:   '#FFA63D',
    hint:    "Find Paul's belongings hidden in the market!",
    shape:   'card',
  },
  manna_wilderness: {
    color:   '#F5DEB3',
    hint:    'Catch the falling manna!',
    shape:   'manna',
  },
  jordan_river: {
    icons:   null,
    color:   '#8B9CB0',
    hint:    'Take 12 memorial stones!',
    shape:   'stone',
  },
  loaves_and_fish: {
    icons:   null,
    color:   '#00FF9F',
    hint:    'Divide the loaves and fish!',
    shape:   'oval',
  },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getIcon(taskId, index) {
  if (taskId === 'loaves_and_fish') return index % 2 === 0 ? '🍞' : '🐟';
  if (taskId === 'jordan_river') return null;
  if (taskId === 'manna_wilderness') return null;
  const v = ITEM_VISUALS[taskId];
  if (v && v.icons) return v.icons[index % v.icons.length];
  return '✦';
}

// ── Item dimensions per shape ───────────────────────────────────────────────

function getItemDimensions(shape) {
  switch (shape) {
    case 'card':  return { w: 64, h: 72 };
    case 'stone': return { w: 65, h: 45 };
    case 'manna': return { w: 56, h: 56 };
    default:      return { w: 70, h: 70 };
  }
}

// ── Collision-aware position generation ─────────────────────────────────────

function generatePositions(count, shape, areaW, areaH) {
  const { w: itemW, h: itemH } = getItemDimensions(shape);
  const minSpacing = Math.max(itemW, itemH) * 1.15;
  const startY = 60;
  const positions = [];

  for (let i = 0; i < count; i++) {
    let placed = false;
    let spacing = minSpacing;

    for (let attempt = 0; attempt < 60 && !placed; attempt++) {
      const x = MARGIN + Math.random() * (areaW - itemW - MARGIN * 2);
      const y = startY + Math.random() * Math.max(0, areaH - itemH - startY - MARGIN);

      const overlaps = positions.some((p) => {
        const dx = Math.abs(p.x - x);
        const dy = Math.abs(p.y - y);
        return dx < spacing && dy < spacing;
      });

      if (!overlaps) {
        positions.push({ x, y });
        placed = true;
      }

      // Relax spacing after many failed attempts
      if (attempt > 35) spacing = minSpacing * 0.6;
    }

    if (!placed) {
      const cols = Math.max(1, Math.floor((areaW - MARGIN * 2) / (itemW + MARGIN)));
      const row  = Math.floor(i / cols);
      const col  = i % cols;
      positions.push({
        x: MARGIN + col * (itemW + MARGIN),
        y: startY + row * (itemH + MARGIN),
      });
    }
  }

  return positions;
}

// ── Manna SVG sprite ────────────────────────────────────────────────────────

function MannaSprite({ collected }) {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Circle cx="22" cy="22" r="18" fill={collected ? '#00FF9F' : '#F5DEB3'} />
      <Circle cx="22" cy="22" r="15" fill={collected ? 'rgba(0,255,159,0.7)' : '#DEB887'} />
      {!collected && (
        <>
          <Line x1="9" y1="22" x2="35" y2="22" stroke="#C8A060" strokeWidth="1" opacity="0.5" />
          <Line x1="22" y1="9" x2="22" y2="35" stroke="#C8A060" strokeWidth="1" opacity="0.5" />
          <Line x1="12" y1="12" x2="32" y2="32" stroke="#C8A060" strokeWidth="0.8" opacity="0.3" />
          <Line x1="32" y1="12" x2="12" y2="32" stroke="#C8A060" strokeWidth="0.8" opacity="0.3" />
          <Circle cx="17" cy="17" r="4" fill="#FFE4B5" opacity="0.5" />
        </>
      )}
      {collected && (
        <Path d="M14 22 L20 28 L30 16" stroke="#0B0C10" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}

// ── Main component (measures layout before rendering items) ─────────────────

export default function CollectTask(props) {
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
      {areaSize && <CollectTaskInner {...props} areaW={areaSize.w} areaH={areaSize.h} />}
    </View>
  );
}

// ── Inner component (has measured dimensions) ───────────────────────────────

function CollectTaskInner({ config, onSuccess, onFail, taskId, areaW, areaH }) {
  const { items } = config;
  const visual  = ITEM_VISUALS[taskId] || {};
  const shape   = visual.shape || 'circle';
  const color   = visual.color || colors.primary.electricBlue;
  const isManna = taskId === 'manna_wilderness';
  const isWaldo = taskId === 'pauls_belongings';
  const hint    = visual.hint || 'Tap all items before time runs out!';

  // ── Collected tracking ──────────────────────────────────────────────────

  const [collected, setCollected] = useState(new Set());
  const collectedRef = useRef(new Set());
  const doneRef      = useRef(false);

  // ── Paul's Belongings waldo mode ────────────────────────────────────────

  const [waldoItems] = useState(() => {
    if (!isWaldo) return null;
    const realItems = items.map((label, i) => ({
      key: `real-${i}`, icon: PAULS_REAL_ICONS[i] || '📦',
      label, decoy: false, realIdx: i,
    }));
    const decoyItems = shuffle(PAULS_DECOYS).slice(0, 12).map((icon, i) => ({
      key: `decoy-${i}`, icon, label: '', decoy: true, realIdx: null,
    }));
    return shuffle([...realItems, ...decoyItems]);
  });

  const [waldoPositions] = useState(() => {
    if (!isWaldo || !waldoItems) return null;
    return generatePositions(waldoItems.length, 'card', areaW, areaH);
  });

  const flashAnims = useRef(
    isWaldo
      ? Object.fromEntries((waldoItems || []).map((it) => [it.key, new Animated.Value(0)]))
      : {}
  ).current;

  // ── Standard item positions (non-waldo, non-manna) ─────────────────────

  const [positions] = useState(() => {
    if (isWaldo || isManna) return null;
    return generatePositions(items.length, shape, areaW, areaH);
  });

  // ── Manna continuous falling ────────────────────────────────────────────

  const mannaAnims = useRef(
    isManna
      ? items.map((_, i) => ({
          x: new Animated.Value(MARGIN + Math.random() * (areaW - 56 - MARGIN * 2)),
          y: new Animated.Value(-80 - i * 120),
        }))
      : null
  ).current;

  useEffect(() => {
    if (!isManna || !mannaAnims) return;

    const startFall = (i) => {
      if (collectedRef.current.has(i) || doneRef.current) return;
      const m = mannaAnims[i];
      m.x.setValue(MARGIN + Math.random() * (areaW - 56 - MARGIN * 2));
      m.y.setValue(-80);
      Animated.timing(m.y, {
        toValue:  areaH + 80,
        duration: 2500,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !collectedRef.current.has(i) && !doneRef.current) {
          startFall(i);
        }
      });
    };

    mannaAnims.forEach((_, i) => {
      setTimeout(() => startFall(i), i * 600);
    });

    return () => { doneRef.current = true; };
  }, []);

  // ── Collect handlers ──────────────────────────────────────────────────

  const handleCollect = (idx) => {
    if (collected.has(idx) || doneRef.current) return;
    const next = new Set([...collected, idx]);
    collectedRef.current = next;
    setCollected(next);
    if (isManna && mannaAnims && mannaAnims[idx]) {
      mannaAnims[idx].y.stopAnimation();
    }
    if (next.size === items.length) {
      doneRef.current = true;
      onSuccess();
    }
  };

  const handleWaldoTap = (item) => {
    if (doneRef.current) return;
    if (item.decoy) {
      const anim = flashAnims[item.key];
      if (anim) {
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 320, useNativeDriver: false }),
        ]).start();
      }
      return;
    }
    if (collected.has(item.realIdx)) return;
    const next = new Set([...collected, item.realIdx]);
    collectedRef.current = next;
    setCollected(next);
    if (next.size === items.length) {
      doneRef.current = true;
      onSuccess();
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────

  const renderItemContent = (idx, done) => {
    const icon = getIcon(taskId, idx);

    if (taskId === 'jordan_river') {
      return (
        <Svg width={65} height={45} viewBox="0 0 65 45">
          <Ellipse cx="32" cy="22" rx="28" ry="18" fill={done ? '#00FF9F' : '#8B9CB0'} />
          <Line x1="18" y1="16" x2="30" y2="14" stroke="#7A8B9A" strokeWidth="1.5" />
          <Line x1="36" y1="28" x2="50" y2="26" stroke="#7A8B9A" strokeWidth="1.5" />
          <Line x1="22" y1="26" x2="34" y2="30" stroke="#7A8B9A" strokeWidth="1" />
        </Svg>
      );
    }

    if (icon) {
      return (
        <>
          <Text style={[styles.itemIcon, { fontSize: 26 }]}>{done ? '✓' : icon}</Text>
          {shape !== 'card' && (
            <Text style={[styles.itemLabel, { color }]} numberOfLines={1}>
              {items[idx]}
            </Text>
          )}
        </>
      );
    }

    return <Text style={styles.itemIcon}>{done ? '✓' : '✦'}</Text>;
  };

  const getItemStyle = (done) => {
    switch (shape) {
      case 'card':
        return [
          styles.itemCard,
          done && { borderColor: colors.accent.neonGreen, backgroundColor: 'rgba(0,255,159,0.12)' },
          !done && { borderColor: color, backgroundColor: color + '18' },
        ];
      case 'stone':
        return [
          styles.itemStone,
          done && { borderColor: colors.accent.neonGreen },
          !done && { borderColor: color },
        ];
      case 'manna':
        return [
          styles.itemManna,
          done && { borderColor: colors.accent.neonGreen, backgroundColor: 'rgba(0,255,159,0.12)' },
          !done && { borderColor: '#DEB887', backgroundColor: 'rgba(245,222,179,0.15)' },
        ];
      default:
        return [
          styles.item,
          done && styles.itemDone,
          !done && { borderColor: color, backgroundColor: color + '18' },
        ];
    }
  };

  // ── Paul's Waldo render ─────────────────────────────────────────────────

  if (isWaldo && waldoItems && waldoPositions) {
    return (
      <>
        <Text style={styles.hint}>{hint}</Text>
        <Text style={[styles.progress, { color }]}>
          Found: {collected.size} / {items.length}
        </Text>
        <Text style={styles.waldoTarget}>
          Looking for: {'🧥 📜 📚'}
        </Text>

        {waldoItems.map((item, idx) => {
          const pos  = waldoPositions[idx];
          const done = !item.decoy && collected.has(item.realIdx);
          const flashAnim = flashAnims[item.key];
          const borderColorAnim = flashAnim
            ? flashAnim.interpolate({ inputRange: [0, 1], outputRange: [color + '60', '#FF3366'] })
            : color + '60';
          const bgColorAnim = flashAnim
            ? flashAnim.interpolate({ inputRange: [0, 1], outputRange: [color + '14', 'rgba(255,51,102,0.18)'] })
            : color + '14';

          return (
            <Animated.View
              key={item.key}
              style={[
                styles.waldoCard,
                { position: 'absolute', left: pos.x, top: pos.y },
                done && styles.waldoCardDone,
                !done && { borderColor: borderColorAnim, backgroundColor: bgColorAnim },
              ]}
              pointerEvents={done ? 'none' : 'box-none'}
            >
              <TouchableOpacity
                style={styles.waldoCardInner}
                onPress={() => handleWaldoTap(item)}
                activeOpacity={0.7}
                disabled={done}
              >
                <Text style={styles.waldoIcon}>{done ? '✓' : item.icon}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </>
    );
  }

  // ── Manna render ────────────────────────────────────────────────────────

  if (isManna && mannaAnims) {
    return (
      <>
        {/* Cloud decoration */}
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          height={70}
          width={areaW}
          pointerEvents="none"
        >
          <Circle cx={areaW * 0.3} cy={30} r={22} fill="#C0E0FF" opacity="0.8" />
          <Circle cx={areaW * 0.5} cy={20} r={28} fill="#D0EAFF" opacity="0.9" />
          <Circle cx={areaW * 0.7} cy={30} r={22} fill="#C0E0FF" opacity="0.8" />
          <Rect
            x={areaW * 0.3 - 22} y={28}
            width={areaW * 0.4 + 44} height={22}
            fill="#D0EAFF" opacity="0.9"
          />
        </Svg>

        <Text style={styles.hint}>{hint}</Text>
        <Text style={[styles.progress, { color }]}>
          {collected.size} / {items.length} collected
        </Text>

        {items.map((_, idx) => {
          const done = collected.has(idx);
          if (done) return null;

          return (
            <Animated.View
              key={idx}
              style={{
                position: 'absolute',
                left: mannaAnims[idx].x,
                top:  mannaAnims[idx].y,
              }}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={getItemStyle(false)}
                onPress={() => handleCollect(idx)}
                activeOpacity={0.7}
              >
                <MannaSprite collected={false} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </>
    );
  }

  // ── Standard collect render ─────────────────────────────────────────────

  return (
    <>
      {/* River background for jordan */}
      {taskId === 'jordan_river' && (
        <View
          style={{
            position: 'absolute',
            left: 0, right: 0,
            top: areaH * 0.3,
            height: areaH * 0.2,
            backgroundColor: 'rgba(0,100,200,0.2)',
          }}
          pointerEvents="none"
        />
      )}

      <Text style={styles.hint}>{hint}</Text>
      <Text style={[styles.progress, { color }]}>
        {collected.size} / {items.length} collected
      </Text>

      {positions && items.map((item, idx) => {
        const pos  = positions[idx];
        const done = collected.has(idx);

        return (
          <TouchableOpacity
            key={idx}
            style={[getItemStyle(done), { position: 'absolute', left: pos.x, top: pos.y }]}
            onPress={() => handleCollect(idx)}
            activeOpacity={0.7}
            disabled={done}
          >
            {renderItemContent(idx, done)}
          </TouchableOpacity>
        );
      })}
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
    color:     colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  progress: {
    fontFamily: fonts.accent.bold,
    fontSize:   18,
    textAlign:  'center',
    marginTop:  4,
  },
  waldoTarget: {
    fontFamily: fonts.ui.regular,
    fontSize:   13,
    color:      colors.text.secondary,
    textAlign:  'center',
    marginTop:  2,
    letterSpacing: 2,
  },
  waldoCard: {
    width:        64,
    height:       72,
    borderRadius: 10,
    borderWidth:  1.5,
    overflow:     'hidden',
    shadowColor:  '#FFA63D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius:  6,
    elevation:     4,
  },
  waldoCardDone: {
    borderColor:      colors.accent.neonGreen,
    backgroundColor: 'rgba(0,255,159,0.12)',
  },
  waldoCardInner: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },
  waldoIcon: {
    fontSize: 28,
  },
  item: {
    width:        70,
    height:       70,
    borderRadius: 35,
    borderWidth:  2,
    justifyContent: 'center',
    alignItems:   'center',
    padding:      4,
    shadowColor:  '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation:    5,
  },
  itemDone: {
    backgroundColor: 'rgba(0,255,159,0.12)',
    borderColor:     colors.accent.neonGreen,
    shadowColor:     colors.accent.neonGreen,
  },
  itemCard: {
    width:        80,
    height:       90,
    borderRadius: 12,
    borderWidth:  2,
    justifyContent: 'center',
    alignItems:   'center',
    padding:      8,
    shadowColor:  '#FFA63D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius:  8,
    elevation:     5,
  },
  itemStone: {
    width:        65,
    height:       45,
    borderRadius: 22,
    borderWidth:  2,
    justifyContent: 'center',
    alignItems:   'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius:  4,
    elevation:     4,
    backgroundColor: 'rgba(139,156,176,0.1)',
  },
  itemManna: {
    width:        56,
    height:       56,
    borderRadius: 28,
    borderWidth:  2,
    justifyContent: 'center',
    alignItems:   'center',
    shadowColor:  '#DEB887',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius:  8,
    elevation:     5,
  },
  itemIcon: {
    fontSize: 18,
    color:    colors.primary.electricBlue,
  },
  itemLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize:   9,
    textAlign:  'center',
    marginTop:  2,
  },
});
