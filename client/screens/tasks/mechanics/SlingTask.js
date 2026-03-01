import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, Line, G, Polygon } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const STONE_SIZE   = 36;
const TARGET_W     = 80;
const TARGET_H     = 140;
const TARGET_X     = W / 2 - TARGET_W / 2;
const TARGET_Y     = 55;
const STONE_START_X = W / 2 - STONE_SIZE / 2;
const STONE_START_Y = H * 0.55;

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

export default function SlingTask({ config, onSuccess, onFail }) {
  const { attempts, minVelocity } = config;
  const [attemptsLeft, setAttemptsLeft] = useState(attempts);
  const [message,      setMessage]      = useState('');
  const [done,         setDone]         = useState(false);
  const [hit,          setHit]          = useState(false);
  const [isDragging,   setIsDragging]   = useState(false);

  const attemptsLeftRef = useRef(attempts);
  const doneRef         = useRef(false);
  const stonePosRef     = useRef({ x: STONE_START_X, y: STONE_START_Y });

  const pan      = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastPos  = useRef({ x: STONE_START_X, y: STONE_START_Y });
  const prevPos  = useRef({ x: STONE_START_X, y: STONE_START_Y });

  // Current stone center for arc hint
  const [arcStone, setArcStone] = useState({ x: STONE_START_X, y: STONE_START_Y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onPanResponderGrant: () => {
        setIsDragging(true);
        setArcStone({ x: STONE_START_X, y: STONE_START_Y });
      },
      onPanResponderMove: (_, g) => {
        prevPos.current  = { ...lastPos.current };
        lastPos.current  = { x: STONE_START_X + g.dx, y: STONE_START_Y + g.dy };
        stonePosRef.current = lastPos.current;
        pan.setValue({ x: g.dx, y: g.dy });
        setArcStone({ x: STONE_START_X + g.dx + STONE_SIZE / 2, y: STONE_START_Y + g.dy + STONE_SIZE / 2 });
      },
      onPanResponderRelease: (_, g) => {
        setIsDragging(false);
        const vx = lastPos.current.x - prevPos.current.x;
        const vy = lastPos.current.y - prevPos.current.y;
        const velocity = Math.sqrt(vx * vx + vy * vy) * 60;

        const flyX = g.dx + vx * 15;
        const flyY = g.dy + vy * 15;

        Animated.timing(pan, {
          toValue:  { x: flyX, y: flyY },
          duration: 400,
          useNativeDriver: false,
        }).start(() => {
          const finalX  = STONE_START_X + flyX + STONE_SIZE / 2;
          const finalY  = STONE_START_Y + flyY + STONE_SIZE / 2;
          const tcx     = TARGET_X + TARGET_W / 2;
          const tcy     = TARGET_Y + TARGET_H / 2;
          const dist    = Math.sqrt((finalX - tcx) ** 2 + (finalY - tcy) ** 2);
          const wasHit  = dist < TARGET_W * 0.9 && velocity >= minVelocity;

          if (wasHit) {
            doneRef.current = true;
            setHit(true);
            setDone(true);
            setMessage('Direct hit! Goliath falls!');
            onSuccess();
          } else {
            const remaining = attemptsLeftRef.current - 1;
            attemptsLeftRef.current = remaining;
            setAttemptsLeft(remaining);
            if (velocity < minVelocity) {
              setMessage('Too slow! Swipe faster.');
            } else {
              setMessage('Missed! Aim higher.');
            }
            setTimeout(() => {
              pan.setValue({ x: 0, y: 0 });
              setArcStone({ x: STONE_START_X, y: STONE_START_Y });
              if (remaining <= 0) {
                doneRef.current = true;
                setDone(true);
                onFail();
              }
            }, 500);
          }
        });
      },
    })
  ).current;

  // Target center for arc
  const tcx = TARGET_X + TARGET_W / 2;
  const tcy = TARGET_Y + TARGET_H / 2;

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {done ? message : 'Swipe the stone upward at Goliath!'}
      </Text>
      {!done && (
        <Text style={styles.attempts}>Attempts left: {attemptsLeft}</Text>
      )}
      {message !== '' && !done && (
        <Text style={styles.message}>{message}</Text>
      )}

      {/* Goliath silhouette at target position */}
      <View style={{ position: 'absolute', left: TARGET_X, top: TARGET_Y }}>
        <GoliathSvg hit={hit} />
      </View>

      {/* Trajectory arc hint (shown while dragging) */}
      {isDragging && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={`M ${arcStone.x} ${arcStone.y} Q ${W / 2} ${H * 0.15} ${tcx} ${tcy}`}
            stroke="#00D4FF"
            strokeWidth={1.5}
            strokeDasharray="8,6"
            fill="none"
            opacity={0.4}
          />
        </Svg>
      )}

      {/* Stone */}
      <Animated.View
        style={[
          styles.stone,
          { left: STONE_START_X, top: STONE_START_Y },
          pan.getLayout(),
        ]}
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
  attempts: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
    color: colors.primary.electricBlue,
    textAlign: 'center',
    marginTop: 4,
  },
  message: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 14,
    color: colors.accent.amber,
    textAlign: 'center',
    marginTop: 4,
  },
  stone: {
    position: 'absolute',
    width: STONE_SIZE,
    height: STONE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
