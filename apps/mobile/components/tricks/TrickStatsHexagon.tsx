import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Polygon, Line, Text as SvgText } from "react-native-svg";

interface TrickStats {
  power: number; // 0-100
  creativity: number; // 0-100
  flips: number; // 0-100
  twists: number; // 0-100
  variations: number; // 0-100
  kicks: number; // 0-100
}

interface TrickStatsHexagonProps {
  stats: TrickStats;
}

export default function TrickStatsHexagon({ stats }: TrickStatsHexagonProps) {
  const size = 235; // Size of the SVG canvas (90% of 260)
  const center = size / 2;
  const maxRadius = 63; // Radius of the hexagon (90% of 70px = ~63px)

  // Calculate hexagon points (6 vertices)
  // Starting from top and going clockwise
  const angleOffset = -Math.PI / 2; // Start from top (90 degrees up)
  const getPoint = (index: number, scale: number = 1) => {
    const angle = angleOffset + (index * Math.PI) / 3; // 60 degrees between points
    return {
      x: center + maxRadius * scale * Math.cos(angle),
      y: center + maxRadius * scale * Math.sin(angle),
    };
  };

  // Background hexagon (max values)
  const maxHexPoints = Array.from({ length: 6 }, (_, i) => getPoint(i))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  // Stats hexagon (actual values, scaled 0-1)
  const statsScales = [
    stats.power / 100,
    stats.twists / 100,
    stats.kicks / 100,
    stats.creativity / 100,
    stats.variations / 100,
    stats.flips / 100,
  ];

  const statsHexPoints = statsScales
    .map((scale, i) => getPoint(i, scale))
    .map((p) => `${p.x},${p.y}`)
    .join(" ");

  // Grid lines (3 levels: 33%, 66%, 100%)
  const gridLevels = [0.33, 0.66, 1.0];

  // Label positions (further out than max radius)
  const labelDistance = maxRadius + 29; // 90% of 32 = ~29
  const labels = [
    { text: "Power", index: 0 },
    { text: "Twists", index: 1 },
    { text: "Kicks", index: 2 },
    { text: "Creativity", index: 3 },
    { text: "Variations", index: 4 },
    { text: "Flips", index: 5 },
  ];

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Grid hexagons */}
        {gridLevels.map((level, idx) => {
          const gridPoints = Array.from({ length: 6 }, (_, i) =>
            getPoint(i, level)
          )
            .map((p) => `${p.x},${p.y}`)
            .join(" ");
          return (
            <Polygon
              key={`grid-${idx}`}
              points={gridPoints}
              fill="none"
              stroke="#E5E5EA"
              strokeWidth="1"
            />
          );
        })}

        {/* Connecting lines from center to vertices */}
        {Array.from({ length: 6 }, (_, i) => {
          const point = getPoint(i);
          return (
            <Line
              key={`line-${i}`}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="#E5E5EA"
              strokeWidth="1"
            />
          );
        })}

        {/* Stats hexagon (filled) */}
        <Polygon
          points={statsHexPoints}
          fill="rgba(0, 122, 255, 0.3)"
          stroke="#007AFF"
          strokeWidth="2"
        />

        {/* Labels */}
        {labels.map(({ text, index }) => {
          const angle = angleOffset + (index * Math.PI) / 3;
          const labelX = center + labelDistance * Math.cos(angle);
          const labelY = center + labelDistance * Math.sin(angle);

          return (
            <SvgText
              key={`label-${index}`}
              x={labelX}
              y={labelY}
              fontSize="12"
              fontWeight="600"
              fill="#666"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {text}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
