import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const { width: WINDOW_W } = Dimensions.get('window');
const PARTICLE_EMOJIS = ['💧', '🌊', '💧', '💧', '🌊'];

// step values: 'carry' | 'filling' | 'dump'

// ── Wave background ───────────────────────────────────────────────────────────

function WaveBackground({ urgent }) {
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: urgent ? 700 : 1200,
        useNativeDriver: true,
      })
    ).start();
  }, [urgent]);

  const tx = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const amp = urgent ? 5 : 3;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }] }]}
      pointerEvents="none"
    >
      <Svg width="110%" height="100%" viewBox="0 0 110 100" preserveAspectRatio="none">
        <Path
          d={`M0 55 Q27 ${55 - amp} 55 55 Q82 ${55 + amp} 110 55 L110 100 L0 100Z`}
          fill="#003060"
          opacity="0.55"
        />
        <Path
          d={`M-5 68 Q27 ${68 - amp + 1} 55 68 Q82 ${68 + amp - 1} 115 68 L115 100 L-5 100Z`}
          fill="#004080"
          opacity="0.4"
        />
        <Path
          d="M-10 78 Q27 76 55 78 Q82 80 115 78 L115 100 L-10 100Z"
          fill="#002050"
          opacity="0.35"
        />
      </Svg>
    </Animated.View>
  );
}

// ── Bucket SVG ────────────────────────────────────────────────────────────────

function BucketSvg({ size, isFull }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {/* Handle arc */}
      <Path
        d="M15 19 Q30 5 45 19"
        stroke="#C09030"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Bucket body */}
      <Path d="M13 21 L11 51 L49 51 L47 21Z" fill="#C09030" opacity="0.9" />
      {/* Rim */}
      <Ellipse cx="30" cy="21" rx="17" ry="5" fill="#C09030" />
      {/* Bottom */}
      <Ellipse cx="30" cy="51" rx="19" ry="5" fill="#C09030" opacity="0.8" />
      {/* Metal band */}
      <Path d="M12 36 L48 36" stroke="#8A6010" strokeWidth="2" opacity="0.6" />
      {/* Water fill (full state) */}
      {isFull && (
        <>
          <Path
            d="M13 25 L12 44 L48 44 L47 25Z"
            fill={colors.primary.electricBlue}
            opacity="0.45"
          />
          <Ellipse cx="30" cy="25" rx="17" ry="4" fill={colors.primary.electricBlue} opacity="0.55" />
          <Ellipse cx="20" cy="22" rx="2.5" ry="2" fill={colors.primary.electricBlue} opacity="0.7" />
          <Ellipse cx="40" cy="22" rx="2.5" ry="2" fill={colors.primary.electricBlue} opacity="0.7" />
        </>
      )}
    </Svg>
  );
}

// ── Fill progress ring ────────────────────────────────────────────────────────

function FillRing({ progress, size }) {
  const borderWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size + 18,
        height: size + 18,
        borderRadius: (size + 18) / 2,
        borderWidth,
        borderColor: colors.primary.electricBlue,
        opacity: 0.85,
        alignSelf: 'center',
      }}
    />
  );
}

// ── Zone layout helper ────────────────────────────────────────────────────────

function computeZones(W, H) {
  const BUCKET_SIZE = Math.min(72, W * 0.19);
  return {
    BUCKET_SIZE,
    // bucket resting position (bottom-centre)
    BUCKET_START: { x: W * 0.5 - BUCKET_SIZE * 0.5, y: H * 0.70 },
    // where the bucket snaps when dropped in the fill zone
    CENTER_POS:   { x: W * 0.5 - BUCKET_SIZE * 0.5, y: H * 0.35 },
    // hit-test rectangle for "is bucket over the fill zone?"
    CENTER_ZONE:  { x: W * 0.28, y: H * 0.22, w: W * 0.44, h: H * 0.32 },
    // how far from each edge a release counts as "tossed overboard"
    DUMP_MARGIN:  W * 0.22,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

let particleSeq = 0;

export default function BailWaterTask({ config, onSuccess, onFail, timeLimit, taskId }) {
  const {
    cyclesRequired = 3,
    fillDurationMs = 600,   // fast passive fill
  } = config || {};

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState('carry'); // 'carry'|'filling'|'dump'
  const [cyclesCompleted, setCycles]      = useState(0);
  const [containerSize, setContainerSize] = useState({ width: WINDOW_W, height: 500 });
  const [isFull, setIsFull]               = useState(false);
  const [particles, setParticles]         = useState([]);

  // ── Stable refs ────────────────────────────────────────────────────────────
  const stepRef         = useRef('carry');
  const isFullRef       = useRef(false);
  const cyclesRef       = useRef(0);
  const zonesRef        = useRef(computeZones(WINDOW_W, 500));
  const successFiredRef = useRef(false);
  const fillAnimRef     = useRef(null);

  // Animated values
  const bucketPos    = useRef(new Animated.ValueXY({
    x: zonesRef.current.BUCKET_START.x,
    y: zonesRef.current.BUCKET_START.y,
  })).current;
  const fillProgress = useRef(new Animated.Value(0)).current;

  // ── Sync state → refs ──────────────────────────────────────────────────────
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { isFullRef.current = isFull; }, [isFull]);
  useEffect(() => { cyclesRef.current = cyclesCompleted; }, [cyclesCompleted]);

  // ── Recompute zones on layout ──────────────────────────────────────────────
  useEffect(() => {
    zonesRef.current = computeZones(containerSize.width, containerSize.height);
  }, [containerSize]);

  // ── Reset bucket position when container size settles ─────────────────────
  useEffect(() => {
    bucketPos.setValue(zonesRef.current.BUCKET_START);
  }, [containerSize]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const snapTo = useCallback((pos) => {
    Animated.spring(bucketPos, {
      toValue: pos,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, []);

  const snapToStart  = useCallback(() => snapTo(zonesRef.current.BUCKET_START), [snapTo]);
  const snapToCenter = useCallback(() => snapTo(zonesRef.current.CENTER_POS), [snapTo]);

  const spawnSplash = useCallback((cx, cy) => {
    const batch = Array.from({ length: 5 }, (_, i) => {
      const pid     = ++particleSeq;
      const posAnim = new Animated.ValueXY({ x: cx, y: cy });
      const opAnim  = new Animated.Value(1);
      const emoji   = PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length];

      Animated.parallel([
        Animated.timing(posAnim, {
          toValue: {
            x: cx + (Math.random() - 0.5) * 160,
            y: cy - 40 - Math.random() * 80,
          },
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.timing(opAnim, {
          toValue: 0,
          duration: 700,
          useNativeDriver: false,
        }),
      ]).start(() => setParticles((p) => p.filter((q) => q.id !== pid)));

      return { id: pid, posAnim, opAnim, emoji };
    });
    setParticles((p) => [...p, ...batch]);
  }, []);

  const completeCycle = useCallback(() => {
    const { BUCKET_SIZE } = zonesRef.current;
    spawnSplash(
      bucketPos.x._value + BUCKET_SIZE * 0.4,
      bucketPos.y._value + BUCKET_SIZE * 0.4,
    );

    const next = cyclesRef.current + 1;
    cyclesRef.current = next;
    setCycles(next);

    if (next >= cyclesRequired && !successFiredRef.current) {
      successFiredRef.current = true;
      onSuccess();
      return;
    }

    isFullRef.current = false;
    stepRef.current   = 'carry';
    setIsFull(false);
    setStep('carry');
    fillProgress.setValue(0);
    snapToStart();
  }, [cyclesRequired, onSuccess, spawnSplash, snapToStart]);

  // Auto-fill: starts passively once bucket is dropped in the center zone
  const startAutoFill = useCallback(() => {
    fillProgress.setValue(0);
    const anim = Animated.timing(fillProgress, {
      toValue: 1,
      duration: fillDurationMs,
      useNativeDriver: false,
    });
    fillAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && stepRef.current === 'filling') {
        isFullRef.current = true;
        stepRef.current   = 'dump';
        setIsFull(true);
        setStep('dump');
      }
    });
  }, [fillDurationMs]);

  // ── PanResponder ──────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      // Block gestures while the bucket is auto-filling
      onStartShouldSetPanResponder: () => stepRef.current !== 'filling',
      onMoveShouldSetPanResponder:  () => stepRef.current !== 'filling',

      onPanResponderGrant: () => {
        bucketPos.setOffset({ x: bucketPos.x._value, y: bucketPos.y._value });
        bucketPos.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (evt, gestureState) => {
        bucketPos.setValue({ x: gestureState.dx, y: gestureState.dy });
      },

      onPanResponderRelease: (evt, gestureState) => {
        bucketPos.flattenOffset();
        const finalX = bucketPos.x._value;
        const finalY = bucketPos.y._value;
        const { CENTER_ZONE, DUMP_MARGIN, BUCKET_SIZE } = zonesRef.current;
        const W = containerSize.width;

        if (stepRef.current === 'carry') {
          // Hit-test: bucket centre over fill zone?
          const cx = finalX + BUCKET_SIZE * 0.5;
          const cy = finalY + BUCKET_SIZE * 0.5;
          const inCenter =
            cx >= CENTER_ZONE.x &&
            cx <= CENTER_ZONE.x + CENTER_ZONE.w &&
            cy >= CENTER_ZONE.y &&
            cy <= CENTER_ZONE.y + CENTER_ZONE.h;

          if (inCenter) {
            stepRef.current = 'filling';
            setStep('filling');
            snapToCenter();
            startAutoFill();
          } else {
            snapToStart();
          }
        } else if (stepRef.current === 'dump') {
          // Toss to either side
          const tossedLeft  = finalX < DUMP_MARGIN;
          const tossedRight = finalX + BUCKET_SIZE > W - DUMP_MARGIN;
          if (tossedLeft || tossedRight) {
            completeCycle();
          } else {
            snapToCenter();
          }
        }
      },

      onPanResponderTerminate: () => {
        bucketPos.flattenOffset();
        if (stepRef.current !== 'filling') snapToStart();
      },
    })
  ).current;

  // ── Derived display values ────────────────────────────────────────────────

  const H = containerSize.height;
  const W = containerSize.width;
  const { BUCKET_SIZE, CENTER_ZONE, DUMP_MARGIN } = zonesRef.current;
  const gaugeH     = H * 0.55;
  const gaugeFillH = ((cyclesRequired - cyclesCompleted) / cyclesRequired) * gaugeH;

  const stepLabels = [
    { key: 'carry',   label: 'CARRY' },
    { key: 'filling', label: 'FILL' },
    { key: 'dump',    label: 'TOSS' },
  ];

  return (
    <TaskContainer
      scrollable={false} centered={false} padded={false}
      style={{ overflow: 'hidden' }}
      onLayout={(e) =>
        setContainerSize({
          width:  e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {/* ── Wave background ── */}
      <WaveBackground urgent={step === 'dump'} />

      {/* ── Water-level gauge (left edge) ── */}
      <View style={[styles.gaugeTrack, { height: gaugeH, top: H * 0.16 }]}>
        <View style={[styles.gaugeFill, { height: gaugeFillH }]} />
      </View>
      <Text style={[styles.gaugeLabel, { top: H * 0.16 - 16 }]}>WATER</Text>

      {/* ── Center fill zone indicator (shown while carrying) ── */}
      {step === 'carry' && (
        <View
          pointerEvents="none"
          style={[
            styles.centerHint,
            {
              left:   CENTER_ZONE.x,
              top:    CENTER_ZONE.y,
              width:  CENTER_ZONE.w,
              height: CENTER_ZONE.h,
            },
          ]}
        >
          <Text style={styles.centerHintEmoji}>🌊</Text>
          <Text style={styles.centerHintLabel}>DROP TO FILL</Text>
          <Text style={styles.centerHintSub}>lower bucket into sea</Text>
        </View>
      )}

      {/* ── Side dump hints (shown when ready to toss) ── */}
      {step === 'dump' && (
        <>
          <View pointerEvents="none" style={[styles.dumpHint, {
            left: 0, width: DUMP_MARGIN, top: H * 0.25, height: H * 0.50,
          }]}>
            <Text style={styles.dumpArrow}>{'←'}</Text>
            <Text style={styles.dumpHintLabel}>TOSS{`\n`}OVER</Text>
          </View>
          <View pointerEvents="none" style={[styles.dumpHint, {
            right: 0, width: DUMP_MARGIN, top: H * 0.25, height: H * 0.50,
          }]}>
            <Text style={styles.dumpArrow}>{'→'}</Text>
            <Text style={styles.dumpHintLabel}>TOSS{`\n`}OVER</Text>
          </View>
        </>
      )}

      {/* ── Cycles counter ── */}
      <Text style={[styles.cyclesText, { top: H * 0.06 }]}>
        {cyclesCompleted} / {cyclesRequired}
      </Text>
      <Text style={[styles.cyclesSubLabel, { top: H * 0.06 + 28 }]}>BUCKETS BAILED</Text>

      {/* ── Per-step instruction banner ── */}
      <View pointerEvents="none" style={[styles.instructionBanner, { top: H * 0.10 }]}>
        {step === 'carry' && (
          <Text style={styles.instructionText}>🪣 Drag the bucket into the centre</Text>
        )}
        {step === 'filling' && (
          <Text style={[styles.instructionText, styles.instructionFilling]}>💧 Filling — wait for it...</Text>
        )}
        {step === 'dump' && (
          <Text style={[styles.instructionText, styles.instructionDump]}>⚡ Bucket full! Toss it overboard!</Text>
        )}
      </View>

      {/* ── Draggable bucket ── */}
      <Animated.View
        style={[
          styles.bucketWrapper,
          {
            left:   bucketPos.x,
            top:    bucketPos.y,
            width:  BUCKET_SIZE,
            height: BUCKET_SIZE + 16,
            zIndex: 10,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {step === 'filling' && <FillRing progress={fillProgress} size={BUCKET_SIZE} />}
        <BucketSvg size={BUCKET_SIZE} isFull={isFull} />
      </Animated.View>

      {/* ── Step indicator ── */}
      <View pointerEvents="none" style={[styles.stepRow, { bottom: 16 }]}>
        {stepLabels.map(({ key, label }) => (
          <View key={key} style={styles.stepItem}>
            <View style={[styles.stepDot, step === key && styles.stepDotActive]} />
            <Text style={[styles.stepText, step === key && styles.stepTextActive]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Splash particles ── */}
      {particles.map((p) => (
        <Animated.Text
          key={p.id}
          style={[
            styles.particle,
            { left: p.posAnim.x, top: p.posAnim.y, opacity: p.opAnim },
          ]}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </TaskContainer>
  );
}

BailWaterTask.propTypes = {
  config: PropTypes.shape({
    cyclesRequired: PropTypes.number,
    fillDurationMs: PropTypes.number,
  }),
  onSuccess: PropTypes.func.isRequired,
  onFail:    PropTypes.func.isRequired,
  timeLimit: PropTypes.number,
  taskId:    PropTypes.string,
};

const styles = StyleSheet.create({


  // ── Gauge ───────────────────────────────────────────────────────────────
  gaugeTrack: {
    position: 'absolute',
    left: 10,
    width: 10,
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  gaugeFill: {
    width: '100%',
    backgroundColor: colors.primary.electricBlue,
    borderRadius: 5,
    opacity: 0.85,
  },
  gaugeLabel: {
    position: 'absolute',
    left: 4,
    fontFamily: fonts.accent.bold,
    fontSize: 7,
    letterSpacing: 1,
    color: colors.primary.electricBlue,
    opacity: 0.65,
  },

  // ── Center fill zone hint ────────────────────────────────────────────────
  centerHint: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.40)',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  centerHintEmoji: {
    fontSize: 22,
  },
  centerHintLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: 'rgba(0,212,255,0.65)',
  },
  centerHintSub: {
    fontFamily: fonts.body?.regular ?? fonts.accent.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: 'rgba(0,212,255,0.40)',
  },

  // ── Dump side hints ──────────────────────────────────────────────────────
  dumpHint: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dumpArrow: {
    fontFamily: fonts.display.bold,
    fontSize: 32,
    color: '#FFD060',
    opacity: 0.7,
  },
  dumpHintLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#FFD060',
    opacity: 0.55,
    textAlign: 'center',
  },

  // ── Cycles counter ──────────────────────────────────────────────────────
  cyclesText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.display.bold,
    fontSize: 20,
    letterSpacing: 3,
    color: colors.text.primary,
  },
  cyclesSubLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fonts.accent.bold,
    fontSize: 8,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.30)',
  },

  // ── Instruction banner ──────────────────────────────────────────────────
  instructionBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  instructionText: {
    fontFamily: fonts.accent.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  instructionFilling: {
    color: colors.primary.electricBlue,
  },
  instructionDump: {
    color: '#FFD060',
  },

  // ── Bucket ──────────────────────────────────────────────────────────────
  bucketWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Step indicator ──────────────────────────────────────────────────────
  stepRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary.electricBlue,
    shadowColor: colors.primary.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  stepText: {
    fontFamily: fonts.accent.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.25)',
  },
  stepTextActive: {
    color: colors.primary.electricBlue,
  },

  // ── Particles ───────────────────────────────────────────────────────────
  particle: {
    position: 'absolute',
    fontSize: 22,
  },
});
