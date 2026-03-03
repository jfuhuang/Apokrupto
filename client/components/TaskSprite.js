/**
 * TaskSprite.js — Inline SVG sprite library for task cards.
 *
 * All sprites are AI-generated flat-vector icons at 32×32 viewBox.
 * Style guide:
 *   • BG   (#0B0C10) — dark background fill
 *   • c    (arg)     — primary team color (Phos blue / Skotia red / custom)
 *   • FIRE (#FFA63D) — accent: fire, gold, warmth
 *   • Outlines: #E0E0E0 at strokeWidth 1.5–2 (or BG for interior dividers)
 *   • No other hard-coded hex values
 *
 * ── SPRITE INVENTORY ──────────────────────────────────────────────────────
 * Key                    Used by task(s)              Description
 * ─────────────────────  ──────────────────────────── ─────────────────────
 * scripture_memory       scripture_memory             Open papyrus scroll with text lines
 * john_3_16              john_3_16                    Cross with glowing heart
 * psalm_23               psalm_23                     Shepherd's crook with a woolly sheep at base
 * romans_8_28            romans_8_28                  Nautical anchor with rope loop
 * philippians_4_13       philippians_4_13             Raised fist — symbol of strength
 * isaiah_40_31           isaiah_40_31                 Eagle with spread wings soaring
 * hebrews_11_1           hebrews_11_1                 Eight-pointed star of faith
 *
 * ten_commandments       ten_commandments             Twin stone tablets with engraved lines
 * fruits_of_spirit       fruits_of_spirit             Grape cluster with leaf and curling vine
 * rebuilding_wall        rebuilding_wall              Brick-wall section with trowel
 * jesus_miracles         jesus_miracles               Cross with eight radiating light rays
 * prophets_quiz          prophets_quiz                Burning scroll tied with ribbon
 * parables_quiz          parables_quiz                Bound wheat sheaf / harvest bundle
 * acts_quiz              acts_quiz                    Sailboat on waves — Acts missionary journeys
 * noahs_animals          noahs_animals                Noah's ark boat with animal pairs
 *
 * david_and_goliath      david_and_goliath            Sling with stone mid-spin
 * pauls_belongings       pauls_belongings             Rolled scroll and travel satchel
 * lamp_on_lampstand      lamp_on_lampstand            Greek oil lamp on column stand with flame
 * protect_the_sheep      protect_the_sheep            Fluffy sheep with shepherd crook
 * feeding_five_thousand  feeding_five_thousand        Wicker basket with bread and fish
 * manna_wilderness       manna_wilderness             Decorated clay storage jar
 * walls_of_jericho       walls_of_jericho             Crumbling crenellated wall
 * ark_of_covenant        ark_of_covenant              Ornate chest with carrying poles and wings
 * gideons_torch          gideons_torch                Torch inside a clay jar (half-broken)
 * fiery_furnace          fiery_furnace                Domed furnace with three figures in flames
 * solomons_temple        solomons_temple              Temple columned facade with pediment
 * water_from_rock        water_from_rock              Jagged rock with water gushing from crack
 * the_lost_sheep         the_lost_sheep               Figure carrying sheep across shoulders
 * jonah_storm            jonah_storm                  Whale breaching with spout and storm waves
 * walking_on_water       walking_on_water             Figure striding upright on wave crests
 * pillar_of_fire         pillar_of_fire               Tall column of fire with glowing base
 * jordan_river           jordan_river                 Two parted walls of water with dry path
 * nehemiah_wall          nehemiah_wall                Partial wall being built with trowel
 * building_the_altar     building_the_altar           Stacked stone altar with fire on top
 * bucket                 jonah_storm (via TASK_SPRITE) Wooden water bucket with handle — bail task
 *
 * still_waters           still_waters                 Calm oval lake with concentric ripples
 * be_still               be_still                     Two open upturned palms — peace
 * wait_on_the_lord       wait_on_the_lord             Eagle silhouette gliding on thermals
 *
 * body_of_christ         body_of_christ               Three joined stick figures
 * shout_of_victory       shout_of_victory             Curved ram's horn shofar
 * loaves_and_fish        loaves_and_fish              Basket with loaves and fish
 * circle_of_prayer       circle_of_prayer             Ring of eight hands in prayer
 *
 * _fallback              (any unknown key)            Bold question mark placeholder
 * ──────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, G, Line, Ellipse } from 'react-native-svg';

const FIRE = '#FFA63D';
const BG   = '#0B0C10';
const OUT  = '#E0E0E0'; // outline / light stroke

const SPRITES = {
  // ── SCRIPTURE ──────────────────────────────────────────────────────────

  // Open papyrus scroll with rolled ends and three text lines // AI-generated
  scripture_memory: (c) => (
    <G>
      <Rect  x="5"  y="9"  width="22" height="14" rx="1" fill={c} opacity="0.15" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="5"  cy="16" rx="3.5" ry="7"  fill={c} />
      <Ellipse cx="27" cy="16" rx="3.5" ry="7"  fill={c} />
      <Line x1="9"  y1="13" x2="23" y2="13" stroke={OUT} strokeWidth="1.5" opacity="0.7" />
      <Line x1="9"  y1="16" x2="23" y2="16" stroke={OUT} strokeWidth="1.5" opacity="0.7" />
      <Line x1="9"  y1="19" x2="20" y2="19" stroke={OUT} strokeWidth="1.5" opacity="0.5" />
      <Line x1="3"  y1="11" x2="3"  y2="21" stroke={BG} strokeWidth="1" />
      <Line x1="29" y1="11" x2="29" y2="21" stroke={BG} strokeWidth="1" />
    </G>
  ),

  // Cross with a warm glowing heart at the intersection // AI-generated
  john_3_16: (c) => (
    <G>
      <Rect x="14" y="3"  width="4" height="26" rx="2" fill={c} />
      <Rect x="6"  y="10" width="20" height="4"  rx="2" fill={c} />
      <Path
        d="M16 14 C14 11 10 11 10 14 C10 17 16 21 16 21 C16 21 22 17 22 14 C22 11 18 11 16 14Z"
        fill={FIRE}
      />
    </G>
  ),

  // Shepherd's crook with a cloud-shaped sheep resting at the base // AI-generated
  psalm_23: (c) => (
    <G>
      <Path
        d="M20 28 L20 10 Q20 4 15 4 Q10 4 10 9 Q10 13 14 13"
        stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round"
      />
      <Ellipse cx="10" cy="23" rx="5.5" ry="4"   fill={c} />
      <Circle  cx="10" cy="19" r="3"              fill={c} />
      <Line x1="7"  y1="27" x2="7"  y2="31" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="13" y1="27" x2="13" y2="31" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </G>
  ),

  // Classic nautical anchor with a rope threaded through the ring // AI-generated
  romans_8_28: (c) => (
    <G>
      <Circle  cx="16" cy="6"  r="3"    stroke={c} strokeWidth="2" fill="none" />
      <Line    x1="16" y1="9"  x2="16" y2="27" stroke={c} strokeWidth="2.5" />
      <Line    x1="8"  y1="17" x2="24" y2="17" stroke={c} strokeWidth="2" />
      <Path    d="M8 27 Q8 23 16 23 Q24 23 24 27" stroke={c} strokeWidth="2" fill="none" />
      <Circle  cx="8"  cy="27" r="2"    fill={c} />
      <Circle  cx="24" cy="27" r="2"    fill={c} />
      <Path    d="M16 3 Q21 1 23 4 Q22 6 19 6" stroke={c} strokeWidth="1.5" fill="none" />
    </G>
  ),

  // Raised clenched fist — "I can do all things through him who strengthens me" // AI-generated
  philippians_4_13: (c) => (
    <G>
      <Path
        d="M12 28 Q10 22 11 16 Q12 12 14 10 Q16 8 17 6 Q18 4 20 5 Q21 7 19 9
           Q22 8 23 10 Q22 12 20 12 Q22 11 23 13 Q22 15 20 14
           Q21 14 21 16 Q20 18 18 17 Q18 20 17 22 Q16 25 16 28Z"
        fill={c}
      />
      <Line x1="12" y1="28" x2="16" y2="28" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  // Eagle with powerful spread wings and sun-ray accents above // AI-generated
  isaiah_40_31: (c) => (
    <G>
      <Path d="M16 17 Q8 12 2 7 Q5 14 9 18Z"    fill={c} />
      <Path d="M16 17 Q24 12 30 7 Q27 14 23 18Z" fill={c} />
      <Ellipse cx="16" cy="19" rx="3.5" ry="5.5" fill={c} />
      <Circle  cx="16" cy="13" r="3.5"            fill={c} />
      <Polygon points="16,15 13,17 19,17"          fill={BG} />
      <Line x1="16" y1="3"  x2="16" y2="6"  stroke={FIRE} strokeWidth="2"   opacity="0.8" />
      <Line x1="9"  y1="5"  x2="11" y2="7"  stroke={FIRE} strokeWidth="1.5" opacity="0.6" />
      <Line x1="23" y1="5"  x2="21" y2="7"  stroke={FIRE} strokeWidth="1.5" opacity="0.6" />
    </G>
  ),

  // Eight-pointed radiant star with a glowing core — faith / assurance // AI-generated
  hebrews_11_1: (c) => (
    <G>
      <Polygon
        points="16,2 18,12 28,10 20,16 28,22 18,20 16,30 14,20 4,22 12,16 4,10 14,12"
        fill={c}
      />
      <Circle cx="16" cy="16" r="4" fill={BG} />
      <Circle cx="16" cy="16" r="2" fill={FIRE} />
    </G>
  ),

  // ── TRIVIA ─────────────────────────────────────────────────────────────

  // Twin rounded-top stone tablets with engraved law lines // AI-generated
  ten_commandments: (c) => (
    <G>
      <Path d="M3 28 L3 11 Q3 6 8 6 Q13 6 13 11 L13 28Z"   fill={c} />
      <Path d="M19 28 L19 11 Q19 6 24 6 Q29 6 29 11 L29 28Z" fill={c} />
      <Line x1="5.5"  y1="14" x2="10.5" y2="14" stroke={BG} strokeWidth="1.5" />
      <Line x1="5.5"  y1="17" x2="10.5" y2="17" stroke={BG} strokeWidth="1.5" />
      <Line x1="5.5"  y1="20" x2="10.5" y2="20" stroke={BG} strokeWidth="1.5" />
      <Line x1="5.5"  y1="23" x2="10.5" y2="23" stroke={BG} strokeWidth="1.5" />
      <Line x1="21.5" y1="14" x2="26.5" y2="14" stroke={BG} strokeWidth="1.5" />
      <Line x1="21.5" y1="17" x2="26.5" y2="17" stroke={BG} strokeWidth="1.5" />
      <Line x1="21.5" y1="20" x2="26.5" y2="20" stroke={BG} strokeWidth="1.5" />
      <Line x1="21.5" y1="23" x2="26.5" y2="23" stroke={BG} strokeWidth="1.5" />
    </G>
  ),

  // Hanging grape cluster with curling vine tendril and leaf // AI-generated
  fruits_of_spirit: (c) => (
    <G>
      <Circle cx="13" cy="15" r="3.2" fill={c} />
      <Circle cx="19" cy="15" r="3.2" fill={c} />
      <Circle cx="10" cy="21" r="3.2" fill={c} />
      <Circle cx="16" cy="21" r="3.2" fill={c} />
      <Circle cx="22" cy="21" r="3.2" fill={c} />
      <Circle cx="13" cy="27" r="3.2" fill={c} />
      <Circle cx="19" cy="27" r="3.2" fill={c} />
      <Line x1="16" y1="11" x2="16" y2="5"    stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Path d="M16 7 Q22 2 26 6 Q22 10 16 7Z" fill={c} opacity="0.8" />
      <Path d="M16 8 Q13 5 11 7"               stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </G>
  ),

  // Partially-built brick wall with a trowel resting diagonally on top // AI-generated
  rebuilding_wall: (c) => (
    <G>
      <Rect x="3"  y="8"  width="8"  height="5" rx="1" fill={c} />
      <Rect x="13" y="8"  width="10" height="5" rx="1" fill={c} />
      <Rect x="25" y="8"  width="4"  height="5" rx="1" fill={c} />
      <Rect x="3"  y="15" width="12" height="5" rx="1" fill={c} />
      <Rect x="17" y="15" width="12" height="5" rx="1" fill={c} />
      <Rect x="3"  y="22" width="7"  height="5" rx="1" fill={c} />
      <Rect x="12" y="22" width="10" height="5" rx="1" fill={c} />
      <Rect x="24" y="22" width="5"  height="5" rx="1" fill={c} />
      <Path d="M22 6 L30 4 L31 6 L24 10Z"       fill={FIRE} />
      <Rect x="20" y="5.5" width="3" height="6" rx="1" fill={c} opacity="0.9" />
    </G>
  ),

  // Cross with eight radiating beams — miracles and divine light // AI-generated
  jesus_miracles: (c) => (
    <G>
      <Rect x="14" y="4"  width="4" height="24" rx="1.5" fill={c} />
      <Rect x="6"  y="11" width="20" height="4" rx="1.5" fill={c} />
      <Line x1="16" y1="2"  x2="16" y2="5"  stroke={FIRE} strokeWidth="1.5" opacity="0.7" />
      <Line x1="16" y1="29" x2="16" y2="27" stroke={FIRE} strokeWidth="1.5" opacity="0.7" />
      <Line x1="4"  y1="13" x2="6"  y2="13" stroke={FIRE} strokeWidth="1.5" opacity="0.7" />
      <Line x1="28" y1="13" x2="26" y2="13" stroke={FIRE} strokeWidth="1.5" opacity="0.7" />
      <Line x1="6"  y1="5"  x2="8"  y2="7"  stroke={FIRE} strokeWidth="1.5" opacity="0.5" />
      <Line x1="26" y1="5"  x2="24" y2="7"  stroke={FIRE} strokeWidth="1.5" opacity="0.5" />
      <Line x1="6"  y1="27" x2="8"  y2="25" stroke={FIRE} strokeWidth="1.5" opacity="0.5" />
      <Line x1="26" y1="27" x2="24" y2="25" stroke={FIRE} strokeWidth="1.5" opacity="0.5" />
    </G>
  ),

  // Rolled papyrus scroll on fire — the burning words of the prophets // AI-generated
  prophets_quiz: (c) => (
    <G>
      <Path d="M9 26 Q8 20 9 14 L23 14 Q24 20 23 26Z" fill={c} opacity="0.85" />
      <Ellipse cx="16" cy="14" rx="7" ry="2.5" fill={c} />
      <Ellipse cx="16" cy="26" rx="7" ry="2.5" fill={c} />
      <Line x1="11" y1="18" x2="21" y2="18" stroke={BG} strokeWidth="1.2" />
      <Line x1="11" y1="21" x2="21" y2="21" stroke={BG} strokeWidth="1.2" />
      <Path d="M16 14 C14 10 13 7 15 4 C15 7 17 7 16 4 C17 7 19 10 18 14Z" fill={FIRE} />
      <Path d="M16 13 C15 10 15 8 16 6.5 C17 8 17 10 16 13Z" fill={OUT} opacity="0.6" />
    </G>
  ),

  // Bound wheat sheaf with golden tips — harvest and parables // AI-generated
  parables_quiz: (c) => (
    <G>
      <Path d="M16 28 L9  6 Q10 5 12 6 L16 22Z"  fill={c} opacity="0.9" />
      <Path d="M16 28 L23 6 Q22 5 20 6 L16 22Z"  fill={c} opacity="0.9" />
      <Path d="M16 28 L16 6 Q16 5 16 5 L16 22Z"  fill={c} />
      <Path d="M10 5 Q10 3 12 3 Q14 3 13 5Z"      fill={FIRE} />
      <Path d="M16 5 Q16 3 18 3 Q20 3 19 5Z"      fill={FIRE} />
      <Path d="M22 5 Q22 3 24 3 Q26 3 25 5Z"      fill={FIRE} />
      <Rect x="13" y="20" width="6" height="3" rx="1.5" fill={FIRE} opacity="0.8" />
    </G>
  ),

  // Small sailboat on rolling waves — Acts missionary voyages // AI-generated
  acts_quiz: (c) => (
    <G>
      <Path d="M5 22 Q6 28 27 28 Q28 22Z" fill={c} opacity="0.85" />
      <Line x1="16" y1="22" x2="16" y2="5" stroke={c} strokeWidth="2" />
      <Path d="M16 7 L27 20 L16 20Z"      fill={c} opacity="0.9" />
      <Path d="M16 10 L7  20 L16 20Z"     fill={c} opacity="0.6" />
      <Path
        d="M3 25 Q8 23 13 25 Q18 27 23 25 Q27 23 30 25"
        stroke={OUT} strokeWidth="1.2" fill="none" opacity="0.5"
      />
    </G>
  ),

  // Noah's ark hull on waves with a small dove and olive-branch accent // AI-generated
  noahs_animals: (c) => (
    <G>
      <Path d="M4 22 Q4 18 6 17 L26 17 Q28 18 28 22Z" fill={c} />
      <Rect  x="8"  y="12" width="16" height="5" rx="1" fill={c} opacity="0.85" />
      <Rect  x="13" y="8"  width="6"  height="4" rx="1" fill={c} opacity="0.75" />
      <Circle cx="11" cy="15" r="1.5" fill={BG} />
      <Circle cx="21" cy="15" r="1.5" fill={BG} />
      <Path d="M2 24 Q8 20 16 24 Q24 28 30 24" stroke={c} strokeWidth="2" fill="none" opacity="0.7" />
      <Path d="M14 8 Q16 5 18 6" stroke={FIRE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="16" cy="5" rx="2" ry="1.5" fill={FIRE} opacity="0.8" />
    </G>
  ),

  // ── CHALLENGES ─────────────────────────────────────────────────────────

  // Sling with leather pouch and a spinning stone trajectory // AI-generated
  david_and_goliath: (c) => (
    <G>
      <Circle cx="16" cy="16" r="3" fill={c} />
      <Path d="M16 19 Q10 22 8 28" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M16 19 Q22 22 24 28" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Circle cx="8"  cy="29" r="2" fill={c} />
      <Circle cx="24" cy="29" r="2" fill={c} />
      <Path
        d="M16 13 Q22 8 26 4"
        stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeDasharray="2,2"
      />
      <Circle cx="27" cy="3" r="2.5" fill={FIRE} />
    </G>
  ),

  // Rolled papyrus scroll beside a buckled leather travel satchel // AI-generated
  pauls_belongings: (c) => (
    <G>
      <Rect  x="4"  y="13" width="12" height="14" rx="2" fill={c} />
      <Rect  x="3"  y="11" width="14" height="4"  rx="1" fill={c} opacity="0.9" />
      <Line x1="6"  y1="18" x2="14" y2="18" stroke={BG} strokeWidth="1.2" />
      <Line x1="6"  y1="21" x2="14" y2="21" stroke={BG} strokeWidth="1.2" />
      <Line x1="6"  y1="24" x2="14" y2="24" stroke={BG} strokeWidth="1.2" />
      <Ellipse cx="20" cy="16" rx="4.5" ry="6.5" fill={c} opacity="0.85" />
      <Line x1="20" y1="9.5" x2="20" y2="22.5" stroke={BG} strokeWidth="1.2" />
      <Line x1="15.5" y1="15" x2="24.5" y2="15" stroke={BG} strokeWidth="1.2" />
      <Line x1="15.5" y1="18" x2="24.5" y2="18" stroke={BG} strokeWidth="1.2" />
      <Ellipse cx="20" cy="9.5"  rx="4.5" ry="1.5" fill={c} />
      <Ellipse cx="20" cy="22.5" rx="4.5" ry="1.5" fill={c} />
    </G>
  ),

  // Greek terracotta oil lamp on a tall pedestal with a live flame // AI-generated
  lamp_on_lampstand: (c) => (
    <G>
      <Rect x="12" y="27" width="8" height="2.5" rx="1" fill={c} />
      <Rect x="14" y="21" width="4" height="6.5"  rx="0.5" fill={c} opacity="0.8" />
      <Ellipse cx="16" cy="21" rx="7" ry="2.5" fill={c} />
      <Path d="M9 21 Q9 17 16 17 Q23 17 23 21" fill={c} />
      <Path d="M23 19 Q27 17 28 15" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M28 15 C27 12 27 9 29 7 C31 9 31 12 29 15Z" fill={FIRE} />
      <Path d="M28.5 14 C28 12 28.5 10 29 9 C29.5 10 30 12 29.5 14Z" fill={OUT} opacity="0.6" />
    </G>
  ),

  // Cloud-shaped fluffy sheep with a shepherd's crook beside it // AI-generated
  protect_the_sheep: (c) => (
    <G>
      <Circle cx="12" cy="18" r="4.5" fill={c} />
      <Circle cx="18" cy="18" r="4.5" fill={c} />
      <Circle cx="15" cy="15" r="3.5" fill={c} />
      <Circle cx="15" cy="21" r="4.5" fill={c} />
      <Circle cx="14" cy="13" r="2"   fill={c} />
      <Circle cx="17" cy="12.5" r="1.5" fill={BG} opacity="0.5" />
      <Line x1="11" y1="26" x2="11" y2="30" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="15" y1="26" x2="15" y2="30" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M25 4 Q27 4 27 6 Q27 9 25 9 L25 15" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
    </G>
  ),

  // Wicker basket with two fish silhouettes draped over the rim // AI-generated
  feeding_five_thousand: (c) => (
    <G>
      <Path d="M7 16 Q6 24 7 28 L25 28 Q26 24 25 16Z" fill={c} opacity="0.85" />
      <Ellipse cx="16" cy="16" rx="9" ry="3" fill={c} />
      <Line x1="7"  y1="20" x2="25" y2="20" stroke={BG} strokeWidth="0.8" />
      <Line x1="7"  y1="24" x2="25" y2="24" stroke={BG} strokeWidth="0.8" />
      <Line x1="11" y1="16" x2="10" y2="28" stroke={BG} strokeWidth="0.8" />
      <Line x1="16" y1="16" x2="16" y2="28" stroke={BG} strokeWidth="0.8" />
      <Line x1="21" y1="16" x2="22" y2="28" stroke={BG} strokeWidth="0.8" />
      <Path d="M8  14 Q11 11 14 14 Q11 17 8  14Z" fill={FIRE} />
      <Path d="M6  14 L8 12 L8 16Z"                fill={FIRE} />
      <Path d="M20 14 Q23 11 26 14 Q23 17 20 14Z" fill={FIRE} />
      <Path d="M18 14 L20 12 L20 16Z"              fill={FIRE} />
    </G>
  ),

  // Decorated earthen clay storage jar — manna in the wilderness // AI-generated
  manna_wilderness: (c) => (
    <G>
      <Path d="M11 8 Q9 12 9 18 Q9 26 16 27 Q23 26 23 18 Q23 12 21 8Z" fill={c} opacity="0.85" />
      <Ellipse cx="16" cy="8"  rx="5"   ry="2.5" fill={c} />
      <Ellipse cx="16" cy="27" rx="7"   ry="2"   fill={c} opacity="0.7" />
      <Rect    x="11" y="5"   width="10" height="3" rx="1.5" fill={c} />
      <Line x1="9"  y1="15" x2="23" y2="15" stroke={BG} strokeWidth="1.5" />
      <Path d="M11 18 Q13 16 16 18 Q19 20 21 18" stroke={BG} strokeWidth="1" fill="none" />
      <Ellipse cx="16" cy="5" rx="3.5" ry="2" fill={c} opacity="0.9" />
    </G>
  ),

  // Castle battlements with heavy cracks and a crumbling section // AI-generated
  walls_of_jericho: (c) => (
    <G>
      <Rect x="4"  y="10" width="24" height="18" rx="1" fill={c} />
      <Rect x="4"  y="6"  width="4"  height="5"  rx="1" fill={c} />
      <Rect x="11" y="6"  width="4"  height="5"  rx="1" fill={c} />
      <Rect x="18" y="6"  width="4"  height="5"  rx="1" fill={c} />
      <Rect x="25" y="6"  width="3"  height="5"  rx="1" fill={c} />
      <Line x1="4"  y1="16" x2="28" y2="16" stroke={BG} strokeWidth="0.8" />
      <Line x1="4"  y1="22" x2="28" y2="22" stroke={BG} strokeWidth="0.8" />
      <Path d="M18 10 L22 28" stroke={BG} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M22 12 L26 28" stroke={BG} strokeWidth="1.5" fill="none" opacity="0.6" />
      <Polygon points="26,14 30,18 28,28 24,23" fill={FIRE} opacity="0.4" />
    </G>
  ),

  // Ornate acacia-wood chest with cherubim wing tips and carrying poles // AI-generated
  ark_of_covenant: (c) => (
    <G>
      <Rect  x="5"  y="13" width="22" height="14" rx="2" fill={c} />
      <Rect  x="4"  y="11" width="24" height="4"  rx="1.5" fill={c} opacity="0.9" />
      <Line  x1="5"  y1="20" x2="27" y2="20" stroke={BG} strokeWidth="1.2" />
      <Circle cx="9"  cy="20" r="2" fill={c} stroke={BG} strokeWidth="1" />
      <Circle cx="23" cy="20" r="2" fill={c} stroke={BG} strokeWidth="1" />
      <Line  x1="1"  y1="20" x2="9"  y2="20" stroke={FIRE} strokeWidth="2" />
      <Line  x1="23" y1="20" x2="31" y2="20" stroke={FIRE} strokeWidth="2" />
      <Path  d="M16 11 Q10 7 8 9"              stroke={c} strokeWidth="1.5" fill="none" />
      <Path  d="M16 11 Q22 7 24 9"             stroke={c} strokeWidth="1.5" fill="none" />
      <Ellipse cx="16" cy="11" rx="2" ry="1" fill={FIRE} />
    </G>
  ),

  // Burning torch held inside a clay jar, jar visibly cracked // AI-generated
  gideons_torch: (c) => (
    <G>
      <Path d="M10 28 Q9 22 10 17 L22 17 Q23 22 22 28Z" fill={c} opacity="0.85" />
      <Ellipse cx="16" cy="17" rx="6" ry="2.5" fill={c} />
      <Ellipse cx="16" cy="28" rx="6" ry="2.5" fill={c} opacity="0.8" />
      <Line x1="10" y1="21" x2="22" y2="21" stroke={BG} strokeWidth="0.8" />
      <Path d="M18 17 L21 10 L24 28" stroke={BG} strokeWidth="1.5" fill="none" />
      <Line x1="16" y1="17" x2="16" y2="5"  stroke={c} strokeWidth="2" />
      <Path d="M16 5 C13 2 12 0 15 0 C15 3 17 3 16 0 C18 3 20 2 17 5Z" fill={FIRE} />
    </G>
  ),

  // Domed kiln furnace with three standing figures silhouetted in flame // AI-generated
  fiery_furnace: (c) => (
    <G>
      <Path d="M4 28 L4 16 Q4 7 16 7 Q28 7 28 16 L28 28Z" fill={c} />
      <Path d="M10 28 L10 18 Q10 13 16 13 Q22 13 22 18 L22 28Z" fill={BG} />
      <Path d="M16 28 C13 23 12 19 14 16 C14 19 16 19 15 16 C16 18 18 18 17 16 C19 19 20 23 16 28Z" fill={FIRE} />
      <Path d="M16 26 C15 23 15 20 16 18 C17 20 17 23 16 26Z" fill={OUT} opacity="0.5" />
      <Line x1="11" y1="7" x2="9"  y2="3" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="7" x2="16" y2="3" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="21" y1="7" x2="23" y2="3" stroke={c} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  // Temple columned facade with triangular pediment and broad steps // AI-generated
  solomons_temple: (c) => (
    <G>
      <Polygon points="3,13 16,3 29,13" fill={c} />
      <Rect x="2"  y="13" width="28" height="3" rx="0.5" fill={c} opacity="0.9" />
      <Rect x="5"  y="16" width="3"  height="12" rx="1" fill={c} />
      <Rect x="11" y="16" width="3"  height="12" rx="1" fill={c} />
      <Rect x="17" y="16" width="3"  height="12" rx="1" fill={c} />
      <Rect x="23" y="16" width="3"  height="12" rx="1" fill={c} />
      <Rect x="1"  y="28" width="30" height="2"  rx="0" fill={c} opacity="0.9" />
      <Rect x="3"  y="26" width="26" height="2"  rx="0" fill={c} opacity="0.75" />
    </G>
  ),

  // Jagged rock split in two with water streams gushing from the crack // AI-generated
  water_from_rock: (c) => (
    <G>
      <Path d="M7 28 Q5 22 7 16 Q9 10 16 9 Q23 8 25 14 Q27 20 27 28Z" fill={c} opacity="0.85" />
      <Path d="M16 9 L14 15 L17 18 L15 22" stroke={BG} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M13 20 Q9 22 7 28"   stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9" />
      <Path d="M16 22 Q15 25 14 29" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9" />
      <Path d="M19 20 Q23 22 25 28" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.9" />
      <Circle cx="7.5"  cy="29" r="1.5" fill={c} />
      <Circle cx="14.5" cy="30" r="1.5" fill={c} />
      <Circle cx="25.5" cy="29" r="1.5" fill={c} />
    </G>
  ),

  // Shepherd figure silhouette carrying a woolly sheep draped across shoulders // AI-generated
  the_lost_sheep: (c) => (
    <G>
      <Circle cx="21" cy="5"  r="3"    fill={c} />
      <Line   x1="21" y1="8"  x2="21" y2="17" stroke={c} strokeWidth="2.5" />
      <Line   x1="21" y1="12" x2="16" y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="21" y1="17" x2="17" y2="23" stroke={c} strokeWidth="2" />
      <Line   x1="21" y1="17" x2="25" y2="23" stroke={c} strokeWidth="2" />
      <Circle cx="9"  cy="17" r="4.5" fill={c} opacity="0.9" />
      <Circle cx="9"  cy="13" r="3"   fill={c} opacity="0.9" />
      <Circle cx="13" cy="15" r="3.5" fill={c} opacity="0.8" />
      <Circle cx="7"  cy="21" r="3"   fill={c} opacity="0.8" />
      <Line   x1="7"  y1="24" x2="7"  y2="29" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <Line   x1="11" y1="24" x2="11" y2="29" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </G>
  ),

  // Humpback whale breaching the surface with a water spout above // AI-generated
  jonah_storm: (c) => (
    <G>
      <Path
        d="M4 20 Q10 14 18 16 Q24 17 26 13 Q28 9 24 8
           Q20 7 18 11 Q14 15 8 14 Q4 14 2 17Z"
        fill={c}
      />
      <Path d="M24 8 L28 3 Q29 2 28 4 L27 8Z" fill={c} opacity="0.8" />
      <Path d="M26 13 Q27 10 28 7"             stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M28 7 Q30 4 29 2 Q31 4 32 2 Q32 6 30 8Z" fill={c} opacity="0.6" />
      <Path d="M2  24 Q8 20 14 24 Q20 28 26 24 Q28 22 30 24" stroke={c} strokeWidth="2.5" fill="none" />
      <Path d="M2  27 Q8 23 14 27 Q20 31 26 27" stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
      <Circle cx="21" cy="10" r="1" fill={BG} />
    </G>
  ),

  // Figure striding on waves toward a glowing cross in the distance // AI-generated
  walking_on_water: (c) => (
    <G>
      {/* Glowing cross in upper distance */}
      <Rect x="23" y="2" width="2" height="8" rx="1" fill={FIRE} />
      <Rect x="20" y="4" width="8" height="2" rx="1" fill={FIRE} />
      <Line x1="21" y1="3" x2="19" y2="1" stroke={FIRE} strokeWidth="1" opacity="0.6" />
      <Line x1="27" y1="3" x2="29" y2="1" stroke={FIRE} strokeWidth="1" opacity="0.6" />
      {/* Figure — head, robed body, outstretched arms */}
      <Circle cx="12" cy="6" r="3" fill={c} />
      <Path d="M8 9 Q8 18 12 20 Q16 18 16 9Z" fill={c} />
      <Line x1="8"  y1="11" x2="4"  y2="8"  stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="11" x2="20" y2="8"  stroke={c} strokeWidth="2" strokeLinecap="round" />
      {/* Legs in stride */}
      <Line x1="10" y1="20" x2="8"  y2="25" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <Line x1="14" y1="20" x2="16" y2="25" stroke={c} strokeWidth="2" strokeLinecap="round" />
      {/* Waves */}
      <Path d="M1 26 Q6 22 12 26 Q18 30 24 26 Q27 24 31 26" stroke={c} strokeWidth="2.5" fill="none" />
      <Path d="M1 29 Q7 25 13 29 Q19 33 25 29" stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
    </G>
  ),

  // Towering column of fire with a radiant oval base glow // AI-generated
  pillar_of_fire: (c) => (
    <G>
      <Path
        d="M10 30 Q7 22 10 15 Q8 18 9 11 Q11 5 16 1
           Q21 5 23 11 Q24 18 22 15 Q25 22 22 30Z"
        fill={FIRE}
      />
      <Path
        d="M13 29 Q11 22 13 17 Q12 20 13 15 Q14 9 16 6
           Q18 9 19 15 Q20 20 19 17 Q21 22 19 29Z"
        fill={c} opacity="0.8"
      />
      <Path d="M15 28 Q14 23 15 19 C15.5 22 16.5 22 16 19 Q17 23 17 28Z" fill={OUT} opacity="0.4" />
      <Ellipse cx="16" cy="30" rx="9" ry="2"   fill={FIRE} opacity="0.35" />
      <Ellipse cx="16" cy="30" rx="5" ry="1.2" fill={FIRE} opacity="0.5" />
    </G>
  ),

  // Two towering walls of parted water with stones on the dry riverbed // AI-generated
  jordan_river: (c) => (
    <G>
      <Path d="M1 6 Q4 10 4 16 Q4 22 1 26 L1 6Z"   fill={c} opacity="0.9" />
      <Path d="M31 6 Q28 10 28 16 Q28 22 31 26 L31 6Z" fill={c} opacity="0.9" />
      <Path d="M4 8 Q8 12 8 16 Q8 20 4 24"      stroke={c} strokeWidth="1.5" fill="none" opacity="0.6" />
      <Path d="M28 8 Q24 12 24 16 Q24 20 28 24"  stroke={c} strokeWidth="1.5" fill="none" opacity="0.6" />
      <Rect x="8" y="12" width="16" height="8" rx="1" fill={c} opacity="0.15" />
      <Ellipse cx="11" cy="23" rx="2.5" ry="2" fill={c} opacity="0.7" />
      <Ellipse cx="16" cy="24" rx="2.5" ry="2" fill={c} opacity="0.7" />
      <Ellipse cx="21" cy="23" rx="2.5" ry="2" fill={c} opacity="0.7" />
    </G>
  ),

  // Partially-built stone wall with mortar trowel resting against it // AI-generated
  nehemiah_wall: (c) => (
    <G>
      <Rect x="3"  y="19" width="8"  height="5" rx="1" fill={c} />
      <Rect x="13" y="19" width="10" height="5" rx="1" fill={c} />
      <Rect x="25" y="19" width="4"  height="5" rx="1" fill={c} />
      <Rect x="3"  y="26" width="12" height="5" rx="1" fill={c} />
      <Rect x="17" y="26" width="12" height="5" rx="1" fill={c} opacity="0.6" />
      <Rect x="3"  y="12" width="7"  height="5" rx="1" fill={c} />
      <Rect x="12" y="12" width="10" height="5" rx="1" fill={c} />
      <Path d="M25 18 L28 10 L30 11 L28 19Z"  fill={FIRE} />
      <Rect x="23" y="11" width="3" height="8" rx="1" fill={c} opacity="0.9" />
      <Rect x="19" y="7"  width="6" height="4" rx="1" fill={c} opacity="0.7" />
    </G>
  ),

  // Twelve neatly stacked stone courses forming an altar with fire on top // AI-generated
  building_the_altar: (c) => (
    <G>
      <Rect x="5"  y="22" width="22" height="4" rx="1" fill={c} />
      <Rect x="7"  y="17" width="18" height="4" rx="1" fill={c} opacity="0.9" />
      <Rect x="9"  y="12" width="14" height="4" rx="1" fill={c} opacity="0.85" />
      <Rect x="11" y="7"  width="10" height="4" rx="1" fill={c} opacity="0.8" />
      <Line x1="5" y1="22" x2="27" y2="22" stroke={BG} strokeWidth="0.6" />
      <Line x1="7" y1="17" x2="25" y2="17" stroke={BG} strokeWidth="0.6" />
      <Line x1="9" y1="12" x2="23" y2="12" stroke={BG} strokeWidth="0.6" />
      <Path d="M16 7 C14 4 13 2 15 0 C15 3 17 3 16 0 C17 3 19 4 18 7Z" fill={FIRE} />
      <Path d="M16 6.5 C15.5 4 15.5 2.5 16 1.5 C16.5 2.5 16.5 4 16 6.5Z" fill={OUT} opacity="0.5" />
    </G>
  ),

  // Wooden water bucket with handle — used by jonah_storm (BAIL_WATER mechanic) // AI-generated
  bucket: (c) => (
    <G>
      {/* Bucket body (trapezoid: wider at top) */}
      <Path d="M8 10 L7 26 L25 26 L24 10 Z" fill={c} />
      {/* Rim at top */}
      <Ellipse cx="16" cy="10" rx="8" ry="2.5" fill={c} />
      {/* Bottom */}
      <Ellipse cx="16" cy="26" rx="9" ry="2.5" fill={c} opacity="0.8" />
      {/* Handle arc */}
      <Path d="M8 10 Q16 3 24 10" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Metal band (accent stripe) */}
      <Path d="M7.5 18 L24.5 18" stroke={BG} strokeWidth="1.5" opacity="0.5" />
      {/* Water inside (shown as a highlight) */}
      <Ellipse cx="16" cy="14" rx="5.5" ry="2" fill="#00D4FF" opacity="0.45" />
    </G>
  ),

  // ── PATIENCE (don't tap) ─────────────────────────────────────────────
  // Peaceful oval water surface with concentric ripple rings // AI-generated
  still_waters: (c) => (
    <G>
      <Ellipse cx="16" cy="18" rx="13" ry="8" fill={c} opacity="0.25" stroke={c} strokeWidth="1.5" />
      <Ellipse cx="16" cy="18" rx="8"  ry="4.5" fill={c} opacity="0.2" stroke={c} strokeWidth="1" />
      <Ellipse cx="16" cy="18" rx="3"  ry="1.5" fill={c} opacity="0.5" />
      <Path d="M4  10 Q8  7 12 10" stroke={c} strokeWidth="1.5" fill="none" opacity="0.4" />
      <Path d="M20 10 Q24 7 28 10" stroke={c} strokeWidth="1.5" fill="none" opacity="0.4" />
      <Line x1="13" y1="5"  x2="13" y2="8"  stroke={c} strokeWidth="1.5" opacity="0.3" />
      <Line x1="16" y1="3"  x2="16" y2="7"  stroke={c} strokeWidth="1.5" opacity="0.4" />
      <Line x1="19" y1="5"  x2="19" y2="8"  stroke={c} strokeWidth="1.5" opacity="0.3" />
    </G>
  ),

  // Two upturned open palms — a gesture of peaceful surrender // AI-generated
  be_still: (c) => (
    <G>
      <Path
        d="M5 20 Q4 16 5 13 Q6 11 8 11 L9 18
           Q11 15 11 11 Q12 9 14 10 L14 18
           Q15 14 15 10 Q16 8 18 9 L18 17
           Q19 13 20 10 Q21 9 23 10 L22 18
           Q24 14 25 12 Q26 11 27 12 Q28 14 27 18
           Q26 22 22 24 L10 24 Q6 23 5 20Z"
        fill={c}
      />
      <Path d="M10 24 Q8 27 9 30 L23 30 Q24 27 22 24Z" fill={c} opacity="0.7" />
      <Line x1="10" y1="24" x2="22" y2="24" stroke={BG} strokeWidth="1" />
    </G>
  ),

  // Eagle silhouette riding a thermal updraft with faint wind lines // AI-generated
  wait_on_the_lord: (c) => (
    <G>
      <Path d="M16 17 Q7 11 1 6 Q4 12 8 16Z"   fill={c} />
      <Path d="M16 17 Q25 11 31 6 Q28 12 24 16Z" fill={c} />
      <Ellipse cx="16" cy="19" rx="3.5" ry="5.5" fill={c} />
      <Circle  cx="16" cy="13" r="3.5"            fill={c} />
      <Polygon points="16,15 13.5,17.5 18.5,17.5" fill={BG} />
      <Path d="M2  16 Q8  18 10 20"  stroke={c}    strokeWidth="1"   fill="none" opacity="0.4" />
      <Path d="M30 16 Q24 18 22 20"  stroke={c}    strokeWidth="1"   fill="none" opacity="0.4" />
      <Path d="M0  20 Q6  23 9  26"  stroke={FIRE} strokeWidth="1"   fill="none" opacity="0.35" />
      <Path d="M32 20 Q26 23 23 26"  stroke={FIRE} strokeWidth="1"   fill="none" opacity="0.35" />
    </G>
  ),

  // ── COOPERATIVE ────────────────────────────────────────────────────────

  // Three stick figures standing side by side with linked hands // AI-generated
  body_of_christ: (c) => (
    <G>
      <Circle cx="7"  cy="6"  r="3" fill={c} />
      <Line   x1="7"  y1="9"  x2="7"  y2="18" stroke={c} strokeWidth="2.5" />
      <Line   x1="7"  y1="13" x2="2"  y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="7"  y1="13" x2="12" y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="7"  y1="18" x2="5"  y2="24" stroke={c} strokeWidth="2" />
      <Line   x1="7"  y1="18" x2="9"  y2="24" stroke={c} strokeWidth="2" />
      <Circle cx="16" cy="6"  r="3" fill={c} />
      <Line   x1="16" y1="9"  x2="16" y2="18" stroke={c} strokeWidth="2.5" />
      <Line   x1="16" y1="13" x2="12" y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="16" y1="13" x2="20" y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="16" y1="18" x2="14" y2="24" stroke={c} strokeWidth="2" />
      <Line   x1="16" y1="18" x2="18" y2="24" stroke={c} strokeWidth="2" />
      <Circle cx="25" cy="6"  r="3" fill={c} />
      <Line   x1="25" y1="9"  x2="25" y2="18" stroke={c} strokeWidth="2.5" />
      <Line   x1="25" y1="13" x2="20" y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="25" y1="13" x2="30" y2="16" stroke={c} strokeWidth="2" />
      <Line   x1="25" y1="18" x2="23" y2="24" stroke={c} strokeWidth="2" />
      <Line   x1="25" y1="18" x2="27" y2="24" stroke={c} strokeWidth="2" />
      <Circle cx="12" cy="16" r="1.5" fill={FIRE} />
      <Circle cx="20" cy="16" r="1.5" fill={FIRE} />
    </G>
  ),

  // Curved ram's horn shofar — the victorious battle cry // AI-generated
  shout_of_victory: (c) => (
    <G>
      <Path
        d="M4 26 Q5 22 8 19 Q11 16 15 14 Q19 12 23 9
           Q27 6 28 3 Q30 5 29 9 Q28 13 24 15 Q20 17 17 19
           Q13 21 11 24 Q9 27 8 30 Z"
        fill={c}
      />
      <Ellipse cx="6"  cy="28" rx="4" ry="3.5" fill={c} opacity="0.8" />
      <Path d="M7 26 Q5 24 7 24 Q8 24 8 26"  fill={BG} />
      <Path d="M28 3 Q31 2 32 4 Q31 6 29 5"  fill={FIRE} />
      <Path d="M2 21 Q0 23 2 25"             stroke={c} strokeWidth="1.5" fill="none" opacity="0.6" />
      <Path d="M0 17 Q-1 20 1 23"            stroke={c} strokeWidth="1"   fill="none" opacity="0.4" />
    </G>
  ),

  // Wicker basket with stacked loaves and two fish draped over the rim // AI-generated
  loaves_and_fish: (c) => (
    <G>
      <Path d="M6 16 Q5 24 6 28 L26 28 Q27 24 26 16Z" fill={c} opacity="0.8" />
      <Ellipse cx="16" cy="16" rx="10" ry="3" fill={c} />
      <Line x1="6"  y1="20" x2="26" y2="20" stroke={BG} strokeWidth="0.8" />
      <Line x1="6"  y1="24" x2="26" y2="24" stroke={BG} strokeWidth="0.8" />
      <Line x1="10" y1="16" x2="9"  y2="28" stroke={BG} strokeWidth="0.8" />
      <Line x1="16" y1="16" x2="16" y2="28" stroke={BG} strokeWidth="0.8" />
      <Line x1="22" y1="16" x2="23" y2="28" stroke={BG} strokeWidth="0.8" />
      <Path d="M8  12 Q12 9 16 12 Q12 15 8  12Z" fill={FIRE} />
      <Path d="M6  12 L8 10 L8 14Z"               fill={FIRE} />
      <Path d="M18 12 Q22 9 26 12 Q22 15 18 12Z" fill={FIRE} />
      <Path d="M16 12 L18 10 L18 14Z"              fill={FIRE} />
    </G>
  ),

  // Octagon ring of eight oval hands clasped inward with a glowing center // AI-generated
  circle_of_prayer: (c) => (
    <G>
      <Circle cx="16" cy="16" r="12" stroke={c} strokeWidth="2.5" fill="none" opacity="0.3" />
      <Circle cx="16" cy="16" r="7"  stroke={c} strokeWidth="1.5" fill="none" opacity="0.2" />
      <Ellipse cx="16" cy="4"   rx="3"   ry="2.5" fill={c} />
      <Ellipse cx="16" cy="28"  rx="3"   ry="2.5" fill={c} />
      <Ellipse cx="28" cy="16"  rx="2.5" ry="3"   fill={c} />
      <Ellipse cx="4"  cy="16"  rx="2.5" ry="3"   fill={c} />
      <Ellipse cx="24" cy="8"   rx="2.5" ry="2"   fill={c} />
      <Ellipse cx="8"  cy="8"   rx="2.5" ry="2"   fill={c} />
      <Ellipse cx="24" cy="24"  rx="2.5" ry="2"   fill={c} />
      <Ellipse cx="8"  cy="24"  rx="2.5" ry="2"   fill={c} />
      <Circle  cx="16" cy="16"  r="3"              fill={FIRE} opacity="0.7" />
    </G>
  ),

  // ── FALLBACK ───────────────────────────────────────────────────────────

  // Bold question mark with dot — shown when sprite key is unknown // AI-generated
  _fallback: (c) => (
    <G>
      <Path
        d="M12 8 Q12 4 16 4 Q20 4 20 8 Q20 12 16 14 Q16 17 16 18"
        stroke={c} strokeWidth="3" fill="none" strokeLinecap="round"
      />
      <Circle cx="16" cy="22" r="2.5" fill={c} />
    </G>
  ),
};

export default function TaskSprite({ taskId, size = 28, color = '#00D4FF' }) {
  const renderer = SPRITES[taskId] || SPRITES['_fallback'];
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {renderer(color)}
    </Svg>
  );
}
