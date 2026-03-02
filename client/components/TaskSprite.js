import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, G, Line, Ellipse } from 'react-native-svg';
import { Text } from 'react-native';
import { TASK_SPRITE } from '../data/tasks';

const FIRE = '#FFA63D';
const BG   = '#0B0C10';

const SPRITES = {
  // ── SCRIPTURE ──────────────────────────────────────────────────────────

  scripture_memory: (c) => (
    <G>
      <Rect x="8" y="10" width="16" height="12" rx="1" fill={c} />
      <Circle cx="8"  cy="16" r="3.5" fill={c} />
      <Circle cx="24" cy="16" r="3.5" fill={c} />
      <Line x1="11" y1="13" x2="21" y2="13" stroke={BG} strokeWidth="1.2" />
      <Line x1="11" y1="16" x2="21" y2="16" stroke={BG} strokeWidth="1.2" />
      <Line x1="11" y1="19" x2="21" y2="19" stroke={BG} strokeWidth="1.2" />
    </G>
  ),

  john_3_16: (c) => (
    <G>
      <Path d="M16 26 C8 19 3 15 3 10 C3 6 6 4 10 5.5 C12.5 6.5 14.5 9 16 11 C17.5 9 19.5 6.5 22 5.5 C26 4 29 6 29 10 C29 15 24 19 16 26Z" fill={c} />
      <Rect x="14.5" y="12" width="3" height="8"  fill={BG} opacity="0.6" />
      <Rect x="11.5" y="15" width="9" height="3"  fill={BG} opacity="0.6" />
    </G>
  ),

  psalm_23: (c) => (
    <G>
      <Path d="M20 28 L20 8 Q20 3 15 3 Q10 3 10 8 Q10 11 14 11" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="8" cy="24" rx="5" ry="4" fill={c} />
      <Circle  cx="8" cy="20" r="2.5" fill={c} />
      <Line x1="5"  y1="27" x2="5"  y2="30" stroke={c} strokeWidth="1.5" />
      <Line x1="11" y1="27" x2="11" y2="30" stroke={c} strokeWidth="1.5" />
    </G>
  ),

  romans_8_28: (c) => (
    <G>
      <Circle cx="16" cy="8" r="3" stroke={c} strokeWidth="2" fill="none" />
      <Line   x1="16" y1="11" x2="16" y2="28" stroke={c} strokeWidth="2.5" />
      <Line   x1="9"  y1="16" x2="23" y2="16" stroke={c} strokeWidth="2" />
      <Path   d="M9 28 Q9 24 16 24 Q23 24 23 28" stroke={c} strokeWidth="2" fill="none" />
      <Circle cx="9"  cy="28" r="2" fill={c} />
      <Circle cx="23" cy="28" r="2" fill={c} />
    </G>
  ),

  philippians_4_13: (c) => (
    <G>
      <Path d="M6 24 Q6 18 10 16 Q14 14 16 12 Q20 8 24 10 Q28 12 26 16 Q24 20 20 18 Q16 16 14 20 Q12 24 10 26 Z" fill={c} />
      <Line x1="6" y1="24" x2="12" y2="26" stroke={BG} strokeWidth="1.5" />
    </G>
  ),

  isaiah_40_31: (c) => (
    <G>
      <Path d="M16 16 Q10 12 4 8 Q6 14 10 18Z" fill={c} />
      <Path d="M16 16 Q22 12 28 8 Q26 14 22 18Z" fill={c} />
      <Ellipse cx="16" cy="18" rx="3" ry="5" fill={c} />
      <Circle cx="16" cy="12" r="3" fill={c} />
      <Polygon points="16,10 19,12 16,13" fill={FIRE} />
    </G>
  ),

  hebrews_11_1: (c) => (
    <G>
      <Polygon points="16,3 19,12 29,12 21,18 24,28 16,22 8,28 11,18 3,12 13,12" fill={c} />
      <Circle cx="16" cy="16" r="4" fill={c} opacity="0.5" />
    </G>
  ),

  // ── TRIVIA ─────────────────────────────────────────────────────────────

  ten_commandments: (c) => (
    <G>
      <Rect x="3"  y="6" width="11" height="22" rx="5" fill={c} />
      <Rect x="18" y="6" width="11" height="22" rx="5" fill={c} />
      <Line x1="6"  y1="14" x2="11" y2="14" stroke={BG} strokeWidth="1.2" />
      <Line x1="6"  y1="18" x2="11" y2="18" stroke={BG} strokeWidth="1.2" />
      <Line x1="6"  y1="22" x2="11" y2="22" stroke={BG} strokeWidth="1.2" />
      <Line x1="21" y1="14" x2="26" y2="14" stroke={BG} strokeWidth="1.2" />
      <Line x1="21" y1="18" x2="26" y2="18" stroke={BG} strokeWidth="1.2" />
      <Line x1="21" y1="22" x2="26" y2="22" stroke={BG} strokeWidth="1.2" />
    </G>
  ),

  fruits_of_spirit: (c) => (
    <G>
      <Circle cx="12" cy="14" r="3.5" fill={c} />
      <Circle cx="20" cy="14" r="3.5" fill={c} />
      <Circle cx="8"  cy="20" r="3.5" fill={c} />
      <Circle cx="16" cy="20" r="3.5" fill={c} />
      <Circle cx="24" cy="20" r="3.5" fill={c} />
      <Circle cx="12" cy="26" r="3.5" fill={c} />
      <Circle cx="20" cy="26" r="3.5" fill={c} />
      <Line x1="16" y1="10" x2="16" y2="5"  stroke={c} strokeWidth="2" />
      <Line x1="16" y1="5"  x2="22" y2="3"  stroke={c} strokeWidth="1.5" />
      <Path d="M16 5 Q20 2 24 5 Q20 8 16 5" fill={c} opacity="0.7" />
    </G>
  ),

  rebuilding_wall: (c) => (
    <G>
      <Rect x="3"  y="6"  width="12" height="5" rx="1" fill={c} />
      <Rect x="17" y="6"  width="12" height="5" rx="1" fill={c} />
      <Rect x="3"  y="13" width="7"  height="5" rx="1" fill={c} />
      <Rect x="12" y="13" width="12" height="5" rx="1" fill={c} />
      <Rect x="26" y="13" width="3"  height="5" rx="1" fill={c} />
      <Rect x="3"  y="20" width="12" height="5" rx="1" fill={c} />
      <Rect x="17" y="20" width="12" height="5" rx="1" fill={c} />
    </G>
  ),

  jesus_miracles: (c) => (
    <G>
      <Line x1="16" y1="2"  x2="16" y2="6"  stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Line x1="26" y1="6"  x2="23" y2="9"  stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Line x1="30" y1="16" x2="26" y2="16" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Line x1="26" y1="26" x2="23" y2="23" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Line x1="6"  y1="26" x2="9"  y2="23" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Line x1="2"  y1="16" x2="6"  y2="16" stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Line x1="6"  y1="6"  x2="9"  y2="9"  stroke={c} strokeWidth="1.5" opacity="0.6" />
      <Rect x="13" y="7"  width="6" height="18" rx="1" fill={c} />
      <Rect x="7"  y="12" width="18" height="6" rx="1" fill={c} />
    </G>
  ),

  prophets_quiz: (c) => (
    <G>
      <Path d="M16 30 C8 26 6 20 10 14 C8 18 12 20 11 14 C12 8 15 6 16 2 C17 6 20 8 21 14 C20 20 24 18 22 14 C26 20 24 26 16 30Z" fill={FIRE} />
      <Path d="M16 26 C12 22 12 18 14 14 C14 17 16 18 16 14 C16 17 18 17 18 14 C20 18 20 22 16 26Z" fill={c} opacity="0.8" />
    </G>
  ),

  parables_quiz: (c) => (
    <G>
      <Line x1="16" y1="28" x2="16" y2="8" stroke={c} strokeWidth="2" />
      <Ellipse cx="16" cy="7" rx="3" ry="5" fill={c} />
      <Line x1="16" y1="22" x2="10" y2="14" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="9" cy="12" rx="2.5" ry="4" fill={c} />
      <Line x1="16" y1="22" x2="22" y2="14" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="23" cy="12" rx="2.5" ry="4" fill={c} />
      <Ellipse cx="16" cy="24" rx="4" ry="2" fill={c} opacity="0.8" />
    </G>
  ),

  acts_quiz: (c) => (
    <G>
      <Path d="M4 22 Q6 28 16 28 Q26 28 28 22Z" fill={c} />
      <Line x1="16" y1="22" x2="16" y2="6" stroke={c} strokeWidth="2" />
      <Path d="M16 7 L26 20 L16 20Z" fill={c} opacity="0.8" />
      <Path d="M16 10 L8 20 L16 20Z" fill={c} opacity="0.6" />
      <Path d="M2 26 Q6 24 10 26 Q14 28 18 26 Q22 24 26 26 Q28 27 30 26" stroke={c} strokeWidth="1" fill="none" opacity="0.5" />
    </G>
  ),

  noahs_animals: (c) => (
    <G>
      <Ellipse cx="16" cy="18" rx="7" ry="5" fill={c} />
      <Circle cx="22" cy="14" r="4" fill={c} />
      <Polygon points="26,14 30,13 26,16" fill={FIRE} />
      <Path d="M16 14 Q10 10 6 14 Q10 18 16 18Z" fill={c} opacity="0.8" />
      <Path d="M9 20 Q6 24 4 22 Q7 26 10 23Z" fill={c} />
      <Line x1="28" y1="15" x2="24" y2="18" stroke="#4CAF50" strokeWidth="1.5" />
      <Ellipse cx="23" cy="19" rx="2" ry="1.5" fill="#4CAF50" />
    </G>
  ),

  // ── CHALLENGES ─────────────────────────────────────────────────────────

  david_and_goliath: (c) => (
    <G>
      <Line x1="16" y1="28" x2="16" y2="18" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <Line x1="16" y1="18" x2="8"  y2="10" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <Line x1="16" y1="18" x2="24" y2="10" stroke={c} strokeWidth="3" strokeLinecap="round" />
      <Line x1="8"  y1="10" x2="16" y2="5"  stroke={c} strokeWidth="1.5" opacity="0.7" />
      <Line x1="24" y1="10" x2="16" y2="5"  stroke={c} strokeWidth="1.5" opacity="0.7" />
      <Circle cx="16" cy="4" r="3" fill={c} />
    </G>
  ),

  pauls_belongings: (c) => (
    <G>
      <Path d="M6 10 Q4 16 5 26 L12 28 L16 24 L20 28 L27 26 Q28 16 26 10 Q22 8 16 8 Q10 8 6 10Z" fill={c} opacity="0.35" />
      <Rect x="9"  y="12" width="14" height="11" rx="2" fill={c} opacity="0.9" />
      <Line x1="11" y1="15" x2="21" y2="15" stroke={BG} strokeWidth="1" />
      <Line x1="11" y1="18" x2="21" y2="18" stroke={BG} strokeWidth="1" />
      <Line x1="11" y1="21" x2="21" y2="21" stroke={BG} strokeWidth="1" />
      <Rect  x="8"  y="7" width="16" height="7" rx="1" fill={c} />
      <Circle cx="8"  cy="10.5" r="3.5" fill={c} />
      <Circle cx="24" cy="10.5" r="3.5" fill={c} />
      <Line x1="11" y1="9"  x2="21" y2="9"  stroke={BG} strokeWidth="0.8" />
      <Line x1="11" y1="11" x2="21" y2="11" stroke={BG} strokeWidth="0.8" />
      <Line x1="11" y1="13" x2="21" y2="13" stroke={BG} strokeWidth="0.8" />
    </G>
  ),

  lamp_on_lampstand: (c) => (
    <G>
      <Rect x="10" y="28" width="12" height="2" rx="1" fill={c} />
      <Rect x="12" y="25" width="8"  height="3" rx="1" fill={c} />
      <Rect x="15" y="15" width="2"  height="10" fill={c} opacity="0.9" />
      <Ellipse cx="16" cy="15" rx="6" ry="3" fill={c} />
      <Path d="M10 15 Q10 12 16 12 Q22 12 22 15" fill={c} />
      <Path d="M21 13 Q25 12 26 11" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M26 11 C25 8 25 5 27 3 C29 5 29 8 27 11Z" fill={FIRE} />
      <Path d="M26.5 10 C26 8 26.5 6 27 5 C27.5 6 28 8 27.5 10Z" fill="#FFE082" />
      <Path d="M10 13 Q7 13 7 15 Q7 17 10 17" stroke={c} strokeWidth="1.5" fill="none" />
    </G>
  ),

  protect_the_sheep: (c) => (
    <G>
      <Circle cx="13" cy="18" r="5" fill={c} />
      <Circle cx="19" cy="18" r="5" fill={c} />
      <Circle cx="16" cy="15" r="4" fill={c} />
      <Circle cx="16" cy="21" r="5" fill={c} />
      <Ellipse cx="24" cy="14" rx="4" ry="3.5" fill={c} opacity="0.85" />
      <Circle  cx="26" cy="12" r="1" fill={BG} />
      <Rect x="12" y="24" width="2" height="5" rx="1" fill={c} />
      <Rect x="16" y="24" width="2" height="5" rx="1" fill={c} />
      <Rect x="20" y="24" width="2" height="5" rx="1" fill={c} />
    </G>
  ),

  feeding_five_thousand: (c) => (
    <G>
      <Path d="M5  12 Q9  9 13 12 Q9  15 5  12Z" fill={c} />
      <Path d="M3  12 L5  10 L5  14Z"             fill={c} />
      <Path d="M19 12 Q23 9 27 12 Q23 15 19 12Z" fill={c} />
      <Path d="M17 12 L19 10 L19 14Z"            fill={c} />
      <Ellipse cx="9"  cy="22" rx="5" ry="4" fill={c} />
      <Ellipse cx="16" cy="22" rx="5" ry="4" fill={c} />
      <Ellipse cx="23" cy="22" rx="5" ry="4" fill={c} />
      <Line x1="9"  y1="20" x2="9"  y2="24" stroke={BG} strokeWidth="1" />
      <Line x1="16" y1="20" x2="16" y2="24" stroke={BG} strokeWidth="1" />
      <Line x1="23" y1="20" x2="23" y2="24" stroke={BG} strokeWidth="1" />
    </G>
  ),

  manna_wilderness: (c) => (
    <G>
      {/* Cloud */}
      <Circle cx="10" cy="8" r="4" fill={c} opacity="0.6" />
      <Circle cx="16" cy="6" r="5" fill={c} opacity="0.7" />
      <Circle cx="22" cy="8" r="4" fill={c} opacity="0.6" />
      <Rect x="6" y="8" width="20" height="3" fill={c} opacity="0.6" />
      {/* Falling manna wafers */}
      <Circle cx="9"  cy="18" r="3.5" fill="#DEB887" />
      <Circle cx="9"  cy="18" r="2.5" fill="#F5DEB3" />
      <Circle cx="17" cy="22" r="3.5" fill="#DEB887" />
      <Circle cx="17" cy="22" r="2.5" fill="#F5DEB3" />
      <Circle cx="24" cy="17" r="3.5" fill="#DEB887" />
      <Circle cx="24" cy="17" r="2.5" fill="#F5DEB3" />
    </G>
  ),

  walls_of_jericho: (c) => (
    <G>
      <Rect x="6" y="8" width="20" height="20" rx="1" fill={c} />
      <Rect x="6"  y="4" width="4" height="5" rx="1" fill={c} />
      <Rect x="14" y="4" width="4" height="5" rx="1" fill={c} />
      <Rect x="22" y="4" width="4" height="5" rx="1" fill={c} />
      <Line x1="6"  y1="14" x2="26" y2="14" stroke={BG} strokeWidth="0.8" />
      <Line x1="6"  y1="20" x2="26" y2="20" stroke={BG} strokeWidth="0.8" />
      <Line x1="16" y1="8"  x2="16" y2="14" stroke={BG} strokeWidth="0.8" />
      <Line x1="11" y1="14" x2="11" y2="20" stroke={BG} strokeWidth="0.8" />
      <Line x1="21" y1="14" x2="21" y2="20" stroke={BG} strokeWidth="0.8" />
      <Path d="M16 5 L15 12 L17 18 L14 28" stroke={BG} strokeWidth="2" fill="none" strokeLinecap="round" />
    </G>
  ),

  ark_of_covenant: (c) => (
    <G>
      <Rect x="4" y="12" width="24" height="16" rx="2" fill={c} />
      <Rect x="3" y="10" width="26" height="4"  rx="1" fill={c} opacity="0.8" />
      <Rect x="4" y="17" width="24" height="2" fill={BG} opacity="0.3" />
      <Circle cx="6"  cy="20" r="2" fill={c} stroke={BG} strokeWidth="0.8" />
      <Circle cx="26" cy="20" r="2" fill={c} stroke={BG} strokeWidth="0.8" />
      <Line x1="1"  y1="20" x2="6"  y2="20" stroke={FIRE} strokeWidth="2" />
      <Line x1="26" y1="20" x2="31" y2="20" stroke={FIRE} strokeWidth="2" />
      <Path d="M16 10 Q10 6 8 8" stroke={c} strokeWidth="1.5" fill="none" />
      <Path d="M16 10 Q22 6 24 8" stroke={c} strokeWidth="1.5" fill="none" />
    </G>
  ),

  gideons_torch: (c) => (
    <G>
      <Rect x="14" y="18" width="4" height="12" rx="2" fill={c} />
      <Rect x="12" y="13" width="8" height="6" rx="1" fill={c} opacity="0.8" />
      <Line x1="12" y1="15" x2="20" y2="15" stroke={BG} strokeWidth="0.8" />
      <Line x1="12" y1="17" x2="20" y2="17" stroke={BG} strokeWidth="0.8" />
      <Path d="M16 14 C13 10 12 6 15 3 C15 7 17 7 16 4 C18 7 20 10 19 14Z" fill={FIRE} />
      <Path d="M16 13 C14.5 10 14.5 7 16 5.5 C17.5 7 17.5 10 16 13Z" fill="#FFE082" />
    </G>
  ),

  fiery_furnace: (c) => (
    <G>
      <Path d="M4 28 L4 16 Q4 8 16 8 Q28 8 28 16 L28 28Z" fill={c} />
      <Path d="M10 28 L10 18 Q10 13 16 13 Q22 13 22 18 L22 28Z" fill={BG} />
      <Path d="M16 28 C13 24 12 20 14 17 C14 20 16 20 15 17 C16 19 18 19 17 17 C19 20 20 24 16 28Z" fill={FIRE} />
      <Path d="M16 26 C14.5 23 15 21 16 19.5 C17 21 17.5 23 16 26Z" fill="#FFE082" />
      <Line x1="10" y1="8" x2="8"  y2="4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="8" x2="16" y2="4" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="22" y1="8" x2="24" y2="4" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  solomons_temple: (c) => (
    <G>
      <Polygon points="4,12 16,3 28,12" fill={c} />
      <Rect x="3" y="12" width="26" height="3" fill={c} opacity="0.9" />
      <Rect x="5"  y="15" width="3" height="13" rx="1" fill={c} />
      <Rect x="11" y="15" width="3" height="13" rx="1" fill={c} />
      <Rect x="17" y="15" width="3" height="13" rx="1" fill={c} />
      <Rect x="23" y="15" width="3" height="13" rx="1" fill={c} />
      <Rect x="2"  y="28" width="28" height="2" rx="0" fill={c} opacity="0.8" />
      <Rect x="4"  y="26" width="24" height="2" rx="0" fill={c} opacity="0.6" />
    </G>
  ),

  water_from_rock: (c) => (
    <G>
      <Path d="M8 28 Q6 22 8 16 Q10 10 16 9 Q22 8 24 14 Q26 20 26 28Z" fill={c} opacity="0.8" />
      <Path d="M16 9 L15 15 L17 20" stroke={BG} strokeWidth="1.5" fill="none" />
      <Path d="M13 17 Q9 20 7 26"   stroke="#87CEEB" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M16 19 Q14 23 13 28" stroke="#87CEEB" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M19 17 Q23 20 25 26" stroke="#87CEEB" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Circle cx="7"  cy="28" r="2" fill="#87CEEB" opacity="0.8" />
      <Circle cx="13" cy="29" r="2" fill="#87CEEB" opacity="0.8" />
      <Circle cx="25" cy="27" r="2" fill="#87CEEB" opacity="0.8" />
    </G>
  ),

  the_lost_sheep: (c) => (
    <G>
      <Circle cx="13" cy="19" r="4.5" fill={c} />
      <Circle cx="19" cy="19" r="4.5" fill={c} />
      <Circle cx="16" cy="16" r="3.5" fill={c} />
      <Circle cx="16" cy="22" r="4.5" fill={c} />
      <Ellipse cx="8" cy="15" rx="3.5" ry="3" fill={c} opacity="0.85" />
      <Circle cx="6.5" cy="13.5" r="1" fill={BG} />
      <Rect x="12" y="25" width="2" height="5" rx="1" fill={c} />
      <Rect x="18" y="25" width="2" height="5" rx="1" fill={c} />
      <Path d="M26 5 Q28 2 30 5 Q30 8 27 9 L27 11" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Circle cx="27" cy="13" r="1" fill={c} />
    </G>
  ),

  jonah_storm: (c) => (
    <G>
      <Path d="M2 22 Q7 16 12 22 Q17 28 22 22 Q27 16 30 22" stroke={c} strokeWidth="3" fill="none" />
      <Path d="M2 16 Q7 10 12 16 Q17 22 22 16 Q27 10 30 16" stroke={c} strokeWidth="2" fill="none" opacity="0.6" />
      <Path d="M10 22 Q12 16 16 14 Q20 16 22 22Z" fill={c} />
      <Path d="M10 22 Q8 18 6 20Z"  fill={c} />
      <Path d="M22 22 Q24 18 26 20Z" fill={c} />
    </G>
  ),

  walking_on_water: (c) => (
    <G>
      <Path d="M2 20 Q8 16 14 20 Q20 24 26 20 Q28 18 30 20" stroke={c} strokeWidth="2" fill="none" />
      <Path d="M2 25 Q8 21 14 25 Q20 29 26 25" stroke={c} strokeWidth="1.5" fill="none" opacity="0.6" />
      <Ellipse cx="18" cy="13" rx="5" ry="7" fill={c} opacity="0.9" />
      <Circle cx="15" cy="7.5"  r="1.5" fill={c} />
      <Circle cx="17" cy="6.5"  r="1.5" fill={c} />
      <Circle cx="19" cy="6.5"  r="1.5" fill={c} />
      <Circle cx="21" cy="7"    r="1.5" fill={c} />
      <Circle cx="23" cy="8"    r="1.5" fill={c} />
      <Line x1="14" y1="10" x2="22" y2="10" stroke={BG} strokeWidth="1" />
      <Line x1="13" y1="13" x2="23" y2="13" stroke={BG} strokeWidth="1" />
    </G>
  ),

  pillar_of_fire: (c) => (
    <G>
      <Path d="M10 30 Q8 22 11 16 Q9 18 10 12 Q12 6 16 2 Q20 6 22 12 Q23 18 21 16 Q24 22 22 30Z" fill={FIRE} />
      <Path d="M13 28 Q12 22 14 18 Q13 20 14 16 Q15 10 16 7 Q17 10 18 16 Q19 20 18 18 Q20 22 19 28Z" fill={c} opacity="0.7" />
      <Ellipse cx="16" cy="30" rx="8" ry="2" fill={FIRE} opacity="0.4" />
    </G>
  ),

  jordan_river: (c) => (
    <G>
      <Path d="M0 10 Q8 14 16 10 Q24 6 32 10 L32 0 L0 0Z" fill={c} opacity="0.4" />
      <Path d="M0 22 Q8 18 16 22 Q24 26 32 22 L32 32 L0 32Z" fill={c} opacity="0.4" />
      <Path d="M0 10 Q8 14 16 10 Q24 6 32 10 L32 22 Q24 26 16 22 Q8 18 0 22Z" fill={c} opacity="0.3" />
      <Ellipse cx="8"  cy="16" rx="4" ry="3" fill={c} opacity="0.9" />
      <Ellipse cx="16" cy="16" rx="4" ry="3" fill={c} opacity="0.9" />
      <Ellipse cx="24" cy="16" rx="4" ry="3" fill={c} opacity="0.9" />
    </G>
  ),

  // ── PATIENCE (don't tap) ─────────────────────────────────────────────

  still_waters: (c) => (
    <G>
      {/* Rock */}
      <Path d="M6 28 Q4 20 6 14 Q9 8 16 7 Q23 6 25 12 Q27 18 27 28Z" fill="#8B9CB0" />
      <Path d="M16 7 L15 14 L17 19" stroke={BG} strokeWidth="1.5" fill="none" />
      {/* Water drops - don't strike! */}
      <Path d="M12 20 Q8 23 7 27" stroke="#87CEEB" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M20 19 Q24 22 25 27" stroke="#87CEEB" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* X mark (don't tap) */}
      <Line x1="3" y1="3" x2="8" y2="8" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="3" x2="3" y2="8" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  be_still: (c) => (
    <G>
      {/* Calm water */}
      <Path d="M2 18 Q8 14 16 18 Q24 22 30 18" stroke={c} strokeWidth="2" fill="none" />
      <Path d="M2 24 Q8 20 16 24 Q24 28 30 24" stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Serene clouds */}
      <Circle cx="10" cy="8" r="4" fill={c} opacity="0.3" />
      <Circle cx="16" cy="6" r="5" fill={c} opacity="0.4" />
      <Circle cx="22" cy="8" r="4" fill={c} opacity="0.3" />
      {/* Peace symbol - small cross */}
      <Rect x="14.5" y="10" width="3" height="6" rx="0.5" fill={c} opacity="0.6" />
      <Rect x="12" y="12" width="8" height="3" rx="0.5" fill={c} opacity="0.6" />
    </G>
  ),

  wait_on_the_lord: (c) => (
    <G>
      {/* Eagle wings spread */}
      <Path d="M16 16 Q10 12 4 8 Q6 14 10 18Z" fill={c} />
      <Path d="M16 16 Q22 12 28 8 Q26 14 22 18Z" fill={c} />
      {/* Body */}
      <Ellipse cx="16" cy="18" rx="3" ry="5" fill={c} />
      {/* Head */}
      <Circle cx="16" cy="12" r="3" fill={c} />
      {/* Beak */}
      <Polygon points="16,13 14,15 18,15" fill={FIRE} />
      {/* Sun rays */}
      <Line x1="16" y1="2" x2="16" y2="5" stroke={FIRE} strokeWidth="1.5" opacity="0.5" />
      <Line x1="8"  y1="4" x2="10" y2="7" stroke={FIRE} strokeWidth="1" opacity="0.4" />
      <Line x1="24" y1="4" x2="22" y2="7" stroke={FIRE} strokeWidth="1" opacity="0.4" />
      {/* Hourglass below */}
      <Path d="M12 26 L16 22 L20 26 L16 30Z" stroke={c} strokeWidth="1.5" fill="none" />
    </G>
  ),

  // ── COOPERATIVE ────────────────────────────────────────────────────────

  body_of_christ: (c) => (
    <G>
      <Circle cx="7"  cy="8" r="3" fill={c} />
      <Path d="M4 11 Q4 18 7 20 Q10 18 10 11Z" fill={c} />
      <Circle cx="16" cy="8" r="3" fill={c} />
      <Path d="M13 11 Q13 18 16 20 Q19 18 19 11Z" fill={c} />
      <Circle cx="25" cy="8" r="3" fill={c} />
      <Path d="M22 11 Q22 18 25 20 Q28 18 28 11Z" fill={c} />
      <Line x1="10" y1="15" x2="13" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="19" y1="15" x2="22" y2="15" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="5"  y1="20" x2="4"  y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="9"  y1="20" x2="10" y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="14" y1="20" x2="13" y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="18" y1="20" x2="19" y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="23" y1="20" x2="22" y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="27" y1="20" x2="28" y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  shout_of_victory: (c) => (
    <G>
      <Path d="M4 26 Q6 24 8 20 Q10 14 12 10 Q14 6 18 4 Q22 2 26 6 Q28 8 28 12 Q28 14 26 14 Q24 14 24 12 Q24 8 20 7 Q16 8 14 12 Q12 16 10 22 Q8 26 6 28 Z" fill={c} />
      <Ellipse cx="5" cy="27" rx="3" ry="3.5" fill={c} opacity="0.7" />
      <Path d="M2 20 Q0 22 2 24"  stroke={c} strokeWidth="1.5" fill="none" opacity="0.7" />
      <Path d="M0 17 Q-2 20 0 24" stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
    </G>
  ),

  loaves_and_fish: (c) => (
    <G>
      <Path d="M6 14 Q4 22 5 28 L27 28 Q28 22 26 14Z" fill={c} opacity="0.8" />
      <Line x1="6"  y1="18" x2="26" y2="18" stroke={BG} strokeWidth="0.8" />
      <Line x1="5"  y1="23" x2="27" y2="23" stroke={BG} strokeWidth="0.8" />
      <Line x1="9"  y1="14" x2="7"  y2="28" stroke={BG} strokeWidth="0.8" />
      <Line x1="16" y1="14" x2="16" y2="28" stroke={BG} strokeWidth="0.8" />
      <Line x1="23" y1="14" x2="25" y2="28" stroke={BG} strokeWidth="0.8" />
      <Ellipse cx="16" cy="14" rx="10" ry="3" fill={c} />
      <Path d="M9  10 Q13 7 17 10 Q13 13 9  10Z" fill={c} opacity="0.9" />
      <Path d="M7  10 L9  8 L9  12Z"             fill={c} />
      <Ellipse cx="22" cy="11" rx="5" ry="3" fill={c} opacity="0.85" />
    </G>
  ),

  circle_of_prayer: (c) => (
    <G>
      <Circle cx="16" cy="16" r="11" stroke={c} strokeWidth="3" fill="none" />
      <Circle cx="16" cy="16" r="7"  stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
      <Ellipse cx="16" cy="4"  rx="3" ry="2.5" fill={c} />
      <Ellipse cx="16" cy="28" rx="3" ry="2.5" fill={c} />
      <Ellipse cx="28" cy="16" rx="2.5" ry="3" fill={c} />
      <Ellipse cx="4"  cy="16" rx="2.5" ry="3" fill={c} />
      <Ellipse cx="23" cy="7"  rx="2.5" ry="2" fill={c} />
      <Ellipse cx="9"  cy="7"  rx="2.5" ry="2" fill={c} />
      <Ellipse cx="23" cy="25" rx="2.5" ry="2" fill={c} />
      <Ellipse cx="9"  cy="25" rx="2.5" ry="2" fill={c} />
    </G>
  ),
};

export default function TaskSprite({ taskId, size = 28, color = '#00D4FF' }) {
  const renderer = SPRITES[taskId];
  if (!renderer) {
    const emoji = TASK_SPRITE[taskId] || '📖';
    return <Text style={{ fontSize: size * 0.85 }}>{emoji}</Text>;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {renderer(color)}
    </Svg>
  );
}
