import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import Svg, {
  Rect, Circle, Ellipse, Path, Polygon, Line, G,
} from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const DRAG_SIZE   = 80;
const TARGET_SIZE = 90;

// ── Task-specific hint text ──────────────────────────────────────────────

const TASK_HINTS = {
  lamp_on_lampstand: { before: 'Place the lamp on the lampstand!', after: 'The lamp is lit!' },
  ark_of_covenant:   { before: 'Return the Ark to the tabernacle!', after: 'The Ark is home!' },
  solomons_temple:   { before: 'Place the vessel in the temple!',   after: 'The temple is prepared!' },
};

// ── Lamp on Lampstand ────────────────────────────────────────────────────

function LampstandSvg({ snapped }) {
  return (
    <Svg width={TARGET_SIZE} height={TARGET_SIZE} viewBox="0 0 90 90">
      {/* Glow when shade is placed */}
      {snapped && (
        <G>
          <Ellipse cx="45" cy="46" rx="16" ry="6" fill="#FFA63D" opacity="0.22" />
          <Path d="M45 48 C43 44 42 40 44 36 C44 39 46 39 45 37 C47 39 48 44 47 48Z" fill="#FFA63D" />
          <Path d="M45 47 C44 44 44.5 41 45 39 C45.5 41 46 44 45 47Z" fill="#FFE082" opacity="0.9" />
        </G>
      )}
      {/* Drop-zone ring — snaps to center of this target box */}
      <Circle
        cx="45" cy="45" r="13"
        stroke={snapped ? '#FFE082' : '#FFA63D'}
        strokeWidth="2"
        strokeDasharray={snapped ? '0' : '5,4'}
        fill={snapped ? 'rgba(255,224,130,0.18)' : 'rgba(255,166,61,0.06)'}
      />
      {/* Collar / socket platform at top of stand */}
      <Rect x="33" y="51" width="24" height="5" rx="2" fill="#C09030" />
      <Rect x="33" y="51" width="24" height="2" rx="1" fill="#E8B84B" opacity="0.5" />
      {/* Column shaft */}
      <Rect x="42" y="56" width="6" height="24" fill="#8B6914" />
      {/* Stepped foot */}
      <Rect x="35" y="78" width="20" height="5" rx="2" fill="#C09030" />
      {/* Base */}
      <Rect x="28" y="82" width="34" height="6" rx="2" fill="#8B6914" />
    </Svg>
  );
}

function LampSvg() {
  return (
    <Svg width={DRAG_SIZE} height={DRAG_SIZE} viewBox="0 0 80 80">
      {/* Finial / top knob */}
      <Circle cx="40" cy="11" r="5" fill="#8B6914" />
      {/* Top rim */}
      <Ellipse cx="40" cy="17" rx="15" ry="4" fill="#8B6914" />
      {/* Shade body — narrow top, wide bottom (cone/trapezoid) */}
      <Path d="M25 17 L9 63 L71 63 L55 17 Z" fill="#D4A030" />
      {/* Inner shading to give depth */}
      <Path d="M28 17 L13 61 L67 61 L52 17 Z" fill="#B8860B" opacity="0.3" />
      {/* Highlight stripe on left face */}
      <Path d="M31 19 L15 63" stroke="#E8B84B" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      {/* Bottom rim */}
      <Ellipse cx="40" cy="63" rx="31" ry="8" fill="#8B6914" />
      {/* Warm inner glow visible at bottom opening */}
      <Ellipse cx="40" cy="63" rx="24" ry="5" fill="#FFA63D" opacity="0.25" />
      {/* Socket / neck below shade */}
      <Rect x="37" y="71" width="6" height="6" rx="1" fill="#8B6914" />
    </Svg>
  );
}

// ── Ark of the Covenant ──────────────────────────────────────────────────

function ArkTargetSvg() {
  return (
    <Svg width={TARGET_SIZE} height={TARGET_SIZE} viewBox="0 0 90 90">
      {/* Top curtain rod */}
      <Rect x="0" y="4" width="90" height="5" rx="2" fill="#C09030" />
      {/* Left curtain panel */}
      <Rect x="2"  y="9" width="36" height="79" rx="3" fill="#6B21A8" opacity="0.9" />
      {/* Right curtain panel */}
      <Rect x="52" y="9" width="36" height="79" rx="3" fill="#6B21A8" opacity="0.9" />
      {/* Curtain fold lines (left) */}
      <Line x1="12" y1="9" x2="12" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
      <Line x1="22" y1="9" x2="22" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
      <Line x1="32" y1="9" x2="32" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
      {/* Curtain fold lines (right) */}
      <Line x1="62" y1="9" x2="62" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
      <Line x1="72" y1="9" x2="72" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
      <Line x1="82" y1="9" x2="82" y2="88" stroke="#8B5CF6" strokeWidth="1" opacity="0.5" />
      {/* Gold border frame */}
      <Rect x="1" y="3" width="88" height="84" rx="3" stroke="#FFA63D" strokeWidth="3" fill="none" />
      {/* Opening seam (dashed) */}
      <Line
        x1="45" y1="9" x2="45" y2="88"
        stroke="#FFA63D" strokeWidth="2" strokeDasharray="6,4" opacity="0.8"
      />
    </Svg>
  );
}

function ArkDraggableSvg() {
  return (
    <Svg width={DRAG_SIZE} height={DRAG_SIZE} viewBox="0 0 80 80">
      {/* Main chest body */}
      <Rect x="10" y="30" width="60" height="36" rx="4" fill="#C09030" />
      {/* Body decorative overlay */}
      <Rect x="10" y="40" width="60" height="3" fill="#8B6914" opacity="0.35" />
      {/* Lid */}
      <Rect x="8" y="22" width="64" height="10" rx="3" fill="#D4A030" />
      {/* Lid highlight */}
      <Rect x="8" y="22" width="64" height="3" rx="2" fill="#E8B84B" opacity="0.6" />
      {/* Ring posts */}
      <Circle cx="16" cy="48" r="4.5" fill="#C09030" stroke="#8B6914" strokeWidth="1.5" />
      <Circle cx="64" cy="48" r="4.5" fill="#C09030" stroke="#8B6914" strokeWidth="1.5" />
      {/* Carrying poles */}
      <Rect x="0"  y="45" width="17" height="5" rx="2" fill="#8B6914" />
      <Rect x="63" y="45" width="17" height="5" rx="2" fill="#8B6914" />
      {/* Cherub wing hints on lid */}
      <Path d="M40 22 Q27 12 20 16" stroke="#E8B84B" strokeWidth="2" fill="none" opacity="0.8" />
      <Path d="M40 22 Q53 12 60 16" stroke="#E8B84B" strokeWidth="2" fill="none" opacity="0.8" />
    </Svg>
  );
}

// ── Solomon's Temple ─────────────────────────────────────────────────────

function TempleTargetSvg() {
  return (
    <Svg width={TARGET_SIZE} height={TARGET_SIZE} viewBox="0 0 90 90">
      {/* Pediment / triangular roof */}
      <Polygon points="8,30 45,5 82,30" fill="#C09030" />
      {/* Entablature beam */}
      <Rect x="6" y="30" width="78" height="8" rx="0" fill="#D4A030" />
      {/* Entablature highlight */}
      <Rect x="6" y="30" width="78" height="2" fill="#E8B84B" opacity="0.5" />
      {/* 4 columns */}
      <Rect x="10" y="38" width="10" height="46" rx="2" fill="#C09030" />
      <Rect x="26" y="38" width="10" height="46" rx="2" fill="#C09030" />
      <Rect x="54" y="38" width="10" height="46" rx="2" fill="#C09030" />
      <Rect x="70" y="38" width="10" height="46" rx="2" fill="#C09030" />
      {/* Stylobate steps */}
      <Rect x="4"  y="84" width="82" height="5"  fill="#8B6914" opacity="0.9" />
      <Rect x="7"  y="80" width="76" height="4"  fill="#8B6914" opacity="0.7" />
      {/* Inner niche (dark opening) */}
      <Rect x="38" y="40" width="14" height="40" fill="#1A0800" />
      {/* Altar glow drop zone */}
      <Circle
        cx="45" cy="60" r="8"
        stroke="#FFA63D" strokeWidth="2" strokeDasharray="5,4"
        fill="rgba(255,166,61,0.1)"
      />
    </Svg>
  );
}

function VesselSvg() {
  return (
    <Svg width={DRAG_SIZE} height={DRAG_SIZE} viewBox="0 0 80 80">
      {/* Foot base */}
      <Ellipse cx="40" cy="74" rx="16" ry="5" fill="#C09030" />
      {/* Pedestal stem */}
      <Rect x="32" y="64" width="16" height="11" rx="2" fill="#C09030" />
      {/* Lower body curve */}
      <Path d="M22 62 Q18 46 24 34 Q30 20 40 18 Q50 20 56 34 Q62 46 58 62Z" fill="#D4A030" />
      {/* Neck */}
      <Rect x="33" y="13" width="14" height="8" rx="2" fill="#C09030" />
      {/* Rim */}
      <Ellipse cx="40" cy="13" rx="11" ry="4" fill="#E8B84B" />
      {/* Left handle */}
      <Path
        d="M22 42 Q13 38 13 46 Q13 54 22 50"
        stroke="#C09030" strokeWidth="5" fill="none" strokeLinecap="round"
      />
      {/* Right handle */}
      <Path
        d="M58 42 Q67 38 67 46 Q67 54 58 50"
        stroke="#C09030" strokeWidth="5" fill="none" strokeLinecap="round"
      />
      {/* Decorative band */}
      <Ellipse cx="40" cy="44" rx="18" ry="5" stroke="#8B6914" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Body highlight */}
      <Path
        d="M30 32 Q28 40 30 50"
        stroke="#E8B84B" strokeWidth="3" fill="none" opacity="0.35" strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Main Component ───────────────────────────────────────────────────────

export default function DragPlaceTask({ config, onSuccess, onFail, taskId }) {
  const { snapTolerance } = config;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [snapped, setSnapped] = useState(false);
  const [layout, setLayout] = useState(null);
  const layoutRef = useRef(null);

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    const l = { width, height };
    layoutRef.current = l;
    setLayout(l);
  };

  // Positions computed relative to the container, not the window
  const cW = layout?.width || 300;
  const cH = layout?.height || 250;

  const targetX = cW / 2 - TARGET_SIZE / 2;
  const targetY = cH * 0.45;
  const startX = cW * 0.12;
  const startY = cH * 0.08;

  // Helper to compute positions from latest layout (avoids stale closures in PanResponder)
  const getPositions = () => {
    const l = layoutRef.current || { width: 300, height: 250 };
    const tx = l.width / 2 - TARGET_SIZE / 2;
    const ty = l.height * 0.45;
    const sx = l.width * 0.12;
    const sy = l.height * 0.08;
    return { tx, ty, sx, sy };
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !snapped,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        const { tx, ty, sx, sy } = getPositions();
        const cx = sx + gesture.dx + DRAG_SIZE / 2;
        const cy = sy + gesture.dy + DRAG_SIZE / 2;
        const tcx = tx + TARGET_SIZE / 2;
        const tcy = ty + TARGET_SIZE / 2;
        const dist = Math.sqrt((cx - tcx) ** 2 + (cy - tcy) ** 2);

        if (dist <= snapTolerance) {
          const snapX = tx + TARGET_SIZE / 2 - DRAG_SIZE / 2;
          const snapY = ty + TARGET_SIZE / 2 - DRAG_SIZE / 2;
          Animated.spring(pan, {
            toValue: { x: snapX - sx, y: snapY - sy },
            friction: 5,
            useNativeDriver: false,
          }).start(() => {
            setSnapped(true);
            onSuccess();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const hints = TASK_HINTS[taskId] || TASK_HINTS.lamp_on_lampstand;

  const renderTarget = () => {
    switch (taskId) {
      case 'ark_of_covenant': return <ArkTargetSvg />;
      case 'solomons_temple': return <TempleTargetSvg />;
      default:                return <LampstandSvg snapped={snapped} />;
    }
  };

  const renderDraggable = () => {
    switch (taskId) {
      case 'ark_of_covenant': return <ArkDraggableSvg />;
      case 'solomons_temple': return <VesselSvg />;
      default:                return <LampSvg />;
    }
  };

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} style={{ backgroundColor: colors.background.space }} onLayout={onLayout}>
      <Text style={styles.hint}>
        {snapped ? hints.after : hints.before}
      </Text>

      {layout && (
        <>
          {/* Target zone */}
          <View style={[styles.target, { left: targetX, top: targetY }]}>
            {renderTarget()}
          </View>

          {/* Draggable object */}
          <Animated.View
            style={[styles.draggable, { left: startX, top: startY }, { transform: pan.getTranslateTransform() }]}
            {...panResponder.panHandlers}
          >
            {renderDraggable()}
          </Animated.View>
        </>
      )}
    </TaskContainer>
  );
}

const styles = StyleSheet.create({
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
  },
  draggable: {
    position: 'absolute',
    width: DRAG_SIZE,
    height: DRAG_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
