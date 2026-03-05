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
 * gideons_torch          gideons_torch                Cracked clay jar with torch erupting in layered flame
 * fiery_furnace          fiery_furnace                Stone-brick kiln with arch opening, three figures in flames erupting from top
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
 * be_still               be_still                     Two open upturned palms side by side with peace rays rising above
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

  // Armored Philistine giant (helmet plume, spear, shield) facing a tiny shepherd // AI-generated
  david_and_goliath: (c) => (
    <G>
      {/* ── Goliath — left side, large ── */}
      {/* Spear */}
      <Rect x="3" y="2" width="2.5" height="24" rx="1.2" fill={FIRE} opacity="0.8" />
      <Polygon points="4,2 2,0 6,0" fill={OUT} opacity="0.85" />
      {/* Shield — large oval */}
      <Ellipse cx="6" cy="18" rx="4" ry="8" fill={c} opacity="0.85" />
      <Circle cx="6" cy="18" r="2" fill={FIRE} opacity="0.55" />
      {/* Body armor */}
      <Rect x="7" y="12" width="9" height="12" rx="2" fill={c} />
      {/* Scale rows */}
      <Line x1="8"  y1="15" x2="15" y2="15" stroke={BG} strokeWidth="0.7" opacity="0.5" />
      <Line x1="8"  y1="18" x2="15" y2="18" stroke={BG} strokeWidth="0.7" opacity="0.5" />
      <Line x1="8"  y1="21" x2="15" y2="21" stroke={BG} strokeWidth="0.7" opacity="0.5" />
      {/* Head */}
      <Circle cx="11" cy="9" r="5" fill={c} opacity="0.9" />
      {/* Feathered plume */}
      <Path d="M9 4 C8 1 9 0 10 0 C10 2 11 1 11 0 C11 2 12 1 12 0 C12 2 13 1 13 4Z" fill="#A02020" opacity="0.80" />
      {/* Helmet cap */}
      <Path d="M6.5 8 Q6.5 4 11 4 Q15.5 4 15.5 8Z" fill={c} opacity="0.75" />
      {/* Eyes (menacing) */}
      <Circle cx="9.5" cy="9.5" r="1.2" fill={BG} />
      <Circle cx="12.5" cy="9.5" r="1.2" fill={BG} />
      <Circle cx="9.5" cy="9.5" r="0.5" fill="#AA0000" />
      <Circle cx="12.5" cy="9.5" r="0.5" fill="#AA0000" />
      {/* Legs */}
      <Rect x="8"  y="24" width="4" height="7" rx="2" fill={c} opacity="0.85" />
      <Rect x="13" y="24" width="4" height="7" rx="2" fill={c} opacity="0.85" />

      {/* ── Divider — distance gap ── */}
      <Line x1="20" y1="4" x2="20" y2="28" stroke={c} strokeWidth="0.6" strokeDasharray="2,2" opacity="0.25" />

      {/* ── David — right side, small ── */}
      {/* Sling cord */}
      <Path d="M27 12 Q24 8 22 5" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M27 12 Q30 10 32 8" stroke={c} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Stone in sling */}
      <Circle cx="22" cy="4" r="2" fill={FIRE} />
      {/* David body */}
      <Rect x="25" y="18" width="4" height="8" rx="2" fill={c} opacity="0.85" />
      {/* David head */}
      <Circle cx="27" cy="14" r="3.5" fill={c} opacity="0.9" />
      {/* David arm raised */}
      <Line x1="27" y1="17" x2="27" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      {/* David legs */}
      <Line x1="26" y1="26" x2="24" y2="31" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <Line x1="28" y1="26" x2="30" y2="31" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
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

  // Top-down view of circular Jericho city wall with towers, gates, and collapse cracks // AI-generated
  walls_of_jericho: (c) => (
    <G>
      {/* City ground */}
      <Circle cx="16" cy="16" r="11" fill={c} opacity="0.30" />
      {/* Inner streets */}
      <Line x1="8"  y1="16" x2="24" y2="16" stroke={c} strokeWidth="1.2" opacity="0.35" />
      <Line x1="16" y1="8"  x2="16" y2="24" stroke={c} strokeWidth="1.2" opacity="0.35" />
      {/* Interior buildings */}
      <Rect x="9"  y="9"  width="5" height="4" rx="1" fill={c} opacity="0.50" />
      <Rect x="18" y="9"  width="5" height="4" rx="1" fill={c} opacity="0.50" />
      <Rect x="9"  y="19" width="5" height="4" rx="1" fill={c} opacity="0.50" />
      <Rect x="18" y="19" width="5" height="4" rx="1" fill={c} opacity="0.50" />
      {/* Well at center */}
      <Circle cx="16" cy="16" r="2.5" fill={BG} opacity="0.6" />
      <Circle cx="16" cy="16" r="1.2" fill={c}  opacity="0.40" />
      {/* Outer wall ring */}
      <Circle cx="16" cy="16" r="14" fill={c}          opacity="0.85" />
      <Circle cx="16" cy="16" r="11" fill={BG}          opacity="0.70" />
      <Circle cx="16" cy="16" r="14" fill="none" stroke={c} strokeWidth="1" opacity="0.40" />
      {/* Wall coursing rings */}
      <Circle cx="16" cy="16" r="13" fill="none" stroke={BG} strokeWidth="0.7" opacity="0.40" />
      {/* Towers at 4 cardinal positions */}
      {[[16,2],[30,16],[16,30],[2,16]].map(([tx,ty],i) => (
        <Rect key={i} x={tx-3} y={ty-3} width={6} height={6} rx={1}
          fill={c} opacity="0.95" />
      ))}
      {/* Gate (south) */}
      <Rect x="13" y="28" width="6" height="4" rx="1" fill={BG} opacity="0.65" />
      {/* Collapse cracks */}
      <Path d="M22 5 L19 10 L24 14" stroke={FIRE} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.70" />
      <Path d="M5 20 L9 18 L7 23"  stroke={FIRE} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.60" />
      {/* Dust/debris at crack */}
      <Circle cx="23" cy="6"  r="3" fill={FIRE} opacity="0.18" />
      <Circle cx="6"  cy="22" r="2.5" fill={FIRE} opacity="0.15" />
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

  // Burning torch erupting from a cracked clay jar — Gideon's army // AI-generated
  gideons_torch: (c) => (
    <G>
      {/* Flame outer glow */}
      <Ellipse cx="16" cy="8" rx="6" ry="7" fill={FIRE} opacity="0.15" />
      {/* Outer flame */}
      <Path d="M12 12 C9 8 10 3 13 1 C12 4 14 4 13 1 C14 3 16 2 15 0 C16 3 18 2 17 0 C18 3 20 4 19 1 C22 3 23 8 20 12Z" fill={FIRE} />
      {/* Mid flame */}
      <Path d="M13 12 C11 9 12 5 15 3 C17 5 18 9 17 12Z" fill={FIRE} opacity="0.85" />
      {/* White-hot inner core */}
      <Path d="M14.5 12 C13.5 9 14.5 6 16 4 C17.5 6 18.5 9 17.5 12Z" fill={OUT} opacity="0.60" />
      {/* Torch handle — wood shaft visible above jar rim */}
      <Rect x="14.5" y="11" width="3" height="6" rx="1.5" fill="#7A4E1A" />
      <Line x1="15" y1="13" x2="17" y2="13" stroke="#A06828" strokeWidth="0.8" opacity="0.5" />
      {/* Jar rim */}
      <Ellipse cx="16" cy="14" rx="6.5" ry="2.5" fill={c} />
      {/* Jar neck */}
      <Rect x="11.5" y="14" width="9" height="3" rx="0" fill={c} opacity="0.95" />
      {/* Jar body */}
      <Path d="M11 17 Q8 20 8.5 24 Q9 29 16 30 Q23 29 23.5 24 Q24 20 21 17Z" fill={c} opacity="0.92" />
      {/* Jar base */}
      <Ellipse cx="16" cy="30" rx="6.5" ry="2" fill={c} opacity="0.75" />
      {/* Jar highlight — left-edge sheen */}
      <Path d="M9.5 18 Q8.5 22 9 26" stroke={OUT} strokeWidth="1.5" fill="none" opacity="0.18" strokeLinecap="round" />
      {/* Main crack */}
      <Path d="M20 18 L22 23 L19 27" stroke={BG} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Secondary hairline crack */}
      <Path d="M19 27 L21 30" stroke={BG} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Orange glow leaking through crack */}
      <Path d="M20 19 L22 23 L19 26" stroke={FIRE} strokeWidth="0.9" fill="none" opacity="0.55" strokeLinecap="round" />
      {/* Jar band detail */}
      <Line x1="11" y1="20" x2="21" y2="20" stroke={BG} strokeWidth="0.8" opacity="0.5" />
      <Line x1="10" y1="24" x2="22" y2="24" stroke={BG} strokeWidth="0.8" opacity="0.4" />
    </G>
  ),

  // Domed stone furnace with three silhouetted figures standing in the flames // AI-generated
  fiery_furnace: (c) => (
    <G>
      {/* Outer glow emanating from furnace */}
      <Ellipse cx="16" cy="17" rx="14" ry="13" fill={FIRE} opacity="0.10" />
      {/* Furnace body — barrel-arched kiln */}
      <Path d="M3 31 L3 15 Q3 5 16 5 Q29 5 29 15 L29 31Z" fill={c} />
      {/* Stone block / brick rows */}
      <Line x1="3"  y1="19" x2="29" y2="19" stroke={BG} strokeWidth="0.75" opacity="0.45" />
      <Line x1="3"  y1="23" x2="29" y2="23" stroke={BG} strokeWidth="0.75" opacity="0.45" />
      <Line x1="3"  y1="27" x2="29" y2="27" stroke={BG} strokeWidth="0.75" opacity="0.45" />
      {/* Staggered vertical joints */}
      <Line x1="10" y1="19" x2="10" y2="23" stroke={BG} strokeWidth="0.65" opacity="0.35" />
      <Line x1="22" y1="19" x2="22" y2="23" stroke={BG} strokeWidth="0.65" opacity="0.35" />
      <Line x1="7"  y1="23" x2="7"  y2="27" stroke={BG} strokeWidth="0.65" opacity="0.35" />
      <Line x1="19" y1="23" x2="19" y2="27" stroke={BG} strokeWidth="0.65" opacity="0.35" />
      <Line x1="14" y1="27" x2="14" y2="31" stroke={BG} strokeWidth="0.65" opacity="0.35" />
      <Line x1="24" y1="27" x2="24" y2="31" stroke={BG} strokeWidth="0.65" opacity="0.35" />
      {/* Arch opening — fiery interior */}
      <Path d="M7 31 L7 21 Q7 13 16 13 Q25 13 25 21 L25 31Z" fill={FIRE} opacity="0.80" />
      {/* Interior glow — brighter center hot-spot */}
      <Path d="M10 31 L10 23 Q10 18 16 18 Q22 18 22 23 L22 31Z" fill={FIRE} opacity="0.55" />
      <Ellipse cx="16" cy="21" rx="5" ry="4" fill={OUT} opacity="0.18" />
      {/* Three figures silhouetted inside */}
      {/* Figure 1 — left */}
      <Rect   x="9"    y="22" width="3"   height="9"  rx="1.5" fill={BG} opacity="0.72" />
      <Circle cx="10.5" cy="21" r="2.2"                        fill={BG} opacity="0.72" />
      {/* Figure 2 — center, slightly taller (the fourth?) */}
      <Rect   x="14.5" y="20" width="3"   height="11" rx="1.5" fill={BG} opacity="0.80" />
      <Circle cx="16"   cy="19" r="2.4"                        fill={BG} opacity="0.80" />
      {/* Figure 3 — right */}
      <Rect   x="20"   y="22" width="3"   height="9"  rx="1.5" fill={BG} opacity="0.72" />
      <Circle cx="21.5" cy="21" r="2.2"                        fill={BG} opacity="0.72" />
      {/* Flames erupting from furnace top — multi-layer */}
      <Path d="M9 5 C7 1 8 0 10 0 C9 3 11 2 10 0 C11 2 13 1 12 0 C13 2 15 1 14 0 C15 3 17 2 16 0 C17 3 19 2 18 0 C19 2 21 2 20 0 C21 2 23 1 22 0 C24 2 25 1 23 5Z" fill={FIRE} />
      {/* Inner flame highlight running up through the eruption */}
      <Path d="M11 5 C10 2 12 1 12 0 C13 2 15 1 14 0 C15 3 17 2 16 0 C17 3 19 2 18 0 C19 2 21 2 21 5Z" fill={OUT} opacity="0.35" />
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

  // Two open upturned palms side by side — peaceful offering gesture // AI-generated
  be_still: (c) => (
    <G>
      {/* === Left hand === */}
      {/* Palm + four fingers */}
      <Path
        d="M2 23 Q1 19 2 16 Q3 14 5 14 L5 20
           Q6 17 6 14 Q7 12 9 13 L9 20
           Q10 16 10 13 Q11 11 12 12 L12 20
           Q13 16 14 14 Q15 13 16 14 L15 21
           Q15 23 13 26 Q9 27 5 26 Q2 25 2 23Z"
        fill={c}
      />
      {/* Left thumb */}
      <Path d="M2 22 Q0 20 1 17 Q2 16 3 17 L3 22Z" fill={c} opacity="0.85" />
      {/* Finger dividers */}
      <Line x1="5"  y1="20" x2="5"  y2="26" stroke={BG} strokeWidth="0.85" opacity="0.4" />
      <Line x1="9"  y1="20" x2="9"  y2="27" stroke={BG} strokeWidth="0.85" opacity="0.4" />
      <Line x1="12" y1="20" x2="12" y2="27" stroke={BG} strokeWidth="0.85" opacity="0.4" />
      {/* Palm crease */}
      <Path d="M3 23 Q8 25 14 22" stroke={BG} strokeWidth="0.7" fill="none" opacity="0.30" />
      {/* Palm highlight sheen */}
      <Ellipse cx="8" cy="22" rx="3.5" ry="1.5" fill={OUT} opacity="0.13" />

      {/* === Right hand (mirrored) === */}
      <Path
        d="M30 23 Q31 19 30 16 Q29 14 27 14 L27 20
           Q26 17 26 14 Q25 12 23 13 L23 20
           Q22 16 22 13 Q21 11 20 12 L20 20
           Q19 16 18 14 Q17 13 16 14 L17 21
           Q17 23 19 26 Q23 27 27 26 Q30 25 30 23Z"
        fill={c}
      />
      {/* Right thumb */}
      <Path d="M30 22 Q32 20 31 17 Q30 16 29 17 L29 22Z" fill={c} opacity="0.85" />
      {/* Finger dividers */}
      <Line x1="27" y1="20" x2="27" y2="26" stroke={BG} strokeWidth="0.85" opacity="0.4" />
      <Line x1="23" y1="20" x2="23" y2="27" stroke={BG} strokeWidth="0.85" opacity="0.4" />
      <Line x1="20" y1="20" x2="20" y2="27" stroke={BG} strokeWidth="0.85" opacity="0.4" />
      {/* Palm crease */}
      <Path d="M29 23 Q24 25 18 22" stroke={BG} strokeWidth="0.7" fill="none" opacity="0.30" />
      {/* Palm highlight sheen */}
      <Ellipse cx="24" cy="22" rx="3.5" ry="1.5" fill={OUT} opacity="0.13" />

      {/* Peace rays rising above the open hands */}
      <Line x1="16" y1="12" x2="16" y2="6"  stroke={FIRE} strokeWidth="1.5" opacity="0.45" strokeLinecap="round" />
      <Line x1="12" y1="13" x2="9"  y2="8"  stroke={FIRE} strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
      <Line x1="20" y1="13" x2="23" y2="8"  stroke={FIRE} strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
      <Line x1="9"  y1="15" x2="6"  y2="11" stroke={FIRE} strokeWidth="1"   opacity="0.22" strokeLinecap="round" />
      <Line x1="23" y1="15" x2="26" y2="11" stroke={FIRE} strokeWidth="1"   opacity="0.22" strokeLinecap="round" />
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
