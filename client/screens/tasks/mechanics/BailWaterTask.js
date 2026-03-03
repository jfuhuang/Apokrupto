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
import { fonts } from '../../../theme/typography';

const { width: WINDOW_W } = Dimensions.get('window');
const PARTICLE_EMOJIS = ['💧', '🌊', '💧', '💧', '🌊'];

// ── Wave background ───────────────────────────────────────────────────────────
// Adapted from the WaveBackground previously in RapidTapTask.js (jonah_storm case)

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
        {/* Front wave */}
        <Path
          d={`M0 55 Q27 ${55 - amp} 55 55 Q82 ${55 + amp} 110 55 L110 100 L0 100Z`}
          fill="#003060"
          opacity="0.55"
        />
        {/* Mid wave */}
        <Path
          d={`M-5 68 Q27 ${68 - amp + 1} 55 68 Q82 ${68 + amp - 1} 115 68 L115 100 L-5 100Z`}
          fill="#004080"
          opacity="0.4"
        />
        {/* Back wave */}
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
          {/* Water drops at rim */}
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
    BUCKET_START:     { x: W * 0.12, y: H * 0.58 },
    RAIL_POS:         { x: W * 0.62, y: H * 0.30 },
    RAIL_ZONE:        { x: W * 0.44, y: H * 0.18, w: W * 0.46, h: H * 0.32 },
    DUMP_THRESHOLD_X: W * 0.40,
  };
}

// ── Main component ────────────────────────────────────────────────────────────

let particleSeq = 0;

export default function BailWaterTask({ config, onSuccess, onFail, timeLimit, taskId }) {
  const {
    cyclesRequired = 6,
    fillDurationMs = 1500,
  } = config || {};

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState('pickup'); // 'pickup'|'fill'|'dump'
  const [cyclesCompleted, setCycles]      = useState(0);
  const [containerSize, setContainerSize] = useState({ width: WINDOW_W, height: 500 });
  const [isFull, setIsFull]               = useState(false);
  const [particles, setParticles]         = useState([]);

  // ── Stable refs (PanResponder access) ──────────────────────────────────────
  const stepRef         = useRef('pickup');
  const isFullRef       = useRef(false);
  const cyclesRef       = useRef(0);
  const zonesRef        = useRef(computeZones(WINDOW_W, 500));
  const successFiredRef = useRef(false);
  const fillAnimRef     = useRef(null);

  // Animated values
  const bucketPos     = useRef(new Animated.ValueXY({
    x: zonesRef.current.BUCKET_START.x,
    y: zonesRef.current.BUCKET_START.y,
  })).current;
  const fillProgress  = useRef(new Animated.Value(0)).current;

  // ── Sync state → refs ──────────────────────────────────────────────────────
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { isFullRef.current = isFull; }, [isFull]);
  useEffect(() => { cyclesRef.current = cyclesCompleted; }, [cyclesCompleted]);

  // ── Recompute zones on layout ──────────────────────────────────────────────
  useEffect(() => {
    zonesRef.current = computeZones(containerSize.width, containerSize.height);
  }, [containerSize]);

  // ── Reset bucket to start pos when container size settles ─────────────────
  useEffect(() => {
    const { BUCKET_START } = zonesRef.current;
    bucketPos.setValue({ x: BUCKET_START.x, y: BUCKET_START.y });
  }, [containerSize]);

  // ── Action helpers (stable via useCallback, refs ensure fresh zone access) ─

  const snapToStart = useCallback(() => {
    const { BUCKET_START } = zonesRef.current;
    Animated.spring(bucketPos, {
      toValue: BUCKET_START,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, []);

  const dockAtRail = useCallback(() => {
    Animated.spring(bucketPos, {
      toValue: zonesRef.current.RAIL_POS,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, []);

  const spawnSplash = useCallback(() => {
    const { RAIL_POS, BUCKET_SIZE } = zonesRef.current;
    const cx = RAIL_POS.x + BUCKET_SIZE * 0.4;
    const cy = RAIL_POS.y + BUCKET_SIZE * 0.4;

    const batch = Array.from({ length: 5 }, (_, i) => {
      const pid = ++particleSeq;
      const posAnim = new Animated.ValueXY({ x: cx, y: cy });
      const opAnim  = new Animated.Value(1);
      const emoji   = PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length];

      Animated.parallel([
        Animated.timing(posAnim, {
          toValue: {
            x: cx + (Math.random() - 0.4) * 130,
            y: cy - 50 - Math.random() * 70,
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
    spawnSplash();
    const next = cyclesRef.current + 1;
    cyclesRef.current = next;
    setCycles(next);

    if (next >= cyclesRequired && !successFiredRef.current) {
      successFiredRef.current = true;
      onSuccess();
      return;
    }

    // Reset for next cycle
    isFullRef.current = false;
    stepRef.current   = 'pickup';
    setIsFull(false);
    setStep('pickup');
    fillProgress.setValue(0);
    snapToStart();
  }, [cyclesRequired, onSuccess, spawnSplash, snapToStart]);

  const startFill = useCallback(() => {
    if (stepRef.current !== 'fill') return;
    fillProgress.setValue(0);
    const anim = Animated.timing(fillProgress, {
      toValue: 1,
      duration: fillDurationMs,
      useNativeDriver: false,
    });
    fillAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && stepRef.current === 'fill') {
        isFullRef.current = true;
        stepRef.current   = 'dump';
        setIsFull(true);
        setStep('dump');
      }
    });
  }, [fillDurationMs]);

  const cancelFill = useCallback(() => {
    if (fillAnimRef.current) {
      fillAnimRef.current.stop();
      fillAnimRef.current = null;
    }
    fillProgress.setValue(0);
    if (stepRef.current === 'fill') {
      isFullRef.current = false;
      stepRef.current   = 'pickup';
      setIsFull(false);
      setStep('pickup');
      snapToStart();
    }
  }, [snapToStart]);

  // ── PanResponder ──────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // In 'fill' mode we only need press, not move
      onMoveShouldSetPanResponder:  () => stepRef.current !== 'fill',

      onPanResponderGrant: () => {
        if (stepRef.current === 'fill') {
          startFill();
          return;
        }
        // Capture current position for drag
        bucketPos.setOffset({ x: bucketPos.x._value, y: bucketPos.y._value });
        bucketPos.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (evt, gestureState) => {
        if (stepRef.current === 'fill') return;
        bucketPos.setValue({ x: gestureState.dx, y: gestureState.dy });
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (stepRef.current === 'fill') {
          cancelFill();
          return;
        }

        bucketPos.flattenOffset();
        const finalX = bucketPos.x._value;
        const finalY = bucketPos.y._value;
        const { RAIL_ZONE, DUMP_THRESHOLD_X } = zonesRef.current;

        if (stepRef.current === 'pickup') {
          const inRail =
            finalX >= RAIL_ZONE.x &&
            finalX <= RAIL_ZONE.x + RAIL_ZONE.w &&
            finalY >= RAIL_ZONE.y &&
            finalY <= RAIL_ZONE.y + RAIL_ZONE.h;

          if (inRail) {
            stepRef.current = 'fill';
            setStep('fill');
            dockAtRail();
          } else {
            snapToStart();
          }
        } else if (stepRef.current === 'dump') {
          if (finalX < DUMP_THRESHOLD_X) {
            completeCycle();
          } else {
            dockAtRail();
          }
        }
      },

      onPanResponderTerminate: () => {
        if (stepRef.current === 'fill') {
          cancelFill();
          return;
        }
        bucketPos.flattenOffset();
        snapToStart();
      },
    })
  ).current;

  // ── Derived display values ────────────────────────────────────────────────

  const H             = containerSize.height;
  const { BUCKET_SIZE } = zonesRef.current;
  const gaugeH        = H * 0.55;
  const gaugeFillH    = ((cyclesRequired - cyclesCompleted) / cyclesRequired) * gaugeH;

  const stepLabels = [
    { key: 'pickup', label: 'PICK UP' },
    { key: 'fill',   label: 'FILL' },
    { key: 'dump',   label: 'DUMP' },
  ];

  return (
    <View
      style={styles.container}
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

      {/* ── Rail / overboard zone hint ── */}
      <View
        style={[
          styles.railHint,
          {
            right: 14,
            top:   H * 0.18,
            width: containerSize.width * 0.32,
            height: H * 0.32,
          },
        ]}
      >
        <Text style={styles.railLabel}>OVERBOARD</Text>
      </View>

      {/* ── Cycles counter ── */}
      <Text style={[styles.cyclesText, { top: H * 0.10 }]}>
        {cyclesCompleted} / {cyclesRequired}
      </Text>

      {/* ── Draggable bucket ── */}
      <Animated.View
        style={[
          styles.bucketWrapper,
          {
            left:   bucketPos.x,
            top:    bucketPos.y,
            width:  BUCKET_SIZE,
            height: BUCKET_SIZE + 16,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {step === 'fill' && <FillRing progress={fillProgress} size={BUCKET_SIZE} />}
        <BucketSvg size={BUCKET_SIZE} isFull={isFull} />
        {step === 'fill' && (
          <Text style={styles.holdHint}>HOLD</Text>
        )}
      </Animated.View>

      {/* ── Step indicator ── */}
      <View style={[styles.stepRow, { bottom: 16 }]}>
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
    </View>
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
  container: {
    flex: 1,
    overflow: 'hidden',
  },

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

  // ── Rail hint ───────────────────────────────────────────────────────────
  railHint: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    paddingTop: 5,
  },
  railLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 8,
    letterSpacing: 1.5,
    color: 'rgba(0,212,255,0.35)',
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

  // ── Bucket ──────────────────────────────────────────────────────────────
  bucketWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdHint: {
    position: 'absolute',
    bottom: -14,
    fontFamily: fonts.accent.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.primary.electricBlue,
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
