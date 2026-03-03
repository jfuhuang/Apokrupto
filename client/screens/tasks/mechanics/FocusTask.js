import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const ICON_SIZE = 60;
const EDGE_PAD = 55;
const BASE_SPEED = 80;
const MAX_SPEED_MULT = 2.5;
const WAYPOINT_PROXIMITY = 25;
const PERP_AMPLITUDE = 12;
const MIN_WAYPOINT_DIST = 100;

// ── SVG sub-components ──────────────────────────────────────────────────────

function CrossSvg() {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="28" fill="#FFD700" opacity={0.12} />
      <Circle cx="30" cy="30" r="22" fill="#FFD700" opacity={0.08} />
      <Rect x="25" y="8" width="10" height="44" rx="2" fill="#FFD700" />
      <Rect x="13" y="18" width="34" height="10" rx="2" fill="#FFD700" />
      <Rect x="26.5" y="9.5" width="7" height="41" rx="1.5" fill="#FFFDE7" opacity={0.55} />
      <Rect x="14.5" y="19.5" width="31" height="7" rx="1.5" fill="#FFFDE7" opacity={0.55} />
      <Circle cx="30" cy="23" r="3" fill="#FFFDE7" opacity={0.7} />
    </Svg>
  );
}



// ── Helpers ──────────────────────────────────────────────────────────────────

function pickWaypoint(areaW, areaH, currentPos) {
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const x = EDGE_PAD + Math.random() * (areaW - EDGE_PAD * 2 - ICON_SIZE);
    const y = EDGE_PAD + Math.random() * (areaH - EDGE_PAD * 2 - ICON_SIZE);
    if (!currentPos) return { x, y };
    const d = Math.hypot(x - currentPos.x, y - currentPos.y);
    if (d >= MIN_WAYPOINT_DIST) return { x, y };
  }
  return {
    x: EDGE_PAD + Math.random() * (areaW - EDGE_PAD * 2 - ICON_SIZE),
    y: EDGE_PAD + Math.random() * (areaH - EDGE_PAD * 2 - ICON_SIZE),
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ── Inner component ─────────────────────────────────────────────────────────

function FocusTaskInner({ config, onSuccess, onFail, areaW, areaH }) {
  const {
    duration = 8,
    drainRate = 1.8,
    iconSpeed = 0.6,
    tolerance = 45,
    startFaith = 0.5,
  } = config;

  // ── state ──────────────────────────────────────────────────────────────
  const [faithPct, setFaithPct] = useState(Math.round(startFaith * 100));
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);

  // ── refs ───────────────────────────────────────────────────────────────
  const doneRef = useRef(false);
  const faithRef = useRef(startFaith);
  const touchingRef = useRef(false);
  const fingerPosRef = useRef(null);
  const iconPosRef = useRef({
    x: areaW / 2 - ICON_SIZE / 2,
    y: areaH * 0.35,
  });
  const waypointRef = useRef(pickWaypoint(areaW, areaH, iconPosRef.current));
  const startTimeRef = useRef(null);
  const lastFrameRef = useRef(null);
  const frameIdRef = useRef(null);

  // ── animated values ────────────────────────────────────────────────────
  const faithAnim = useRef(new Animated.Value(startFaith)).current;
  const iconX = useRef(new Animated.Value(iconPosRef.current.x)).current;
  const iconY = useRef(new Animated.Value(iconPosRef.current.y)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // ── PanResponder ──────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !doneRef.current,
      onMoveShouldSetPanResponder: () => !doneRef.current,

      onPanResponderGrant: (evt) => {
        fingerPosRef.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
        touchingRef.current = true;
      },

      onPanResponderMove: (evt) => {
        fingerPosRef.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
      },

      onPanResponderRelease: () => {
        touchingRef.current = false;
        fingerPosRef.current = null;
      },

      onPanResponderTerminate: () => {
        touchingRef.current = false;
        fingerPosRef.current = null;
      },
    })
  ).current;

  // ── looping animations ─────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── game loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    startTimeRef.current = Date.now();
    lastFrameRef.current = Date.now();

    const fillRate = 1 / (duration * 1000); // per ms
    const drain = fillRate * drainRate;

    const minX = EDGE_PAD;
    const maxX = areaW - EDGE_PAD - ICON_SIZE;
    const minY = EDGE_PAD;
    const maxY = areaH - EDGE_PAD - ICON_SIZE;

    const tick = () => {
      if (doneRef.current) return;

      const now = Date.now();
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;
      const elapsed = (now - startTimeRef.current) / 1000;

      // ── move icon ────────────────────────────────────────────────────
      const speedMult = 1 + (elapsed / duration) * (MAX_SPEED_MULT - 1);
      const speed = BASE_SPEED * iconSpeed * speedMult;

      const wp = waypointRef.current;
      const pos = iconPosRef.current;
      const dx = wp.x - pos.x;
      const dy = wp.y - pos.y;
      const dist = Math.hypot(dx, dy);

      if (dist < WAYPOINT_PROXIMITY) {
        waypointRef.current = pickWaypoint(areaW, areaH, pos);
      } else {
        const nx = dx / dist;
        const ny = dy / dist;
        const moveX = nx * speed * (dt / 1000);
        const moveY = ny * speed * (dt / 1000);

        const sinVal = Math.sin(elapsed * 2.5);
        const perpX = -ny * sinVal * PERP_AMPLITUDE * speedMult * (dt / 1000);
        const perpY = nx * sinVal * PERP_AMPLITUDE * speedMult * (dt / 1000);

        const newX = clamp(pos.x + moveX + perpX, minX, maxX);
        const newY = clamp(pos.y + moveY + perpY, minY, maxY);

        iconPosRef.current = { x: newX, y: newY };
        iconX.setValue(newX);
        iconY.setValue(newY);
      }

      // ── check touch distance ──────────────────────────────────────────
      let isTouchingIcon = false;
      if (touchingRef.current && fingerPosRef.current) {
        const icx = iconPosRef.current.x + ICON_SIZE / 2;
        const icy = iconPosRef.current.y + ICON_SIZE / 2;
        const fdx = fingerPosRef.current.x - icx;
        const fdy = fingerPosRef.current.y - icy;
        const fingerDist = Math.hypot(fdx, fdy);
        isTouchingIcon = fingerDist <= tolerance;
      }

      // ── update faith ──────────────────────────────────────────────────
      if (isTouchingIcon) {
        faithRef.current = Math.min(1, faithRef.current + fillRate * dt);
      } else {
        faithRef.current = Math.max(0, faithRef.current - drain * dt);
      }

      faithAnim.setValue(faithRef.current);
      setFaithPct(Math.round(faithRef.current * 100));

      // ── win / lose ────────────────────────────────────────────────────
      if (faithRef.current >= 1.0) {
        doneRef.current = true;
        setCompleted(true);
        setTimeout(() => onSuccess(), 400);
        return;
      }

      if (faithRef.current <= 0.0) {
        doneRef.current = true;
        setFailed(true);
        setTimeout(() => onFail(), 400);
        return;
      }

      frameIdRef.current = requestAnimationFrame(tick);
    };

    frameIdRef.current = requestAnimationFrame(tick);

    return () => {
      doneRef.current = true;
      cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  // ── derived animated values ────────────────────────────────────────────
  const sinkingOpacity = faithAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.2, 0],
  });

  const meterWidth = faithAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const meterColor = faithAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [
      colors.primary.neonRed,
      colors.accent.amber,
      colors.primary.electricBlue,
      colors.accent.neonGreen,
    ],
  });

  const crossScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.0, 1.15],
  });

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
      {/* Sinking overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.sinkingOverlay, { opacity: sinkingOpacity }]}
        pointerEvents="none"
      />

      {/* Faith meter */}
      <View style={styles.meterContainer}>
        <View style={styles.meterTrack}>
          <Animated.View
            style={[styles.meterFill, { width: meterWidth, backgroundColor: meterColor }]}
          />
        </View>
        <Text style={[styles.meterPct, {
          color: completed ? colors.accent.neonGreen
               : failed ? colors.primary.neonRed
               : faithPct > 70 ? colors.primary.electricBlue
               : faithPct > 30 ? colors.accent.amber
               : colors.primary.neonRed,
        }]}>
          {faithPct}%
        </Text>
      </View>

      {/* Instruction */}
      <Text style={styles.instruction}>
        {completed
          ? 'Your faith held firm!'
          : failed
          ? 'You let go... you sank.'
          : 'Press and hold your finger on the glowing cross — keep it there as it moves!'}
      </Text>

      {/* Drifting cross icon */}
      <Animated.View
        style={[styles.crossContainer, { left: iconX, top: iconY }]}
        pointerEvents="none"
      >
        <Animated.View style={{ transform: [{ scale: crossScale }] }}>
          <CrossSvg />
        </Animated.View>
      </Animated.View>

      {/* Result overlay */}
      {(completed || failed) && (
        <View style={styles.resultOverlay}>
          <Text
            style={[
              styles.resultIcon,
              { color: completed ? colors.accent.neonGreen : colors.primary.neonRed },
            ]}
          >
            {completed ? '✓' : '✕'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Outer wrapper — measures layout before rendering inner ────────────────

export default function FocusTask({ config, onSuccess, onFail, taskId }) {
  const [areaSize, setAreaSize] = useState(null);

  const handleLayout = useCallback(
    (e) => {
      if (!areaSize) {
        const { width, height } = e.nativeEvent.layout;
        setAreaSize({ w: width, h: height });
      }
    },
    [areaSize]
  );

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} style={{ backgroundColor: colors.background.space }} onLayout={handleLayout}>
      {areaSize && (
        <FocusTaskInner
          config={config}
          onSuccess={onSuccess}
          onFail={onFail}
          taskId={taskId}
          areaW={areaSize.w}
          areaH={areaSize.h}
        />
      )}
    </TaskContainer>
  );
}

const styles = StyleSheet.create({

  sinkingOverlay: {
    backgroundColor: '#001830',
  },

  meterContainer: {
    position: 'absolute',
    top: 12,
    left: 20,
    right: 20,
    alignItems: 'center',
    gap: 4,
  },
  meterTrack: {
    width: '100%',
    height: 14,
    backgroundColor: colors.background.frost,
    borderRadius: 7,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 7,
  },
  meterPct: {
    fontFamily: fonts.accent.bold,
    fontSize: 16,
  },

  instruction: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    fontFamily: fonts.ui.semiBold,
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  crossContainer: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 12, 16, 0.6)',
  },
  resultIcon: {
    fontFamily: fonts.display.bold,
    fontSize: 56,
    letterSpacing: 3,
  },
});
