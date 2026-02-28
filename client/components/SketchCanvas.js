import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const ERASE_RADIUS = 0.05; // 5% of canvas — comfortable finger-width

/**
 * SketchCanvas — PanResponder-based drawing surface using react-native-svg.
 *
 * Coordinates are stored as normalized fractions (0.0–1.0) of the canvas
 * dimensions so that sketches render correctly at any display size.
 *
 * Props:
 *   onSketchChange(sketchData) — called on every stroke completion (finger lift)
 *                                sketchData = { strokes: [[{x, y}, ...], ...] }
 */
export default function SketchCanvas({ onSketchChange }) {
  const [strokes, setStrokes] = useState([]); // completed strokes
  const [currentStroke, setCurrentStroke] = useState([]); // in-progress stroke
  const [mode, setMode] = useState('draw'); // 'draw' | 'erase'

  const canvasSizeRef = useRef({ width: 1, height: 1 });
  const currentStrokeRef = useRef([]); // mirror of currentStroke to avoid stale closure
  const modeRef = useRef('draw'); // mirror of mode to avoid stale closure in PanResponder
  const strokesAfterReleaseRef = useRef([]); // holds computed next-strokes value across the updater/notify boundary

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = canvasSizeRef.current;
        const point = { x: locationX / width, y: locationY / height };
        currentStrokeRef.current = [point];
        setCurrentStroke([point]);
      },

      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const { width, height } = canvasSizeRef.current;
        const point = { x: locationX / width, y: locationY / height };
        currentStrokeRef.current = [...currentStrokeRef.current, point];
        setCurrentStroke([...currentStrokeRef.current]);
      },

      onPanResponderRelease: () => {
        const stroke = currentStrokeRef.current;
        if (stroke.length === 0) return;

        // Compute the new strokes value first, then call setStrokes and
        // onSketchChange separately.  Calling onSketchChange (which calls
        // setSketchData in the parent) from *inside* a setState functional
        // updater triggers React's "update a component while rendering
        // another component" error because updaters run during reconciliation.
        if (modeRef.current === 'erase') {
          setStrokes((prev) => {
            const next = prev.filter(
              (s) => !s.some((sp) =>
                stroke.some((ep) => Math.hypot(sp.x - ep.x, sp.y - ep.y) < ERASE_RADIUS)
              )
            );
            // Store result so we can notify the parent after the state update.
            strokesAfterReleaseRef.current = next;
            return next;
          });
        } else {
          setStrokes((prev) => {
            const next = [...prev, stroke];
            strokesAfterReleaseRef.current = next;
            return next;
          });
        }
        // Notify parent outside the updater so it doesn't trigger a
        // cross-component setState during reconciliation.
        if (onSketchChange) {
          // Use a microtask so the strokes state has been committed first.
          Promise.resolve().then(() => {
            if (onSketchChange) onSketchChange({ strokes: strokesAfterReleaseRef.current });
          });
        }

        currentStrokeRef.current = [];
        setCurrentStroke([]);
      },
    })
  ).current;

  const toggleMode = () => {
    const next = modeRef.current === 'draw' ? 'erase' : 'draw';
    modeRef.current = next;
    setMode(next);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    currentStrokeRef.current = [];
    if (onSketchChange) onSketchChange({ strokes: [] });
  };

  const strokeToPath = (points, w, h) => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x * w} ${first.y * h}`;
    for (const p of rest) {
      d += ` L ${p.x * w} ${p.y * h}`;
    }
    return d;
  };

  const isErasing = mode === 'erase';

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.canvas, isErasing && styles.canvasEraseMode]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          canvasSizeRef.current = { width, height };
        }}
        {...panResponder.panHandlers}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              d={strokeToPath(stroke, canvasSizeRef.current.width, canvasSizeRef.current.height)}
              stroke={colors.text.primary}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
          {currentStroke.length > 0 && (
            <Path
              d={strokeToPath(currentStroke, canvasSizeRef.current.width, canvasSizeRef.current.height)}
              stroke={isErasing ? colors.primary.neonRed : colors.primary.electricBlue}
              strokeWidth={isErasing ? 16 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={isErasing ? 0.4 : 1}
            />
          )}
        </Svg>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.modeBtn, isErasing && styles.modeBtnActive]}
          onPress={toggleMode}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeBtnText, isErasing && styles.modeBtnTextActive]}>
            {isErasing ? 'ERASING' : 'DRAW'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
          <Text style={styles.clearBtnText}>CLEAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  canvas: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background.void,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary.electricBlue,
    overflow: 'hidden',
  },
  canvasEraseMode: {
    borderColor: colors.primary.neonRed,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: colors.background.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modeBtnActive: {
    borderColor: colors.primary.neonRed,
    backgroundColor: 'rgba(255, 51, 102, 0.1)',
  },
  modeBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
  modeBtnTextActive: {
    color: colors.primary.neonRed,
  },
  clearBtn: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: colors.background.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  clearBtnText: {
    fontFamily: fonts.display.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.text.tertiary,
  },
});
