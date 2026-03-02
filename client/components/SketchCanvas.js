import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
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
 *   style — optional style for the wrapper View (e.g. { flex: 1 })
 *
 * Ref methods:
 *   getSketchData() — returns { strokes: [...] } including any in-progress stroke
 */
const SketchCanvas = forwardRef(function SketchCanvas({ onSketchChange, style }, ref) {
  const [strokes, setStrokes] = useState([]); // completed strokes
  const [currentStroke, setCurrentStroke] = useState([]); // in-progress stroke
  const [mode, setMode] = useState('draw'); // 'draw' | 'erase'

  const canvasSizeRef = useRef({ width: 1, height: 1 });
  const canvasPositionRef = useRef({ x: 0, y: 0 }); // absolute window position
  const canvasViewRef = useRef(null);
  const currentStrokeRef = useRef([]); // mirror of currentStroke to avoid stale closure
  const strokesRef = useRef([]); // mirror of strokes state for ref access
  const modeRef = useRef('draw'); // mirror of mode to avoid stale closure in PanResponder
  const onSketchChangeRef = useRef(onSketchChange);
  onSketchChangeRef.current = onSketchChange;

  // Expose getSketchData for parent (e.g. auto-submit on timeout)
  useImperativeHandle(ref, () => ({
    getSketchData: () => {
      const completed = strokesRef.current;
      const inProgress = currentStrokeRef.current;
      const all = inProgress.length > 0 ? [...completed, inProgress] : completed;
      return { strokes: all };
    },
  }));

  // Compute normalized + clamped point from a touch event using pageX/pageY.
  // canvasPositionRef is re-computed on every grant using the reliable
  // locationX/locationY from the initial touch (avoids async measureInWindow).
  const getPointFromEvent = useRef((evt) => {
    const { pageX, pageY } = evt.nativeEvent;
    const { width, height } = canvasSizeRef.current;
    const { x: cx, y: cy } = canvasPositionRef.current;
    return {
      x: Math.max(0, Math.min(1, (pageX - cx) / width)),
      y: Math.max(0, Math.min(1, (pageY - cy) / height)),
    };
  }).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Prevent ScrollView or other gesture handlers from stealing the touch
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt) => {
        // Derive the canvas origin from the initial touch: locationX/locationY
        // is reliable on grant (target hasn't changed yet). This avoids
        // depending on the async measureInWindow result.
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        canvasPositionRef.current = { x: pageX - locationX, y: pageY - locationY };

        const point = getPointFromEvent(evt);
        currentStrokeRef.current = [point];
        setCurrentStroke([point]);
      },

      onPanResponderMove: (evt) => {
        const point = getPointFromEvent(evt);
        currentStrokeRef.current = [...currentStrokeRef.current, point];
        setCurrentStroke([...currentStrokeRef.current]);
      },

      onPanResponderRelease: () => {
        const stroke = currentStrokeRef.current;
        if (stroke.length === 0) return;

        if (modeRef.current === 'erase') {
          setStrokes((prev) => {
            const next = prev.filter(
              (s) => !s.some((sp) =>
                stroke.some((ep) => Math.hypot(sp.x - ep.x, sp.y - ep.y) < ERASE_RADIUS)
              )
            );
            strokesRef.current = next;
            return next;
          });
        } else {
          setStrokes((prev) => {
            const next = [...prev, stroke];
            strokesRef.current = next;
            return next;
          });
        }

        // Notify parent outside the updater so it doesn't trigger a
        // cross-component setState during reconciliation.
        Promise.resolve().then(() => {
          if (onSketchChangeRef.current) {
            onSketchChangeRef.current({ strokes: strokesRef.current });
          }
        });

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
    strokesRef.current = [];
    setCurrentStroke([]);
    currentStrokeRef.current = [];
    if (onSketchChangeRef.current) onSketchChangeRef.current({ strokes: [] });
  };

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    canvasSizeRef.current = { width, height };
    // Measure absolute window position for pageX/pageY calculations
    if (canvasViewRef.current?.measureInWindow) {
      canvasViewRef.current.measureInWindow((x, y) => {
        canvasPositionRef.current = { x, y };
      });
    }
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
    <View style={[styles.wrapper, style]}>
      <View
        ref={canvasViewRef}
        style={[styles.canvas, isErasing && styles.canvasEraseMode]}
        onLayout={handleLayout}
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
});

export default SketchCanvas;

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  canvas: {
    flex: 1,
    minHeight: 180,
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
