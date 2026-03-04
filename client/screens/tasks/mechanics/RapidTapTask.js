import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, Line, G } from 'react-native-svg';
import TaskSprite from '../../../components/TaskSprite';
import TaskContainer from '../../../components/TaskContainer';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');

// ── SVG tap button components ─────────────────────────────────────────────

function BasketButton({ done, size }) {
  const c = done ? colors.accent.neonGreen : '#FFA63D';
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180">
      {/* Basket body — woven */}
      <Path d="M40 80 Q30 130 35 160 L145 160 Q150 130 140 80Z" fill={c} opacity="0.85" />
      {/* Weave lines horizontal */}
      <Line x1="36" y1="100" x2="144" y2="100" stroke="#0B0C10" strokeWidth="1.5" opacity="0.4" />
      <Line x1="34" y1="120" x2="146" y2="120" stroke="#0B0C10" strokeWidth="1.5" opacity="0.4" />
      <Line x1="33" y1="140" x2="147" y2="140" stroke="#0B0C10" strokeWidth="1.5" opacity="0.4" />
      {/* Weave lines vertical */}
      <Line x1="60"  y1="80" x2="52"  y2="160" stroke="#0B0C10" strokeWidth="1.2" opacity="0.3" />
      <Line x1="90"  y1="80" x2="90"  y2="160" stroke="#0B0C10" strokeWidth="1.2" opacity="0.3" />
      <Line x1="120" y1="80" x2="128" y2="160" stroke="#0B0C10" strokeWidth="1.2" opacity="0.3" />
      {/* Rim */}
      <Ellipse cx="90" cy="80" rx="50" ry="14" fill={c} />
      <Ellipse cx="90" cy="78" rx="48" ry="12" fill={c} opacity="0.7" />
      {/* Fish peeking over rim */}
      <Path d="M60 66 Q76 54 92 66 Q76 78 60 66Z" fill={c} opacity="0.9" />
      <Path d="M54 66 L60 58 L60 74Z"             fill={c} />
      {/* Loaf peeking */}
      <Ellipse cx="115" cy="64" rx="22" ry="14" fill={c} opacity="0.85" />
      {/* Handle arc */}
      <Path d="M55 80 Q90 40 125 80" stroke={c} strokeWidth="6" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

function WallButton({ taps, targetTaps, done, size }) {
  const pct   = Math.min(taps / targetTaps, 1);
  const stage = Math.floor(pct * 4); // 0–3
  const c     = done ? colors.accent.neonGreen : colors.primary.electricBlue;

  // Crack opacity increases with stage
  const crackOpacity = Math.min(pct * 1.5, 0.9);
  const fallingOpacity = stage >= 3 ? 0.9 : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 180 180">
      {/* Brick rows */}
      {[0, 1, 2, 3, 4].map((row) => {
        const y    = 20 + row * 32;
        const xOff = row % 2 === 0 ? 0 : 22;
        return (
          <G key={row}>
            {[-1, 0, 1, 2, 3].map((col) => {
              const x = col * 44 + xOff + 10;
              if (x > 175 || x + 40 < 5) return null;
              return (
                <Rect
                  key={col}
                  x={Math.max(5, x)}
                  y={y}
                  width={Math.min(42, 175 - Math.max(5, x))}
                  height={26}
                  rx="2"
                  fill={c}
                  opacity={0.8}
                />
              );
            })}
          </G>
        );
      })}
      {/* Mortar lines */}
      {[0, 1, 2, 3, 4].map((row) => (
        <Line key={row} x1="5" y1={20 + row * 32} x2="175" y2={20 + row * 32}
          stroke="#0B0C10" strokeWidth="4" />
      ))}
      {/* Vertical mortar alternating */}
      {[0, 1, 2, 3, 4].map((row) => {
        const xOff = row % 2 === 0 ? 0 : 22;
        return [0, 1, 2, 3].map((col) => (
          <Line key={`${row}-${col}`}
            x1={col * 44 + xOff + 52}
            y1={20 + row * 32}
            x2={col * 44 + xOff + 52}
            y2={20 + (row + 1) * 32}
            stroke="#0B0C10" strokeWidth="3" />
        ));
      })}
      {/* Crack down the middle */}
      {stage >= 1 && (
        <Path
          d="M90 20 L87 50 L93 80 L85 115 L92 145 L88 165"
          stroke="#0B0C10"
          strokeWidth={4 + stage * 2}
          fill="none"
          strokeLinecap="round"
          opacity={crackOpacity}
        />
      )}
      {/* Falling bricks at base */}
      {stage >= 3 && (
        <G opacity={fallingOpacity}>
          <Rect x="50"  y="152" width="38" height="20" rx="2" fill={c} opacity="0.7" transform="rotate(-8 60 160)" />
          <Rect x="95"  y="155" width="38" height="20" rx="2" fill={c} opacity="0.6" transform="rotate(5 115 165)" />
          <Rect x="130" y="150" width="30" height="18" rx="2" fill={c} opacity="0.5" transform="rotate(-12 145 158)" />
        </G>
      )}
    </Svg>
  );
}

function RockButton({ done, size }) {
  const c = done ? colors.accent.neonGreen : '#8B9CB0';
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180">
      <Path d="M35 150 Q20 110 30 70 Q40 35 70 25 Q100 15 130 30 Q160 45 162 80 Q164 120 148 150Z" fill={c} />
      <Path d="M40 150 Q28 112 38 74 Q47 38 73 28 Q99 18 127 32 Q155 48 157 82 Q158 118 144 150Z" fill="#9AACC0" />
      {/* Crack */}
      <Path d="M90 25 L85 60 L92 90 L85 120" stroke="#0B0C10" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Water streams */}
      <Path d="M75 95  Q55 120 45 150" stroke="#87CEEB" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <Path d="M90 100 Q85 130 80 155"  stroke="#87CEEB" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <Path d="M105 95 Q125 120 135 150" stroke="#87CEEB" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* Rock highlight */}
      <Ellipse cx="72" cy="52" rx="20" ry="12" fill="#B8C8D8" opacity="0.5" />
    </Svg>
  );
}

function DefaultButton({ done }) {
  return (
    <View style={[
      styles.tapBtn,
      done && styles.tapBtnDone,
    ]}>
      <Text style={styles.tapBtnText}>TAP!</Text>
    </View>
  );
}

// ── Particle system ───────────────────────────────────────────────────────

const particleId = { current: 0 };

function useParticles(taskId, taps) {
  const [particles, setParticles] = useState([]);
  const prevTaps = useRef(0);

  useEffect(() => {
    if (taps <= prevTaps.current) return;
    prevTaps.current = taps;

    const hasParticles = taskId === 'feeding_five_thousand' || taskId === 'water_from_rock';
    if (!hasParticles) return;

    const id = ++particleId.current;
    const cx = W * 0.35 + Math.random() * W * 0.3;
    const posAnim = new Animated.ValueXY({ x: cx, y: 0 });
    const opAnim  = new Animated.Value(1);
    const emoji   = taskId === 'water_from_rock' ? '💧' : taps % 2 === 0 ? '🍞' : '🐟';

    setParticles((p) => [...p, { id, posAnim, opAnim, emoji }]);

    Animated.parallel([
      Animated.timing(posAnim, {
        toValue:  { x: cx + (Math.random() - 0.5) * 80, y: -130 },
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(opAnim, {
        toValue:  0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setParticles((p) => p.filter((q) => q.id !== id));
    });
  }, [taps]);

  return particles;
}

// ── Main component ────────────────────────────────────────────────────────

export default function RapidTapTask({ config, onSuccess, onFail, timeLimit, taskId }) {
  const { targetTaps } = config;
  const [taps, setTaps] = useState(0);
  const [done, setDone] = useState(false);
  const [containerH, setContainerH] = useState(null);
  const fillAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const particles = useParticles(taskId, taps);

  // Overhead: paddingVertical(8*2=16) + counter(~50) + barTrack(18) + pct(~18) + gap*3(48) = ~150
  const btnSize = containerH ? Math.min(180, Math.max(80, containerH - 156)) : 150;

  const handleTap = () => {
    if (done) return;
    const next = taps + 1;
    setTaps(next);

    Animated.timing(fillAnim, {
      toValue:  Math.min(next / targetTaps, 1),
      duration: 80,
      useNativeDriver: false,
    }).start();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 60, useNativeDriver: true }),
    ]).start();

    if (next >= targetTaps) {
      setDone(true);
      onSuccess();
    }
  };

  const pct = Math.round((taps / targetTaps) * 100);

  // Per-task button
  const renderButton = () => {
    const wrapped = (children) => (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity onPress={handleTap} activeOpacity={0.8} disabled={done}>
          {children}
        </TouchableOpacity>
      </Animated.View>
    );

    switch (taskId) {
      case 'feeding_five_thousand':
        return wrapped(<BasketButton done={done} size={btnSize} />);
      case 'walls_of_jericho':
        return wrapped(<WallButton taps={taps} targetTaps={targetTaps} done={done} size={btnSize} />);
      case 'water_from_rock':
        return wrapped(<RockButton done={done} size={btnSize} />);
      default:
        return (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.tapBtn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, done && styles.tapBtnDone]}
              onPress={handleTap}
              activeOpacity={0.8}
              disabled={done}
            >
              <TaskSprite taskId={taskId} size={Math.round(btnSize * 0.55)} color={done ? colors.accent.neonGreen : colors.primary.electricBlue} />
            </TouchableOpacity>
          </Animated.View>
        );
    }
  };

  return (
    <TaskContainer scrollable={false} style={{ paddingHorizontal: 32, paddingVertical: 8 }} onLayout={e => setContainerH(e.nativeEvent.layout.height)}>
      <Text style={styles.counter}>{taps} / {targetTaps}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: fillAnim.interpolate({
                inputRange:  [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.pct}>{pct}%</Text>

      {renderButton()}

      {/* Floating particles */}
      {particles.map((p) => (
        <Animated.Text
          key={p.id}
          style={{
            position:  'absolute',
            bottom:    p.posAnim.y,
            left:      p.posAnim.x,
            opacity:   p.opAnim,
            fontSize:  26,
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </TaskContainer>
  );
}

const styles = StyleSheet.create({
  counter: {
    fontFamily: fonts.accent.bold,
    fontSize: 42,
    color: colors.text.primary,
  },
  barTrack: {
    width: '100%',
    height: 18,
    backgroundColor: colors.background.frost,
    borderRadius: 9,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent.neonGreen,
    borderRadius: 9,
  },
  pct: {
    fontFamily: fonts.accent.semiBold,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  tapBtn: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderWidth: 3,
    borderColor: colors.primary.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  tapBtnDone: {
    borderColor: colors.accent.neonGreen,
    backgroundColor: 'rgba(0, 255, 159, 0.12)',
    shadowColor: colors.accent.neonGreen,
  },
  tapBtnText: {
    fontFamily: fonts.display.black,
    fontSize: 32,
    color: colors.primary.electricBlue,
    letterSpacing: 4,
  },
});
