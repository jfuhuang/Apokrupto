import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Polygon,
  Rect,
  Line,
  Path,
  G,
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { colors } from '../../../theme/colors';
import TaskContainer from '../../../components/TaskContainer';
import { fonts } from '../../../theme/typography';

const { width: W } = Dimensions.get('window');
const ENEMY_SIZE    = 56;
const SPAWN_INTERVAL = 1000;
const ENEMY_DURATION = 5000;
const CENTER_X = W / 2 - ENEMY_SIZE / 2;

let _id = 0;

function makeEnemy(centerY, areaH) {
  const side = Math.floor(Math.random() * 4);
  let sx, sy;
  if (side === 0) { sx = Math.random() * W; sy = -ENEMY_SIZE; }
  else if (side === 1) { sx = W + ENEMY_SIZE; sy = Math.random() * centerY; }
  else if (side === 2) { sx = Math.random() * W; sy = areaH; }
  else { sx = -ENEMY_SIZE; sy = Math.random() * centerY; }
  return { id: ++_id, sx, sy, pan: new Animated.ValueXY({ x: sx, y: sy }), anim: null };
}

// ── Wolf SVG silhouette ─────────────────────────────────────────────────

function WolfSvg() {
  return (
    <Svg width={ENEMY_SIZE} height={ENEMY_SIZE} viewBox="0 0 56 56">
      <G>
        {/* Ground shadow */}
        <Ellipse cx="27" cy="54" rx="17" ry="3.5" fill="#000" opacity="0.30" />

        {/* ── Tail — bushy, swept upward ── */}
        <Path d="M42 38 Q52 30 51 20 Q53 18 52 15" stroke="#3A3A3A" strokeWidth="6" fill="none" strokeLinecap="round" />
        <Path d="M42 38 Q51 32 50 22 Q52 20 51 17" stroke="#5A5A5A" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* Tail tip — pale */}
        <Circle cx="51" cy="15" r="4" fill="#B0A898" />
        <Circle cx="51" cy="15" r="2" fill="#D0C8B8" />

        {/* ── Body ── */}
        {/* Body shadow underside */}
        <Ellipse cx="27" cy="40" rx="16" ry="9" fill="#1A1A1A" opacity="0.5" />
        {/* Main body */}
        <Ellipse cx="27" cy="37" rx="16" ry="11" fill="#484848" />
        {/* Fur highlight — top of back */}
        <Ellipse cx="24" cy="30" rx="10" ry="5" fill="#686868" opacity="0.55" />
        {/* Scruff / mane fur at neck */}
        <Path d="M20 28 Q16 24 18 20" stroke="#585858" strokeWidth="4" fill="none" strokeLinecap="round" />
        <Path d="M22 27 Q19 23 21 19" stroke="#686868" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* ── Legs — four, with paws ── */}
        {/* Rear legs */}
        <Rect x="13" y="44" width="7" height="12" rx="3.5" fill="#3C3C3C" />
        <Rect x="24" y="44" width="7" height="12" rx="3.5" fill="#3C3C3C" />
        {/* Front legs */}
        <Rect x="33" y="43" width="7" height="12" rx="3.5" fill="#404040" />
        <Rect x="40" y="40" width="7" height="12" rx="3.5" fill="#404040" />
        {/* Paws */}
        <Ellipse cx="16.5" cy="56" rx="4"  ry="2.5" fill="#2A2A2A" />
        <Ellipse cx="27.5" cy="56" rx="4"  ry="2.5" fill="#2A2A2A" />
        <Ellipse cx="36.5" cy="55" rx="4"  ry="2.5" fill="#2A2A2A" />
        <Ellipse cx="43.5" cy="52" rx="4"  ry="2.5" fill="#2A2A2A" />
        {/* Claw tips */}
        <Path d="M13 56 L12 58 M15.5 57 L15 59 M18 56 L19 58" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" />
        <Path d="M37 55 L36 57 M40 55 L40 57" stroke="#1A1A1A" strokeWidth="1.2" strokeLinecap="round" />

        {/* ── Head ── */}
        {/* Neck */}
        <Ellipse cx="22" cy="28" rx="8" ry="9" fill="#484848" />
        {/* Head base */}
        <Ellipse cx="22" cy="19" rx="11" ry="10" fill="#505050" />
        {/* Head underside shading */}
        <Ellipse cx="22" cy="22" rx="9"  ry="7" fill="#3A3A3A" opacity="0.4" />
        {/* Forehead highlight */}
        <Ellipse cx="20" cy="14" rx="6"  ry="4" fill="#686868" opacity="0.45" />

        {/* Pointed ears */}
        <Polygon points="13,15 8,3 20,10"  fill="#484848" />
        <Polygon points="31,15 36,3 24,10" fill="#484848" />
        {/* Inner ears — deep red-pink */}
        <Polygon points="14,14 10,6 19,10"  fill="#7A1A2A" opacity="0.80" />
        <Polygon points="30,14 34,6 25,10" fill="#7A1A2A" opacity="0.80" />
        {/* Ear highlight ridge */}
        <Line x1="11" y1="5"  x2="14" y2="11" stroke="#5A5A5A" strokeWidth="1" opacity="0.5" />
        <Line x1="33" y1="5"  x2="30" y2="11" stroke="#5A5A5A" strokeWidth="1" opacity="0.5" />

        {/* ── Snout / Muzzle ── */}
        <Ellipse cx="22" cy="24" rx="7.5" ry="5.5" fill="#3C3C3C" />
        <Ellipse cx="22" cy="24" rx="6"   ry="4"   fill="#444" />
        {/* Nose — dark leather */}
        <Ellipse cx="22" cy="21" rx="3.5" ry="2.5" fill="#1A1A1A" />
        <Ellipse cx="21" cy="20" rx="1.5" ry="1"   fill="#3C3C3C" opacity="0.6" />
        {/* Mouth line */}
        <Path d="M22 24 Q19 27 17 26" stroke="#2A2A2A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <Path d="M22 24 Q25 27 27 26" stroke="#2A2A2A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Fangs */}
        <Polygon points="20,26 19,30 21,27" fill="#E8E8E0" opacity="0.85" />
        <Polygon points="24,26 25,30 23,27" fill="#E8E8E0" opacity="0.85" />

        {/* ── Eyes — glowing threat ── */}
        {/* Eye glow aura */}
        <Circle cx="17" cy="17" r="4.5" fill="#FF1A3C" opacity="0.18" />
        <Circle cx="27" cy="17" r="4.5" fill="#FF1A3C" opacity="0.18" />
        {/* Iris */}
        <Circle cx="17" cy="17" r="3"   fill="#CC0028" />
        <Circle cx="27" cy="17" r="3"   fill="#CC0028" />
        {/* Pupil — vertical slit */}
        <Ellipse cx="17" cy="17" rx="1" ry="2.2" fill="#0A0005" />
        <Ellipse cx="27" cy="17" rx="1" ry="2.2" fill="#0A0005" />
        {/* Eye shine */}
        <Circle cx="18" cy="16" r="0.8" fill="#FF6080" opacity="0.70" />
        <Circle cx="28" cy="16" r="0.8" fill="#FF6080" opacity="0.70" />
      </G>
    </Svg>
  );
}

// ── Soldier SVG (for pillar_of_fire) — Egyptian warrior ──────────────────

function SoldierSvg() {
  return (
    <Svg width={ENEMY_SIZE} height={ENEMY_SIZE} viewBox="0 0 56 56">
      <G>
        {/* Dark cape/cloak behind body — gives silhouette width */}
        <Path d="M24 24 Q15 33 14 56 L21 56 Q22 38 28 30Z" fill="#1A0900" opacity="0.85" />
        <Path d="M32 24 Q41 33 42 56 L35 56 Q34 38 28 30Z" fill="#1A0900" opacity="0.85" />
        {/* Legs */}
        <Rect x="19" y="42" width="8"  height="14" rx="3" fill="#2A1200" />
        <Rect x="29" y="42" width="8"  height="14" rx="3" fill="#2A1200" />
        {/* Body armor / breastplate */}
        <Rect x="19" y="24" width="18" height="20" rx="3" fill="#3A1E0A" />
        {/* Bronze scale-armour detail lines */}
        <Line x1="22" y1="29" x2="34" y2="29" stroke="#6B3A00" strokeWidth="1" opacity="0.6" />
        <Line x1="22" y1="34" x2="34" y2="34" stroke="#6B3A00" strokeWidth="1" opacity="0.6" />
        <Line x1="22" y1="39" x2="34" y2="39" stroke="#6B3A00" strokeWidth="1" opacity="0.6" />
        {/* Left arm */}
        <Rect x="8"  y="27" width="12" height="5" rx="2.5" fill="#3A1E0A" />
        {/* Shield on left arm */}
        <Rect x="4"  y="20" width="9"  height="17" rx="3" fill="#5C3A00" />
        <Ellipse cx="8.5" cy="28.5" rx="3.2" ry="6.5" fill="#8B6000" opacity="0.65" />
        <Circle  cx="8.5" cy="28.5" r="1.6"              fill="#CFB200" opacity="0.85" />
        {/* Right arm */}
        <Rect x="36" y="27" width="12" height="5" rx="2.5" fill="#3A1E0A" />
        {/* Neck */}
        <Rect x="24" y="18" width="8"  height="7"  rx="2" fill="#3A1E0A" />
        {/* Head */}
        <Ellipse cx="28" cy="13" rx="9" ry="10" fill="#3A1E0A" />
        {/* Khepresh helmet shape */}
        <Path d="M20 10 Q19 4 28 3 Q37 4 36 10 L34 10 Q33 6 28 5 Q23 6 22 10Z" fill="#1A0900" />
        <Rect x="23" y="3" width="10" height="7" rx="3" fill="#1A0900" />
        <Line x1="23" y1="3" x2="33" y2="3" stroke="#6B3A00" strokeWidth="1.5" opacity="0.45" />
        {/* Glowing ember eyes */}
        <Ellipse cx="24" cy="12" rx="2.5" ry="2" fill="#FF6A00" />
        <Ellipse cx="32" cy="12" rx="2.5" ry="2" fill="#FF6A00" />
        <Circle  cx="24" cy="12" r="1"          fill="#FFD700" opacity="0.9" />
        <Circle  cx="32" cy="12" r="1"          fill="#FFD700" opacity="0.9" />
        {/* Spear shaft */}
        <Rect x="45" y="7" width="3" height="46" rx="1.5" fill="#7A5C22" />
        {/* Spearhead */}
        <Path d="M44.5 7 L46.5 1 L48.5 7Z" fill="#D4D4D4" />
        <Rect  x="44"  y="7"  width="5"  height="3" rx="1" fill="#9B7A2A" />
      </G>
    </Svg>
  );
}

// ── Detailed sheep SVG component (reusable) ───────────────────────────────

// A single detailed sheep at position (cx, cy) with a given scale.
// Facing right by default. flipX=true mirrors it.
function SheepSvg({ cx, cy, scale = 1, flipX = false }) {
  const sx = flipX ? -scale : scale;
  // Body: layered wool puffs + legs + head
  return (
    <G transform={`translate(${cx}, ${cy}) scale(${sx}, ${scale})`}>
      {/* Shadow beneath sheep */}
      <Ellipse cx="0" cy="16" rx="22" ry="5" fill="#000" opacity="0.22" />
      {/* Back leg pair */}
      <Rect x="-12" y="8"  width="5" height="12" rx="2.5" fill="#C8C0A8" />
      <Rect x="-6"  y="8"  width="5" height="12" rx="2.5" fill="#C8C0A8" />
      {/* Front leg pair */}
      <Rect x="4"   y="8"  width="5" height="12" rx="2.5" fill="#C8C0A8" />
      <Rect x="10"  y="8"  width="5" height="12" rx="2.5" fill="#C8C0A8" />
      {/* Hooves */}
      <Rect x="-12" y="18" width="5" height="4"  rx="2"   fill="#6B5B3E" />
      <Rect x="-6"  y="18" width="5" height="4"  rx="2"   fill="#6B5B3E" />
      <Rect x="4"   y="18" width="5" height="4"  rx="2"   fill="#6B5B3E" />
      <Rect x="10"  y="18" width="5" height="4"  rx="2"   fill="#6B5B3E" />
      {/* Main wool body — layered fluffy puffs */}
      <Ellipse cx="0"   cy="4"  rx="18" ry="12" fill="#F2F0E8" />
      <Circle  cx="-12" cy="3"  r="9"            fill="#ECEAE2" />
      <Circle  cx="0"   cy="-3" r="10"           fill="#F5F3EC" />
      <Circle  cx="13"  cy="2"  r="9"            fill="#ECEAE2" />
      <Circle  cx="-6"  cy="7"  r="9"            fill="#F2F0E8" />
      <Circle  cx="7"   cy="6"  r="9"            fill="#ECEAE2" />
      {/* Wool highlight — top sheen */}
      <Ellipse cx="0"   cy="-4" rx="10" ry="5" fill="#FAFAF5" opacity="0.55" />
      {/* Neck */}
      <Ellipse cx="16" cy="2" rx="6" ry="8" fill="#D8D4C4" />
      {/* Head */}
      <Ellipse cx="22" cy="-2" rx="8" ry="7" fill="#D8D4C4" />
      {/* Face details */}
      {/* Snout */}
      <Ellipse cx="27" cy="1"  rx="4.5" ry="3.5" fill="#C8C0A8" />
      {/* Nostril dots */}
      <Circle cx="26" cy="2"   r="1"   fill="#9A8878" />
      <Circle cx="29" cy="2"   r="1"   fill="#9A8878" />
      {/* Eye */}
      <Circle cx="22" cy="-5"  r="2.5" fill="#2A2010" />
      <Circle cx="23" cy="-6"  r="0.9" fill="#FFF"    opacity="0.7" />
      {/* Ear */}
      <Ellipse cx="16" cy="-7" rx="3" ry="4.5" fill="#C8C0A8" transform="rotate(-20, 16, -7)" />
      <Ellipse cx="16" cy="-7" rx="1.5" ry="2.5" fill="#E8BABA" opacity="0.6" transform="rotate(-20, 16, -7)" />
      {/* Small tail nub */}
      <Circle cx="-19" cy="3" r="4" fill="#ECEAE2" />
    </G>
  );
}

// ── Sheep pen SVG (full atmospheric nighttime pastoral scene) ─────────────

// Star positions for pasture sky (fraction of width × height in sky band)
const SHEEP_STARS = [
  [0.04, 0.03], [0.13, 0.01], [0.24, 0.07], [0.36, 0.02], [0.50, 0.05],
  [0.62, 0.01], [0.73, 0.08], [0.84, 0.03], [0.94, 0.06],
  [0.09, 0.14], [0.31, 0.12], [0.52, 0.16], [0.71, 0.11], [0.88, 0.17],
  [0.18, 0.22], [0.43, 0.20], [0.65, 0.24], [0.82, 0.19],
];

function SheepPenBg({ areaH }) {
  const skyBottom = areaH * 0.42;   // where sky transitions to ground
  const groundY   = areaH * 0.55;   // base of hills / ground
  const penY      = areaH * 0.44;   // fence sits here
  const postCount = Math.ceil(W / 42) + 1;
  const moonX     = W * 0.82;
  const moonY     = areaH * 0.10;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {/* Sky gradient — deep indigo to near-black */}
        <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#06051A" stopOpacity="1" />
          <Stop offset="0.6" stopColor="#0B0D2B" stopOpacity="1" />
          <Stop offset="1" stopColor="#121834" stopOpacity="1" />
        </LinearGradient>
        {/* Pasture ground gradient */}
        <LinearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#102A12" stopOpacity="1" />
          <Stop offset="1" stopColor="#091507" stopOpacity="1" />
        </LinearGradient>
        {/* Moon glow radial */}
        <RadialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0"   stopColor="#FEFDE0" stopOpacity="0.22" />
          <Stop offset="0.5" stopColor="#D4D090" stopOpacity="0.08" />
          <Stop offset="1"   stopColor="#888870" stopOpacity="0"    />
        </RadialGradient>
        {/* Grass highlight */}
        <LinearGradient id="grassSheen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2A5C2A" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#0A1A0A" stopOpacity="0"    />
        </LinearGradient>
      </Defs>

      {/* ── Sky ── */}
      <Rect x="0" y="0" width={W} height={skyBottom} fill="url(#skyGrad)" />

      {/* Stars */}
      {SHEEP_STARS.map(([fx, fy], i) => (
        <Circle
          key={i}
          cx={W * fx}
          cy={areaH * 0.30 * fy}
          r={i % 4 === 0 ? 1.6 : 1.0}
          fill="#FFFFFF"
          opacity={0.30 + (i % 5) * 0.12}
        />
      ))}

      {/* Moon glow halo */}
      <Circle cx={moonX} cy={moonY} r={55} fill="url(#moonGlow)" />
      {/* Moon disc */}
      <Circle cx={moonX} cy={moonY} r={16} fill="#FEFDE4" opacity="0.92" />
      {/* Moon craters — subtle */}
      <Circle cx={moonX - 5} cy={moonY + 4} r="3.5" fill="#E8E4C0" opacity="0.45" />
      <Circle cx={moonX + 6} cy={moonY - 5} r="2.5" fill="#E8E4C0" opacity="0.35" />
      <Circle cx={moonX + 2} cy={moonY + 7} r="2"   fill="#E8E4C0" opacity="0.30" />

      {/* ── Rolling hills silhouette ── */}
      <Path
        d={`M0 ${skyBottom}
            Q${W * 0.15} ${skyBottom - 28} ${W * 0.30} ${skyBottom - 8}
            Q${W * 0.45} ${skyBottom + 10} ${W * 0.60} ${skyBottom - 20}
            Q${W * 0.75} ${skyBottom - 35} ${W * 0.88} ${skyBottom - 12}
            Q${W * 0.95} ${skyBottom - 4}  ${W} ${skyBottom}
            L${W} ${groundY} L0 ${groundY} Z`}
        fill="#122A14"
      />
      <Path
        d={`M0 ${skyBottom + 8}
            Q${W * 0.20} ${skyBottom - 10} ${W * 0.38} ${skyBottom + 4}
            Q${W * 0.55} ${skyBottom + 18} ${W * 0.72} ${skyBottom - 6}
            Q${W * 0.85} ${skyBottom - 18} ${W} ${skyBottom + 2}
            L${W} ${groundY} L0 ${groundY} Z`}
        fill="#0E2010"
      />

      {/* ── Ground / Pasture ── */}
      <Rect x="0" y={groundY} width={W} height={areaH - groundY} fill="url(#groundGrad)" />

      {/* Grass sheen strip at ground line */}
      <Rect x="0" y={groundY - 10} width={W} height={22} fill="url(#grassSheen)" />

      {/* Grass tufts — subtle texture */}
      {[0.06, 0.14, 0.28, 0.38, 0.52, 0.61, 0.74, 0.85, 0.93].map((fx, i) => (
        <G key={i}>
          <Path d={`M${W * fx} ${groundY + 2} Q${W * fx - 4} ${groundY - 7} ${W * fx - 2} ${groundY + 2}`}
                stroke="#2A5C2A" strokeWidth="1.5" fill="none" opacity="0.6" />
          <Path d={`M${W * fx + 5} ${groundY + 2} Q${W * fx + 7} ${groundY - 9} ${W * fx + 9} ${groundY + 2}`}
                stroke="#204820" strokeWidth="1.5" fill="none" opacity="0.5" />
        </G>
      ))}

      {/* ── Fence ── */}
      {/* Shadow beneath fence */}
      <Ellipse cx={W / 2} cy={penY + 12} rx={W * 0.52} ry="5" fill="#000" opacity="0.18" />

      {/* Fence posts — rounded tops, wood grain implied by two-tone */}
      {Array.from({ length: postCount }).map((_, i) => {
        const px = i * 42 - 6;
        return (
          <G key={i}>
            {/* Post shadow */}
            <Rect x={px + 3} y={penY - 22} width="7" height="38" rx="3" fill="#000" opacity="0.25" />
            {/* Post body — light wood */}
            <Rect x={px}     y={penY - 24} width="7" height="38" rx="3" fill="#A07830" />
            {/* Post highlight — left edge */}
            <Rect x={px}     y={penY - 24} width="2" height="38" rx="1" fill="#C8A050" opacity="0.6" />
            {/* Post dark grain */}
            <Line x1={px + 4} y1={penY - 18} x2={px + 4} y2={penY + 12} stroke="#7A5820" strokeWidth="1" opacity="0.4" />
            {/* Rounded cap */}
            <Circle cx={px + 3.5} cy={penY - 24} r="3.5" fill="#A07830" />
            <Circle cx={px + 3.5} cy={penY - 24} r="1.5" fill="#C8A050" opacity="0.5" />
          </G>
        );
      })}

      {/* Fence rails — three rails with depth shading */}
      {/* Bottom rail */}
      <Rect x="0" y={penY + 6}  width={W} height="6"  rx="2" fill="#7A5820" />
      <Rect x="0" y={penY + 6}  width={W} height="2"  rx="1" fill="#C8A050" opacity="0.4" />
      {/* Middle rail */}
      <Rect x="0" y={penY - 4}  width={W} height="6"  rx="2" fill="#8B6428" />
      <Rect x="0" y={penY - 4}  width={W} height="2"  rx="1" fill="#C8A050" opacity="0.35" />
      {/* Top rail */}
      <Rect x="0" y={penY - 14} width={W} height="5"  rx="2" fill="#9A7030" />
      <Rect x="0" y={penY - 14} width={W} height="1.5" rx="1" fill="#E0B860" opacity="0.30" />

      {/* ── Moonlit ground behind fence ── */}
      <Ellipse cx={W / 2} cy={groundY + 10} rx={W * 0.45} ry="18" fill="#FEFDE4" opacity="0.04" />

      {/* ── Sheep in pen ─ two detailed sheep ── */}
      {/* Sheep 1 — left, facing right */}
      <SheepSvg cx={W * 0.22} cy={penY + 42} scale={0.92} />
      {/* Sheep 2 — right, facing left (mirrored) */}
      <SheepSvg cx={W * 0.68} cy={penY + 38} scale={0.88} flipX />
      {/* Sheep 3 — small, partially behind pen at center-right */}
      <SheepSvg cx={W * 0.46} cy={penY + 52} scale={0.72} />

      {/* Moon reflection shimmer on ground */}
      <Ellipse cx={moonX} cy={groundY + 18} rx="22" ry="5" fill="#FEFDE4" opacity="0.07" />
    </Svg>
  );
}

// ── Star positions (fraction of width × height) ──────────────────────────
const STARS = [
  [0.05, 0.04], [0.14, 0.02], [0.27, 0.09], [0.41, 0.03],
  [0.58, 0.07], [0.69, 0.02], [0.81, 0.08], [0.93, 0.05],
  [0.08, 0.17], [0.34, 0.14], [0.54, 0.19], [0.74, 0.13],
  [0.89, 0.22], [0.19, 0.26], [0.47, 0.24], [0.63, 0.28],
  [0.84, 0.21], [0.11, 0.33], [0.40, 0.31], [0.77, 0.30],
];

// ── Camp tent positions (fraction of width) ───────────────────────────────
const TENTS = [
  { fx: 0.08, w: 24, h: 20 },
  { fx: 0.18, w: 30, h: 25 },
  { fx: 0.78, w: 28, h: 22 },
  { fx: 0.90, w: 22, h: 18 },
];

// ── Pillar of fire background — full nighttime desert scene ───────────────

function PillarOfFireBg({ pulseAnim, areaH }) {
  const H  = areaH || 600;
  const cx = W / 2;
  const gY = H * 0.70;  // ground line

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ── Static scene ── */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        {/* Night sky */}
        <Rect x="0" y="0" width={W} height={gY} fill="#0D0810" />

        {/* Stars */}
        {STARS.map(([fx, fy], i) => (
          <Circle
            key={i}
            cx={W * fx}
            cy={H * fy}
            r={i % 3 === 0 ? 1.8 : 1.1}
            fill="white"
            opacity={0.45 + (i % 4) * 0.13}
          />
        ))}

        {/* Distant camp tent silhouettes */}
        {TENTS.map(({ fx, w, h }, i) => {
          const tx = W * fx;
          return (
            <Polygon
              key={i}
              points={`${tx - w / 2},${gY} ${tx},${gY - h} ${tx + w / 2},${gY}`}
              fill="#1A0A00"
              opacity="0.75"
            />
          );
        })}

        {/* Fire-pillar outer halo — layered ellipses simulate glow */}
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.22} ry={H * 0.40} fill="#FF4500" opacity="0.04" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.16} ry={H * 0.34} fill="#FF6A00" opacity="0.06" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.11} ry={H * 0.28} fill="#FF8C00" opacity="0.09" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.07} ry={H * 0.22} fill="#FFA500" opacity="0.12" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.04} ry={H * 0.16} fill="#FFD700" opacity="0.16" />
        <Ellipse cx={cx} cy={H * 0.30} rx={W * 0.025} ry={H * 0.11} fill="#FFFDE7" opacity="0.20" />

        {/* Ground illumination from the fire */}
        <Ellipse cx={cx} cy={gY} rx={W * 0.32} ry={15} fill="#FF6A00" opacity="0.18" />
        <Ellipse cx={cx} cy={gY} rx={W * 0.18} ry={8}  fill="#FFD700" opacity="0.22" />

        {/* Desert dunes */}
        <Path
          d={`M0 ${gY} Q${W*0.15} ${gY-22} ${W*0.35} ${gY} Q${W*0.50} ${gY+14} ${W*0.65} ${gY-14} Q${W*0.82} ${gY-26} ${W} ${gY} L${W} ${H} L0 ${H} Z`}
          fill="#4A2A08"
        />
        <Path
          d={`M0 ${gY+12} Q${W*0.22} ${gY} ${W*0.46} ${gY+16} Q${W*0.72} ${gY+26} ${W} ${gY+10} L${W} ${H} L0 ${H} Z`}
          fill="#5C3A12"
        />
      </Svg>

      {/* ── Animated fire-core pulse (only this element scales) ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - 22,
          top: H * 0.05,
          width: 44,
          height: H * 0.65,
          transform: [{ scale: pulseAnim }],
        }}
      >
        <Svg width={44} height={H * 0.65}>
          <Ellipse
            cx={22}
            cy={H * 0.325}
            rx={22}
            ry={H * 0.29}
            fill="#FFD700"
            opacity="0.32"
          />
          <Ellipse
            cx={22}
            cy={H * 0.325}
            rx={12}
            ry={H * 0.19}
            fill="#FFFDE7"
            opacity="0.42"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Pillar fire icon (center target) ──────────────────────────────────────

function PillarFireIcon() {
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      {/* Base ground glow */}
      <Ellipse cx="28" cy="51" rx="20" ry="5"  fill="#FF8C00" opacity="0.35" />
      <Ellipse cx="28" cy="51" rx="12" ry="3"  fill="#FFD700" opacity="0.50" />
      {/* Outer flame */}
      <Path
        d="M13 51 Q9 36 15 24 Q12 31 14 21 Q17 11 28 6 Q39 11 42 21 Q44 31 41 24 Q47 36 43 51Z"
        fill="#FF4500"
        opacity="0.92"
      />
      {/* Mid flame */}
      <Path
        d="M17 51 Q14 38 18 28 Q16 34 18 25 Q21 16 28 12 Q35 16 38 25 Q40 34 38 28 Q42 38 39 51Z"
        fill="#FFA500"
      />
      {/* Inner flame */}
      <Path
        d="M21 51 Q19 41 22 33 Q21 38 23 30 Q25 22 28 18 Q31 22 33 30 Q35 38 34 33 Q37 41 35 51Z"
        fill="#FFD700"
      />
      {/* White-hot core */}
      <Path
        d="M25 51 Q24 44 26 38 Q27.5 44 28 38 Q28.5 44 30 38 Q32 44 31 51Z"
        fill="#FFFDE7"
        opacity="0.95"
      />
    </Svg>
  );
}

// ── Main wrapper (measures layout) ──────────────────────────────────────

export default function GuardTask(props) {
  const [areaSize, setAreaSize] = useState(null);

  const handleLayout = useCallback((e) => {
    if (!areaSize) {
      setAreaSize({
        w: e.nativeEvent.layout.width,
        h: e.nativeEvent.layout.height,
      });
    }
  }, [areaSize]);

  return (
    <TaskContainer scrollable={false} centered={false} padded={false} style={{ backgroundColor: colors.background.space }} onLayout={handleLayout}>
      {areaSize && <GuardTaskInner {...props} areaW={areaSize.w} areaH={areaSize.h} />}
    </TaskContainer>
  );
}

// ── Inner component (has measured dimensions) ───────────────────────────

function GuardTaskInner({ config, onSuccess, onFail, taskId, areaW, areaH }) {
  const { waveDuration, maxMisses } = config;
  const centerY = areaH * 0.35;

  const [enemies, setEnemies] = useState([]);
  const [misses,  setMisses]  = useState(0);
  const [done,    setDone]    = useState(false);
  const missRef  = useRef(0);
  const doneRef  = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pillar of fire — fire-core flicker pulse
  useEffect(() => {
    if (taskId !== 'pillar_of_fire') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 600,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.96, duration: 500,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 400,  useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600,  useNativeDriver: true }),
      ])
    ).start();
  }, [taskId]);

  useEffect(() => {
    const spawnInterval = setInterval(() => {
      if (doneRef.current) return;
      const e = makeEnemy(centerY, areaH);
      setEnemies((prev) => [...prev, e]);
      e.anim = Animated.timing(e.pan, {
        toValue:  { x: CENTER_X, y: centerY },
        duration: ENEMY_DURATION,
        useNativeDriver: false,
      });
      e.anim.start(({ finished }) => {
        if (finished && !doneRef.current) {
          missRef.current += 1;
          setMisses(missRef.current);
          setEnemies((prev) => prev.filter((en) => en.id !== e.id));
          if (missRef.current >= maxMisses) {
            doneRef.current = true;
            setDone(true);
            onFail();
          }
        }
      });
    }, SPAWN_INTERVAL);

    const waveTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setDone(true);
        clearInterval(spawnInterval);
        onSuccess();
      }
    }, waveDuration);

    return () => {
      clearInterval(spawnInterval);
      clearTimeout(waveTimer);
      doneRef.current = true;
    };
  }, []);

  const killEnemy = (id) => {
    if (doneRef.current) return;
    setEnemies((prev) => {
      const e = prev.find((en) => en.id === id);
      if (e && e.anim) e.anim.stop();
      return prev.filter((en) => en.id !== id);
    });
  };

  const isPillar = taskId === 'pillar_of_fire';
  const isSheep  = taskId === 'protect_the_sheep' || taskId === 'the_lost_sheep';
  const EnemyComponent = isPillar ? SoldierSvg : WolfSvg;

  const hint = isPillar
    ? 'Guard the camp! Tap soldiers before they breach the fire!'
    : 'Tap enemies before they reach the flock!';

  return (
    <>
      {/* Backgrounds */}
      {isPillar && <PillarOfFireBg pulseAnim={pulseAnim} areaH={areaH} />}
      {isSheep  && <SheepPenBg areaH={areaH} />}

      <Text style={styles.hint}>{hint}</Text>
      <View style={styles.missRow}>
        {Array.from({ length: maxMisses }).map((_, i) => (
          <Text key={i} style={[styles.missHeart, { opacity: i < misses ? 0.25 : 1 }]}>
            ♥
          </Text>
        ))}
      </View>

      {/* Center target: SVG fire column for pillar, detailed sheep SVG for sheep tasks */}
      <View style={[styles.center, { left: CENTER_X, top: centerY }]}>
        {isPillar
          ? <PillarFireIcon />
          : (
            <Svg width={ENEMY_SIZE} height={ENEMY_SIZE} viewBox="-28 -20 56 46">
              <SheepSvg cx={0} cy={4} scale={1.0} />
            </Svg>
          )
        }
      </View>

      {enemies.map((e) => (
        <Animated.View
          key={e.id}
          style={[styles.enemy, e.pan.getLayout()]}
        >
          <TouchableOpacity
            style={styles.enemyTouch}
            onPress={() => killEnemy(e.id)}
            activeOpacity={0.6}
          >
            <EnemyComponent />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: fonts.ui.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  missRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  missHeart: {
    fontSize: 22,
    color: colors.state.error,
  },
  center: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
  },
  enemyTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
