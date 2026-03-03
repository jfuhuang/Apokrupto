import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const SLOT_W = 82;
const SLOT_H = 34;
const SLOT_GAP = 10;
const TILE_H = 34;
const TILE_GAP = 8;
const SNAP_TOL = 65;
const NUM_BLANKS = 3;

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Inner component (receives measured layout) ───────────────────────────────

function ScriptureBlankTaskInner({ config, onSuccess, onFail, areaW, areaH }) {
  const { verseParts, blanks, distractors, reference } = config;

  // ── tile pool: 3 correct + 3 distractors, shuffled once ──────────────────
  const [tilePool] = useState(() =>
    shuffleArray([
      ...blanks.map((word, i) => ({ id: i, word, correctSlot: i })),
      ...distractors.map((word, i) => ({ id: 3 + i, word, correctSlot: -1 })),
    ])
  );

  // ── layout ────────────────────────────────────────────────────────────────
  const VERSE_H = Math.round(areaH * 0.38);
  const SLOT_ROW_TOP = Math.round(areaH * 0.43);
  const TILE_ROW_TOP = Math.round(areaH * 0.62);
  const TILE_W = SLOT_W;

  const totalSlotsW = NUM_BLANKS * SLOT_W + (NUM_BLANKS - 1) * SLOT_GAP;
  const slotStartX = (areaW - totalSlotsW) / 2;

  const slotPositions = Array.from({ length: NUM_BLANKS }, (_, i) => ({
    x: slotStartX + i * (SLOT_W + SLOT_GAP),
    y: SLOT_ROW_TOP,
    w: SLOT_W,
    h: SLOT_H,
  }));

  const totalTilesRowW = 3 * TILE_W + 2 * TILE_GAP;
  const tileStartX = (areaW - totalTilesRowW) / 2;

  const tileSourcePositions = tilePool.map((_, i) => ({
    x: tileStartX + (i % 3) * (TILE_W + TILE_GAP),
    y: TILE_ROW_TOP + Math.floor(i / 3) * (TILE_H + TILE_GAP),
  }));

  // ── state & refs ──────────────────────────────────────────────────────────
  const [placedSlots, setPlacedSlots] = useState(() => new Array(6).fill(null));
  const [draggingTileIdx, setDraggingTileIdx] = useState(null);
  const [flashResult, setFlashResult] = useState(null); // null | 'correct' | 'wrong'
  const [showHint, setShowHint] = useState(false);

  const placedSlotsRef = useRef(new Array(6).fill(null)); // [tileIdx] → slotIdx | null
  const occupiedRef = useRef(new Set()); // slotIdx values currently occupied
  const doneRef = useRef(false);

  // ── animated values (one per tile) ───────────────────────────────────────
  const [tilePans] = useState(() =>
    tileSourcePositions.map(src => new Animated.ValueXY({ x: src.x, y: src.y }))
  );

  // ── helpers ───────────────────────────────────────────────────────────────
  const slotToTileMap = useCallback((placed) => {
    const map = {};
    placed.forEach((slotIdx, tileIdx) => {
      if (slotIdx !== null) map[slotIdx] = tileIdx;
    });
    return map;
  }, []);

  const checkCompletion = useCallback((placed) => {
    const map = slotToTileMap(placed);
    if (Object.keys(map).length < NUM_BLANKS) return;

    const allCorrect = [0, 1, 2].every(
      si => map[si] !== undefined && tilePool[map[si]].correctSlot === si
    );

    doneRef.current = true;

    if (allCorrect) {
      setFlashResult('correct');
      setTimeout(() => onSuccess(), 500);
    } else {
      setFlashResult('wrong');
      setTimeout(() => {
        // Show the correct answer: snap correct tiles to their slots, distractors back
        const correctPlaced = new Array(6).fill(null);
        const animations = [];

        tilePool.forEach((tile, tileIdx) => {
          if (tile.correctSlot >= 0) {
            correctPlaced[tileIdx] = tile.correctSlot;
            animations.push(
              Animated.spring(tilePans[tileIdx], {
                toValue: { x: slotPositions[tile.correctSlot].x, y: slotPositions[tile.correctSlot].y },
                friction: 7,
                useNativeDriver: false,
              })
            );
          } else {
            animations.push(
              Animated.spring(tilePans[tileIdx], {
                toValue: tileSourcePositions[tileIdx],
                friction: 5,
                useNativeDriver: false,
              })
            );
          }
        });

        occupiedRef.current = new Set([0, 1, 2]);
        placedSlotsRef.current = correctPlaced;
        setPlacedSlots([...correctPlaced]);
        setFlashResult('answer');
        Animated.parallel(animations).start();

        // After showing the answer, fail
        setTimeout(() => onFail(), 1500);
      }, 800);
    }
  }, [tilePool, tilePans, tileSourcePositions, slotPositions, onSuccess, onFail, slotToTileMap]);

  // ── tap-to-remove a placed tile ─────────────────────────────────────────
  const handleRemoveTile = useCallback((slotIdx) => {
    if (doneRef.current) return;
    const tileIdx = placedSlotsRef.current.findIndex(s => s === slotIdx);
    if (tileIdx === -1) return;

    occupiedRef.current.delete(slotIdx);
    const newPlaced = [...placedSlotsRef.current];
    newPlaced[tileIdx] = null;
    placedSlotsRef.current = newPlaced;
    setPlacedSlots([...newPlaced]);

    Animated.spring(tilePans[tileIdx], {
      toValue: tileSourcePositions[tileIdx],
      friction: 5,
      useNativeDriver: false,
    }).start();
  }, [tilePans, tileSourcePositions]);

  // ── pan responders (one per tile) ─────────────────────────────────────────
  const [tileResponders] = useState(() =>
    tilePans.map((pan, tileIdx) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          placedSlotsRef.current[tileIdx] === null && !doneRef.current,

        onPanResponderGrant: () => {
          setDraggingTileIdx(tileIdx);
          pan.setOffset({ x: pan.x._value, y: pan.y._value });
          pan.setValue({ x: 0, y: 0 });
        },

        onPanResponderMove: Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        ),

        onPanResponderRelease: () => {
          pan.flattenOffset();
          setDraggingTileIdx(null);

          const cx = pan.x._value + TILE_W / 2;
          const cy = pan.y._value + TILE_H / 2;

          // find nearest unoccupied slot
          let bestSlot = -1;
          let bestDist = Infinity;
          slotPositions.forEach((slot, si) => {
            if (occupiedRef.current.has(si)) return;
            const sx = slot.x + slot.w / 2;
            const sy = slot.y + slot.h / 2;
            const d = Math.hypot(cx - sx, cy - sy);
            if (d < bestDist) {
              bestDist = d;
              bestSlot = si;
            }
          });

          if (bestSlot >= 0 && bestDist <= SNAP_TOL) {
            // evict any existing tile from that slot back to source
            const prevTileIdx = placedSlotsRef.current.findIndex(
              (s, ti) => s === bestSlot && ti !== tileIdx
            );
            if (prevTileIdx !== -1) {
              occupiedRef.current.delete(bestSlot);
              const newPlaced = [...placedSlotsRef.current];
              newPlaced[prevTileIdx] = null;
              placedSlotsRef.current = newPlaced;
              Animated.spring(tilePans[prevTileIdx], {
                toValue: tileSourcePositions[prevTileIdx],
                friction: 5,
                useNativeDriver: false,
              }).start();
            }

            // snap this tile to the slot
            Animated.spring(pan, {
              toValue: { x: slotPositions[bestSlot].x, y: slotPositions[bestSlot].y },
              friction: 7,
              useNativeDriver: false,
            }).start(() => {
              occupiedRef.current.add(bestSlot);
              const newPlaced = [...placedSlotsRef.current];
              newPlaced[tileIdx] = bestSlot;
              placedSlotsRef.current = newPlaced;
              setPlacedSlots([...newPlaced]);
              checkCompletion(newPlaced);
            });
          } else {
            // return to source
            Animated.spring(pan, {
              toValue: tileSourcePositions[tileIdx],
              friction: 5,
              useNativeDriver: false,
            }).start();
          }
        },
      })
    )
  );

  // ── render helpers ────────────────────────────────────────────────────────
  const currentSlotToTile = slotToTileMap(placedSlots);

  function slotBorderColor(si) {
    if (flashResult === 'correct' || flashResult === 'answer') return colors.accent.neonGreen;
    if (flashResult === 'wrong') return colors.primary.neonRed;
    if (si in currentSlotToTile) return colors.accent.amber;
    return colors.background.frost;
  }

  function slotFill(si) {
    if (flashResult === 'correct' || flashResult === 'answer') return 'rgba(0,255,159,0.15)';
    if (flashResult === 'wrong') return 'rgba(255,51,102,0.10)';
    if (si in currentSlotToTile) return 'rgba(255,166,61,0.10)';
    return 'rgba(255,166,61,0.04)';
  }

  // render order: dragging tile last (on top)
  const renderOrder = tilePool
    .map((_, i) => i)
    .filter(i => i !== draggingTileIdx);
  if (draggingTileIdx !== null) renderOrder.push(draggingTileIdx);

  return (
    <View style={{ flex: 1 }}>
      {/* ── Reference label ── */}
      <Text style={styles.reference}>{reference}</Text>

      {/* ── Verse box ── */}
      <View style={[styles.verseBox, { height: VERSE_H }]}>
        <Text style={styles.verseText}>
          {verseParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <Text>{part}</Text>
              {idx < NUM_BLANKS && (
                <Text style={styles.blankIndicator}>{`[${idx + 1}]`}</Text>
              )}
            </React.Fragment>
          ))}
        </Text>

        {showHint && (
          <View style={styles.hintBox}>
            {blanks.map((word, i) => (
              <View key={i} style={styles.hintItem}>
                <Text style={styles.hintNum}>{i + 1}</Text>
                <Text style={styles.hintWord}>{word}</Text>
              </View>
            ))}
          </View>
        )}

        {!flashResult && (
          <TouchableOpacity
            style={[styles.dontKnowBtn, showHint && styles.dontKnowBtnUsed]}
            onPress={() => setShowHint(true)}
            activeOpacity={0.8}
            disabled={showHint || doneRef.current}
          >
            <Text style={[styles.dontKnowBtnText, showHint && styles.dontKnowBtnTextUsed]}>
              {showHint ? '📖  HINT SHOWN' : "I DON'T KNOW"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Slot label row ── */}
      {slotPositions.map((slot, si) => (
        <Text
          key={`lbl-${si}`}
          style={[
            styles.slotLabel,
            { position: 'absolute', left: slot.x, top: slot.y - 18, width: slot.w, textAlign: 'center' },
          ]}
        >
          {si + 1}
        </Text>
      ))}

      {/* ── SVG slot outlines ── */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {slotPositions.map((slot, si) => (
          <Rect
            key={si}
            x={slot.x}
            y={slot.y}
            width={slot.w}
            height={slot.h}
            rx={8}
            stroke={slotBorderColor(si)}
            strokeWidth={2}
            strokeDasharray={si in currentSlotToTile ? '0' : '5,4'}
            fill={slotFill(si)}
          />
        ))}
      </Svg>

      {/* ── Word labels inside filled slots (tap to remove) ── */}
      {slotPositions.map((slot, si) => {
        const ti = currentSlotToTile[si];
        if (ti === undefined) return null;
        return (
          <TouchableOpacity
            key={`slotword-${si}`}
            activeOpacity={0.6}
            onPress={() => handleRemoveTile(si)}
            style={{
              position: 'absolute',
              left: slot.x,
              top: slot.y,
              width: slot.w,
              height: slot.h,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 5,
            }}
          >
            <Text
              style={[
                styles.slotWord,
                {
                  color:
                    flashResult === 'correct' || flashResult === 'answer'
                      ? colors.accent.neonGreen
                      : flashResult === 'wrong'
                      ? colors.primary.neonRed
                      : colors.accent.amber,
                },
              ]}
            >
              {tilePool[ti].word}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* ── Draggable tiles ── */}
      {renderOrder.map(i => {
        const isPlaced = placedSlots[i] !== null;
        return (
          <Animated.View
            key={tilePool[i].id}
            style={[
              styles.tile,
              {
                width: TILE_W,
                height: TILE_H,
                // hide tile body when placed (slot word text is shown instead)
                opacity: isPlaced ? 0 : 1,
                transform: tilePans[i].getTranslateTransform(),
                borderColor:
                  flashResult === 'correct' || flashResult === 'answer'
                    ? colors.accent.neonGreen
                    : flashResult === 'wrong'
                    ? colors.primary.neonRed
                    : colors.accent.amber,
              },
            ]}
            {...tileResponders[i].panHandlers}
          >
            <Text style={styles.tileText}>{tilePool[i].word}</Text>
          </Animated.View>
        );
      })}

    </View>
  );
}

// ── Outer wrapper — measures layout before rendering inner ────────────────────

export default function ScriptureBlankTask({ config, onSuccess, onFail, taskId }) {
  const [areaSize, setAreaSize] = useState(null);

  const handleLayout = useCallback(
    e => {
      if (!areaSize) {
        const { width, height } = e.nativeEvent.layout;
        setAreaSize({ w: width, h: height });
      }
    },
    [areaSize]
  );

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} onLayout={handleLayout}>
      {areaSize && (
        <ScriptureBlankTaskInner
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
  reference: {
    position: 'absolute',
    top: 6,
    right: 12,
    fontFamily: fonts.accent.semiBold,
    fontSize: 11,
    color: colors.accent.amber,
    zIndex: 10,
  },

  verseBox: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    backgroundColor: colors.background.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 14,
    justifyContent: 'space-between',
  },
  verseText: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  blankIndicator: {
    fontFamily: fonts.accent.bold,
    fontSize: 12,
    color: colors.accent.amber,
  },

  slotLabel: {
    fontFamily: fonts.accent.bold,
    fontSize: 10,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },

  slotWord: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },

  tile: {
    position: 'absolute',
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: colors.background.panel,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.accent.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  tileText: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
    paddingHorizontal: 3,
  },

  dontKnowBtn: {
    marginTop: 8,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent.amber,
    backgroundColor: 'transparent',
  },
  dontKnowBtnUsed: {
    borderColor: colors.text.disabled,
    opacity: 0.4,
  },
  dontKnowBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 12,
    color: colors.accent.amber,
    letterSpacing: 1,
  },
  dontKnowBtnTextUsed: {
    color: colors.text.disabled,
  },

  hintBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintNum: {
    fontFamily: fonts.accent.bold,
    fontSize: 11,
    color: colors.accent.amber,
  },
  hintWord: {
    fontFamily: fonts.ui.semiBold,
    fontSize: 12,
    color: colors.text.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.amber,
    paddingBottom: 1,
  },
});
