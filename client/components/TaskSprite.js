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
 * wolves_in_sheeps_clothing wolves_in_sheeps_clothing  Menacing wolf head peering through wool fleece
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
 * _fallback              (any unknown key)            Bold question mark placeholder
 * ──────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, G, Line, Ellipse } from 'react-native-svg';

const FIRE = '#FFA63D';
const BG   = '#0B0C10';
const OUT  = '#E0E0E0'; // outline / light stroke

const SPRITES = {
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

  // Fluffy sheep with shepherd's crook standing guard beside it // AI-generated
  protect_the_sheep: (c) => (
    <G>
      {/* Shepherd crook — curved hook + long staff */}
      <Path d="M25 4 Q27 4 27 6 Q27 9 25 9 L25 15" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Sheep shadow */}
      <Ellipse cx="14" cy="27" rx="9" ry="2" fill={c} opacity="0.15" />
      {/* Sheep wool body — layered puffs */}
      <Circle cx="10" cy="20" r="5.5" fill={OUT} opacity="0.88" />
      <Circle cx="16" cy="20" r="5.5" fill={OUT} opacity="0.88" />
      <Circle cx="13" cy="16" r="5"   fill={OUT} opacity="0.95" />
      <Circle cx="9"  cy="17" r="4"   fill={OUT} opacity="0.82" />
      <Circle cx="17" cy="17" r="4"   fill={OUT} opacity="0.82" />
      {/* Wool top highlight */}
      <Circle cx="13" cy="15" r="2.5" fill="#FFFFFF" opacity="0.30" />
      {/* Legs */}
      <Line x1="9"  y1="25" x2="8"  y2="30" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="12" y1="26" x2="12" y2="30" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="16" y1="26" x2="16" y2="30" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="19" y1="25" x2="20" y2="30" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      {/* Hooves */}
      <Rect x="7"  y="29" width="2.5" height="2" rx="1" fill={c} opacity="0.7" />
      <Rect x="11" y="29" width="2.5" height="2" rx="1" fill={c} opacity="0.7" />
      <Rect x="15" y="29" width="2.5" height="2" rx="1" fill={c} opacity="0.7" />
      <Rect x="19" y="29" width="2.5" height="2" rx="1" fill={c} opacity="0.7" />
      {/* Head */}
      <Ellipse cx="20" cy="16" rx="4.5" ry="4" fill={c} opacity="0.85" />
      {/* Snout */}
      <Ellipse cx="22" cy="18" rx="2.5" ry="2" fill={c} opacity="0.65" />
      {/* Eye */}
      <Circle cx="19.5" cy="14.5" r="1.2" fill={BG} />
      <Circle cx="20"   cy="14"   r="0.5" fill="#FFF" opacity="0.6" />
      {/* Ear */}
      <Ellipse cx="17" cy="13" rx="2" ry="3" fill={c} opacity="0.7" transform="rotate(15, 17, 13)" />
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

  // Menacing wolf head peeking through a fluffy sheep fleece disguise // AI-generated
  wolves_in_sheeps_clothing: (c) => (
    <G>
      {/* Sheep wool body — fluffy cloud puffs around the wolf */}
      <Circle cx="9"  cy="20" r="6"   fill={OUT} opacity="0.85" />
      <Circle cx="16" cy="17" r="6.5" fill={OUT} opacity="0.90" />
      <Circle cx="23" cy="19" r="6"   fill={OUT} opacity="0.85" />
      <Circle cx="12" cy="24" r="5"   fill={OUT} opacity="0.80" />
      <Circle cx="20" cy="24" r="5"   fill={OUT} opacity="0.80" />
      {/* Sheep legs poking below the disguise */}
      <Line x1="10" y1="27" x2="9"  y2="31" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="14" y1="28" x2="14" y2="32" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="18" y1="28" x2="18" y2="32" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="22" y1="27" x2="23" y2="31" stroke={OUT} strokeWidth="2.5" strokeLinecap="round" />
      {/* Wolf head emerging from center of the wool — menacing */}
      {/* Wolf snout */}
      <Ellipse cx="16" cy="20" rx="5" ry="4" fill="#484848" />
      <Ellipse cx="16" cy="18" rx="3" ry="2" fill="#1A1A1A" />
      {/* Wolf ears poking up through wool */}
      <Polygon points="11,14 7,6 15,11"  fill="#484848" />
      <Polygon points="21,14 25,6 17,11" fill="#484848" />
      <Polygon points="12,13 9,7 15,11"  fill="#7A1A2A" opacity="0.75" />
      <Polygon points="20,13 23,7 17,11" fill="#7A1A2A" opacity="0.75" />
      {/* Wolf glowing eyes */}
      <Circle cx="12" cy="16" r="2.8" fill="#CC0028" />
      <Circle cx="20" cy="16" r="2.8" fill="#CC0028" />
      <Ellipse cx="12" cy="16" rx="0.9" ry="1.8" fill="#0A0005" />
      <Ellipse cx="20" cy="16" rx="0.9" ry="1.8" fill="#0A0005" />
      <Circle cx="12.8" cy="15" r="0.7" fill="#FF6080" opacity="0.65" />
      <Circle cx="20.8" cy="15" r="0.7" fill="#FF6080" opacity="0.65" />
      {/* Fangs */}
      <Polygon points="14,22 13,26 15,23" fill="#E8E8E0" opacity="0.85" />
      <Polygon points="18,22 19,26 17,23" fill="#E8E8E0" opacity="0.85" />
    </G>
  ),

  // Shepherd carrying a fluffy sheep across shoulders, with crook in hand // AI-generated
  the_lost_sheep: (c) => (
    <G>
      {/* Shepherd's crook — curved top, long shaft */}
      <Path d="M6 30 L6 12 Q6 6 10 6 Q14 6 14 10 Q14 14 10 14" stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Shepherd body — robe flowing shape */}
      <Path d="M17 10 Q14 10 13 14 L11 30 L23 30 L21 14 Q20 10 17 10Z" fill={c} opacity="0.9" />
      {/* Shepherd arm extending left to hold sheep */}
      <Line x1="14" y1="15" x2="8" y2="16" stroke={c} strokeWidth="2" strokeLinecap="round" />
      {/* Shepherd head */}
      <Circle cx="17" cy="7" r="3.5" fill={c} />
      {/* Head scarf drape */}
      <Path d="M13.5 6 Q13 9 14 11" stroke={c} strokeWidth="1.5" fill="none" opacity="0.65" strokeLinecap="round" />
      {/* ── Sheep draped across shoulders ── */}
      {/* Sheep body wool — fluffy puffs */}
      <Circle cx="21" cy="13" r="5"   fill={OUT} opacity="0.92" />
      <Circle cx="26" cy="12" r="4.5" fill={OUT} opacity="0.88" />
      <Circle cx="23" cy="10" r="4"   fill={OUT} opacity="0.95" />
      <Circle cx="19" cy="11" r="3.5" fill={OUT} opacity="0.80" />
      {/* Wool highlight */}
      <Circle cx="23" cy="10" r="2"   fill="#FFFFFF" opacity="0.30" />
      {/* Sheep head poking out right */}
      <Ellipse cx="29" cy="11" rx="3.5" ry="3" fill={c} opacity="0.75" />
      {/* Sheep eye */}
      <Circle  cx="30" cy="10" r="0.9" fill={BG} />
      {/* Sheep ear */}
      <Ellipse cx="28" cy="8.5" rx="1.5" ry="2" fill={c} opacity="0.65" transform="rotate(-15, 28, 8.5)" />
      {/* Sheep dangling legs over shoulder */}
      <Line x1="19" y1="17" x2="17" y2="22" stroke={c} strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
      <Line x1="22" y1="18" x2="21" y2="22" stroke={c} strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
      {/* Ground shadow */}
      <Ellipse cx="17" cy="31" rx="7" ry="1.5" fill={c} opacity="0.18" />
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
