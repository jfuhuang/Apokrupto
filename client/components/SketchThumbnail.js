import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * SketchThumbnail — renders a normalized sketch at a fixed pixel size.
 *
 * Props:
 *   sketchData   — { strokes: [[{x, y}, ...], ...] }  (normalized 0–1 coords)
 *   size         — pixel dimension (square); default 80
 *   strokeColor  — SVG stroke color; default '#ffffff'
 *   strokeWidth  — SVG stroke width; default 2
 */
export default function SketchThumbnail({
  sketchData,
  size = 80,
  strokeColor = '#ffffff',
  strokeWidth = 2,
}) {
  const strokes = sketchData?.strokes ?? [];

  const strokeToPath = (points) => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x * size} ${first.y * size}`;
    for (const p of rest) {
      d += ` L ${p.x * size} ${p.y * size}`;
    }
    return d;
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {strokes.map((stroke, i) => (
        <Path
          key={i}
          d={strokeToPath(stroke)}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
