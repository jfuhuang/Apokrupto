import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');
const DRAG_SIZE = 80;
const TARGET_SIZE = 90;

// Fixed target at center-bottom area
const TARGET_X = W / 2 - TARGET_SIZE / 2;
const TARGET_Y = H * 0.55;

// Drag object starts top-left area
const START_X = W * 0.15;
const START_Y = H * 0.18;

export default function DragPlaceTask({ config, onSuccess, onFail }) {
  const { snapTolerance } = config;
  const pan = useRef(new Animated.ValueXY({ x: START_X, y: START_Y })).current;
  const [snapped, setSnapped] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !snapped,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        const cx = START_X + gesture.dx + DRAG_SIZE / 2;
        const cy = START_Y + gesture.dy + DRAG_SIZE / 2;
        const tcx = TARGET_X + TARGET_SIZE / 2;
        const tcy = TARGET_Y + TARGET_SIZE / 2;
        const dist = Math.sqrt((cx - tcx) ** 2 + (cy - tcy) ** 2);

        if (dist <= snapTolerance) {
          // Snap to target centre
          const snapX = TARGET_X + TARGET_SIZE / 2 - DRAG_SIZE / 2;
          const snapY = TARGET_Y + TARGET_SIZE / 2 - DRAG_SIZE / 2;
          Animated.spring(pan, {
            toValue: { x: snapX - START_X, y: snapY - START_Y },
            friction: 5,
            useNativeDriver: false,
          }).start(() => {
            setSnapped(true);
            onSuccess();
          });
        } else {
          // Bounce back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {snapped ? 'Placed!' : 'Drag the object into the target zone'}
      </Text>

      {/* Target zone */}
      <View style={[styles.target, { left: TARGET_X, top: TARGET_Y }]}>
        <Text style={styles.targetLabel}>TARGET</Text>
      </View>

      {/* Draggable object */}
      <Animated.View
        style={[styles.draggable, pan.getLayout(), { left: START_X, top: START_Y }]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.dragIcon}>{snapped ? '✓' : '✦'}</Text>
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
    marginTop: 12,
  },
  target: {
    position: 'absolute',
    width: TARGET_SIZE,
    height: TARGET_SIZE,
    borderRadius: TARGET_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.accent.amber,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,166,61,0.06)',
  },
  targetLabel: {
    fontFamily: fonts.display.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.accent.amber,
    opacity: 0.7,
  },
  draggable: {
    position: 'absolute',
    width: DRAG_SIZE,
    height: DRAG_SIZE,
    borderRadius: DRAG_SIZE / 2,
    backgroundColor: 'rgba(0,212,255,0.15)',
    borderWidth: 2,
    borderColor: colors.primary.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  dragIcon: {
    fontSize: 28,
    color: colors.primary.electricBlue,
  },
});
