import React from 'react';
import Svg, { Path, Ellipse, Rect, G } from 'react-native-svg';
import { colors } from '../theme/colors';

// Among Us crewmate silhouette — used as "Sus" indicator throughout the UI.
export default function SusIcon({ size = 16, color = colors.primary.neonRed }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G>
        {/* Body — rounded rectangle */}
        <Rect x="8" y="8" width="14" height="20" rx="6" ry="6" fill={color} />
        {/* Backpack bump — left side */}
        <Rect x="4" y="14" width="5" height="10" rx="2.5" ry="2.5" fill={color} />
        {/* Visor */}
        <Ellipse cx="18" cy="14" rx="5.5" ry="4" fill="rgba(255,255,255,0.85)" />
        <Ellipse cx="18" cy="14" rx="5.5" ry="4" fill={color} opacity="0.15" />
        {/* Leg gap */}
        <Rect x="14" y="25" width="3" height="4" fill="none" />
        <Path d="M14 25 L14 29" stroke="#0B0C10" strokeWidth="2.5" />
        {/* Left leg */}
        <Rect x="9" y="25" width="5" height="3" rx="1.5" ry="1.5" fill={color} />
        {/* Right leg */}
        <Rect x="16.5" y="25" width="5" height="3" rx="1.5" ry="1.5" fill={color} />
      </G>
    </Svg>
  );
}
