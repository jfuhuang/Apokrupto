import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

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

  const canvasSizeRef = useRef({ width: 1, height: 1 });
  const currentStrokeRef = useRef([]); // mirror of currentStroke to avoid stale closure

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

        setStrokes((prev) => {
          const next = [...prev, stroke];
          if (onSketchChange) {
            onSketchChange({ strokes: next });
          }
          return next;
        });
        currentStrokeRef.current = [];
        setCurrentStroke([]);
      },
    })
  ).current;

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

  return (
    <View style={styles.wrapper}>
      <View
        style={styles.canvas}
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
              stroke={colors.primary.electricBlue}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
      </View>

      <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.7}>
        <Text style={styles.clearBtnText}>CLEAR</Text>
      </TouchableOpacity>
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
  clearBtn: {
    alignSelf: 'center',
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
