import React, { useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

// ── Layout constants ────────────────────────────────────────────────────────
const WALL_MARGIN  = 20;
const MORTAR       = 6;
const WALL_TOP     = 0.08;   // wall starts at 8% from top of play area
const SOURCE_TOP   = 0.58;   // loose bricks start at 58%

const BRICK_COLORS = [
  '#C09030', '#A07828', '#B88830', '#8B6914',
  '#C8A040', '#906818', '#D4A844', '#9A7020',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

// Compute the largest brick size that fits both width and height zones.
// Source bricks (2 rows) must not extend below areaH.
function computeBrickSize(count, areaW, areaH) {
  const cols = Math.ceil(count / 2);
  // Width-driven size
  const bWFromW = (areaW - 2 * WALL_MARGIN - (cols - 1) * MORTAR) / cols;
  const bHFromW = bWFromW / 2.2;
  // Height-driven size: SOURCE_TOP*areaH + 2*bH + MORTAR + 12 <= areaH
  const bHFromH = ((1 - SOURCE_TOP) * areaH - MORTAR - 12) / 2;
  const bH = Math.floor(Math.min(bHFromW, bHFromH));
  const bW = Math.floor(bH * 2.2);
  return { bW, bH };
}

function computeSlotPositions(count, areaW, areaH, bW, bH) {
  const cols = Math.ceil(count / 2);
  const topY = areaH * WALL_TOP;

  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Stagger odd rows by half a brick
    let x = WALL_MARGIN + col * (bW + MORTAR);
    if (row === 1) x += bW / 2;
    // Clamp right edge
    if (x + bW > areaW - WALL_MARGIN / 2) x = areaW - WALL_MARGIN / 2 - bW;
    const y = topY + row * (bH + MORTAR);
    return { x, y, w: bW, h: bH };
  });
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computeSourcePositions(count, areaW, areaH, bW, bH) {
  const cols     = Math.ceil(count / 2);
  const startY   = areaH * SOURCE_TOP;
  const indices  = shuffleArray(Array.from({ length: count }, (_, i) => i));
  return indices.map((_, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    return {
      x: WALL_MARGIN + col * (bW + MORTAR),
      y: startY + row * (bH + MORTAR + 8),
    };
  });
}

// ── Inner component (receives measured dimensions) ──────────────────────────

function BuildTaskInner({ config, onSuccess, taskId, areaW, areaH }) {
  const { brickCount, snapTolerance } = config;

  const doneRef     = useRef(false);
  const occupiedRef = useRef(new Set());
  const placedRef   = useRef(new Set());

  const [placedCount, setPlacedCount] = useState(0);
  const [dragTop, setDragTop]         = useState(-1); // index currently being dragged

  // Compute positions once
  const { bW, bH } = useMemo(
    () => computeBrickSize(brickCount, areaW, areaH),
    [brickCount, areaW, areaH],
  );
  const slots = useMemo(
    () => computeSlotPositions(brickCount, areaW, areaH, bW, bH),
    [brickCount, areaW, areaH, bW, bH],
  );
  const sources = useMemo(
    () => computeSourcePositions(brickCount, areaW, areaH, bW, bH),
    [brickCount, areaW, areaH, bW, bH],
  );

  // Create animated values + pan responders once
  const [brickPans] = useState(() =>
    sources.map(src => new Animated.ValueXY({ x: src.x, y: src.y })),
  );

  const responders = useRef(
    brickPans.map((pan, i) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !placedRef.current.has(i) && !doneRef.current,
        onPanResponderGrant: () => {
          pan.setOffset({ x: pan.x._value, y: pan.y._value });
          pan.setValue({ x: 0, y: 0 });
          setDragTop(i);
        },
        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false },
        ),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          const cx = pan.x._value + bW / 2;
          const cy = pan.y._value + bH / 2;

          // Find closest unoccupied slot
          let bestSlot = -1;
          let bestDist = Infinity;
          slots.forEach((slot, si) => {
            if (occupiedRef.current.has(si)) return;
            const sx = slot.x + slot.w / 2;
            const sy = slot.y + slot.h / 2;
            const d  = Math.sqrt((cx - sx) ** 2 + (cy - sy) ** 2);
            if (d < bestDist) { bestDist = d; bestSlot = si; }
          });

          if (bestSlot >= 0 && bestDist <= snapTolerance) {
            // Mark occupied immediately to prevent race conditions with simultaneous drags
            occupiedRef.current = new Set([...occupiedRef.current, bestSlot]);
            placedRef.current   = new Set([...placedRef.current, i]);
            // Snap into slot
            Animated.spring(pan, {
              toValue: { x: slots[bestSlot].x, y: slots[bestSlot].y },
              friction: 6,
              useNativeDriver: false,
            }).start(() => {
              setPlacedCount(prev => {
                const next = prev + 1;
                if (next === brickCount && !doneRef.current) {
                  doneRef.current = true;
                  onSuccess();
                }
                return next;
              });
            });
          } else {
            // Bounce back to source
            Animated.spring(pan, {
              toValue: { x: sources[i].x, y: sources[i].y },
              friction: 5,
              useNativeDriver: false,
            }).start();
          }
          setDragTop(-1);
        },
      }),
    ),
  ).current;

  // Render order: dragged brick last (on top)
  const renderOrder = useMemo(() => {
    const order = Array.from({ length: brickCount }, (_, i) => i);
    if (dragTop >= 0) {
      const idx = order.indexOf(dragTop);
      if (idx >= 0) {
        order.splice(idx, 1);
        order.push(dragTop);
      }
    }
    return order;
  }, [dragTop, brickCount]);

  const allPlaced = placedCount === brickCount;

  return (
    <View style={styles.inner}>
      {/* Instruction */}
      <Text style={styles.hint}>
        {allPlaced
          ? 'The wall is rebuilt!'
          : 'Drag each brick to an open slot'}
      </Text>

      {/* Wall background + slot outlines */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={areaW}
        height={areaH}
        pointerEvents="none"
      >
        {slots.map((slot, si) => (
          <Rect
            key={`slot-${si}`}
            x={slot.x}
            y={slot.y}
            width={slot.w}
            height={slot.h}
            rx={3}
            stroke={occupiedRef.current.has(si) ? colors.accent.neonGreen : '#5A4020'}
            strokeWidth={2}
            strokeDasharray={occupiedRef.current.has(si) ? '0' : '6,4'}
            fill={occupiedRef.current.has(si) ? 'rgba(0,255,159,0.12)' : 'rgba(90,64,32,0.15)'}
          />
        ))}
      </Svg>

      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.progress}>
          {placedCount} / {brickCount} placed
        </Text>
      </View>

      {/* Draggable bricks */}
      {renderOrder.map(i => (
        <Animated.View
          key={`brick-${i}`}
          style={[
            styles.brick,
            {
              width: bW,
              height: bH,
              backgroundColor: BRICK_COLORS[i % BRICK_COLORS.length],
              transform: brickPans[i].getTranslateTransform(),
            },
            placedRef.current.has(i) && styles.brickPlaced,
          ]}
          {...responders[i].panHandlers}
        />
      ))}
    </View>
  );
}

// ── Outer wrapper (measures layout) ─────────────────────────────────────────

export default function BuildTask({ config, onSuccess, onFail, taskId }) {
  const [areaSize, setAreaSize] = useState(null);

  const handleLayout = useCallback(e => {
    if (!areaSize) {
      const { width, height } = e.nativeEvent.layout;
      setAreaSize({ w: width, h: height });
    }
  }, [areaSize]);

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} onLayout={handleLayout}>
      {areaSize && (
        <BuildTaskInner
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

// ── Styles ──────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  inner: {
    flex: 1,
  },
  hint: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    zIndex: 10,
  },
  progressRow: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  progress: {
    fontFamily: fonts.accent.bold,
    fontSize: 20,
    color: colors.accent.amber,
    textAlign: 'center',
  },
  brick: {
    position: 'absolute',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(200,160,60,0.6)',
    elevation: 6,
    shadowColor: '#FFA63D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  brickPlaced: {
    borderColor: colors.accent.neonGreen,
    shadowColor: colors.accent.neonGreen,
    opacity: 0.85,
  },
});
