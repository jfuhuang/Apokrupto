import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Rect, Polygon, Line, Path, Ellipse } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const MARGIN = 20;

// Decoy items for Paul's Belongings "Where's Waldo" mode
const PAULS_DECOYS = ['👡', '🪔', '🍞', '🫙', '🪙', '🐟', '🍇', '🌾', '🏺', '🧵', '🔑', '🪵'];
// Real items Paul needs (indexes 0=Cloak,1=Parchments,2=Books)
const PAULS_REAL_ICONS = ['🧥', '📜', '📚'];

// Per-task visual configuration
const ITEM_VISUALS = {
  pauls_belongings: {
    color:   '#FFA63D',
    hint:    "Find Paul's belongings hidden in the market!",
    shape:   'card',
  },
  manna_wilderness: {
    icons:   ['✦', '✦', '✦'],
    color:   '#00D4FF',
    hint:    'Collect the manna!',
    shape:   'diamond',
    rain:    true,
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
  const v = ITEM_VISUALS[taskId];
  if (v && v.icons) return v.icons[index % v.icons.length];
  return '✦';
}

function randomPos(shape, maxH) {
  const itemW = shape === 'card' ? 64 : shape === 'stone' ? 65 : 70;
  const itemH = shape === 'card' ? 72 : shape === 'stone' ? 45 : 70;
  const usableH = maxH || H * 0.5;
  return {
    x: MARGIN + Math.random() * (W - itemW - MARGIN * 2),
    y: MARGIN + 60 + Math.random() * (usableH - itemH - MARGIN * 2 - 60),
  };
}

export default function CollectTask({ config, onSuccess, onFail, taskId }) {
  const { items } = config;
  const visual  = ITEM_VISUALS[taskId] || {};
  const shape   = visual.shape || 'circle';
  const color   = visual.color || colors.primary.electricBlue;
  const isRain  = !!visual.rain;
  const isWaldo = taskId === 'pauls_belongings';

  const hint = isWaldo
    ? visual.hint
    : visual.hint || 'Tap all items before time runs out!';

  // ── Paul's Belongings: mixed real + decoy item list ──────────────────────
  const [waldoItems] = useState(() => {
    if (!isWaldo) return null;
    const realItems = items.map((label, i) => ({
      key:     `real-${i}`,
      icon:    PAULS_REAL_ICONS[i] || '📦',
      label,
      decoy:   false,
      realIdx: i,
      pos:     randomPos('card', H * 0.82),
    }));
    const decoyItems = shuffle(PAULS_DECOYS).slice(0, 12).map((icon, i) => ({
      key:     `decoy-${i}`,
      icon,
      label:   '',
      decoy:   true,
      realIdx: null,
      pos:     randomPos('card', H * 0.82),
    }));
    return shuffle([...realItems, ...decoyItems]);
  });

  // Flash anims for wrong-tap feedback (keyed by item key)
  const flashAnims = useRef(
    isWaldo
      ? Object.fromEntries((waldoItems || []).map(it => [it.key, new Animated.Value(0)]))
      : {}
  ).current;

  // ── Standard item positions (non-waldo tasks) ────────────────────────────
  const [positions] = useState(() => {
    if (isWaldo) return null;
    return items.map(() => randomPos(shape));
  });
  const [collected, setCollected] = useState(new Set());

  // Rain animation for manna
  const rainAnims = useRef(
    isRain ? items.map(() => new Animated.Value(-80)) : null
  ).current;

  useEffect(() => {
    if (!isRain || !rainAnims) return;
    Animated.stagger(
      300,
      rainAnims.map((a, i) =>
        Animated.timing(a, {
          toValue:  positions[i].y,
          duration: 900,
          useNativeDriver: false,
        })
      )
    ).start();
  }, []);

  // ── Collect handlers ─────────────────────────────────────────────────────

  const handleCollect = (idx) => {
    if (collected.has(idx)) return;
    const next = new Set([...collected, idx]);
    setCollected(next);
    if (next.size === items.length) {
      onSuccess();
    }
  };

  const handleWaldoTap = (item) => {
    if (item.decoy) {
      // Flash red feedback
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
    setCollected(next);
    if (next.size === items.length) {
      onSuccess();
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────

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
      case 'diamond':
        return [
          styles.itemDiamond,
          done && { borderColor: colors.accent.neonGreen, backgroundColor: 'rgba(0,255,159,0.12)' },
          !done && { borderColor: color, backgroundColor: color + '18' },
        ];
      default:
        return [
          styles.item,
          done && styles.itemDone,
          !done && { borderColor: color, backgroundColor: color + '18' },
        ];
    }
  };

  // ── Paul's Waldo render ──────────────────────────────────────────────────

  if (isWaldo && waldoItems) {
    return (
      <View style={styles.container}>
        <Text style={styles.hint}>{hint}</Text>
        <Text style={[styles.progress, { color }]}>
          Found: {collected.size} / {items.length}
        </Text>
        <Text style={styles.waldoTarget}>
          Looking for: {'🧥 📜 📚'}
        </Text>

        {waldoItems.map((item) => {
          const done     = !item.decoy && collected.has(item.realIdx);
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
                { position: 'absolute', left: item.pos.x, top: item.pos.y },
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
      </View>
    );
  }

  // ── Standard collect render ──────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Cloud decoration for manna */}
      {isRain && (
        <Svg
          style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
          height={70}
          width={W}
          pointerEvents="none"
        >
          <Circle cx={W * 0.3} cy={30} r={22} fill="#C0E0FF" opacity="0.8" />
          <Circle cx={W * 0.5} cy={20} r={28} fill="#D0EAFF" opacity="0.9" />
          <Circle cx={W * 0.7} cy={30} r={22} fill="#C0E0FF" opacity="0.8" />
          <Rect x={W * 0.3 - 22} y={28} width={W * 0.4 + 44} height={22} fill="#D0EAFF" opacity="0.9" />
        </Svg>
      )}

      {/* River background for jordan */}
      {taskId === 'jordan_river' && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: H * 0.3,
            height: H * 0.2,
            backgroundColor: 'rgba(0,100,200,0.2)',
          }}
          pointerEvents="none"
        />
      )}

      <Text style={styles.hint}>{hint}</Text>
      <Text style={[styles.progress, { color }]}>
        {collected.size} / {items.length} collected
      </Text>

      {items.map((item, idx) => {
        const pos  = positions[idx];
        const done = collected.has(idx);

        if (isRain && rainAnims) {
          return (
            <Animated.View
              key={idx}
              style={[{ position: 'absolute', left: pos.x }, { top: rainAnims[idx] }]}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                style={getItemStyle(done)}
                onPress={() => handleCollect(idx)}
                activeOpacity={0.7}
                disabled={done}
              >
                {renderItemContent(idx, done)}
              </TouchableOpacity>
            </Animated.View>
          );
        }

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
  // Waldo-mode compact card
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
    borderColor:       colors.accent.neonGreen,
    backgroundColor:  'rgba(0,255,159,0.12)',
  },
  waldoCardInner: {
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },
  waldoIcon: {
    fontSize: 28,
  },
  // Default circle
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
  // Rectangular card (pauls_belongings fallback)
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
  // Stone oval (jordan_river)
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
  // Diamond shape (manna_wilderness)
  itemDiamond: {
    width:        56,
    height:       56,
    borderRadius: 8,
    borderWidth:  2,
    justifyContent: 'center',
    alignItems:   'center',
    transform:    [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation:    5,
  },
  itemIcon: {
    fontSize: 18,
    color:    colors.primary.electricBlue,
    transform: [{ rotate: '0deg' }],
  },
  itemLabel: {
    fontFamily: fonts.ui.semiBold,
    fontSize:   9,
    textAlign:  'center',
    marginTop:  2,
  },
});
