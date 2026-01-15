import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";

type ChipType = "trick" | "transition" | "stance" | "arrow";

interface ComboChipProps {
  type: ChipType;
  label: string;
  onRemove?: () => void;
  onPress?: () => void;
}

/**
 * Visual chip component for displaying tricks, transitions, and stances in a combo sequence
 * Examples:
 * - Trick: [butterfly twist]
 * - Transition: s/t
 * - Stance: (complete)
 * - Arrow: →
 */
export default function ComboChip({
  type,
  label,
  onRemove,
  onPress,
}: ComboChipProps) {
  const containerStyle = [
    styles.chip,
    type === "trick" && styles.trickChip,
    type === "transition" && styles.transitionChip,
    type === "stance" && styles.stanceChip,
    type === "arrow" && styles.arrowChip,
  ];

  const textStyle = [
    styles.chipText,
    type === "trick" && styles.trickText,
    type === "transition" && styles.transitionText,
    type === "stance" && styles.stanceText,
    type === "arrow" && styles.arrowText,
  ];

  // Render transition with chevron background
  if (type === "transition") {
    const badgeHeight = 20; // Badge height
    const chevronHeight = 28; // Independent chevron height (TALLER than badge - extends above/below)
    const chevronWidth = 12; // Chevron point length
    const borderWidth = 1;

    return (
      <View style={styles.chevronContainer}>
        {/* Middle badge content (renders first, on bottom) */}
        <View style={[styles.chevronMiddle, { height: badgeHeight }]}>
          <Text style={styles.transitionText}>{label}</Text>
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={14} color="#F57C00" />
            </TouchableOpacity>
          )}
        </View>

        {/* Triangle SVG (independent of badge height) */}
        <View style={{ marginLeft: -5 }}>
          <Svg height={chevronHeight} width={chevronWidth + 10}>
            {/* Draw full triangle background */}
            <Path
              d={`M${chevronWidth},${chevronHeight / 2} L0,0 L0,${chevronHeight} Z`}
              fill="#FFF3E0"
            />
            {/* Stroke only the visible edges */}
            <Path
              d={`M0,0 L${chevronWidth},${chevronHeight / 2} L0,${chevronHeight}`}
              stroke="#FF9800"
              strokeWidth={borderWidth}
              fill="none"
            />
            {/* Add connecting lines from badge corners to triangle */}
            <Path
              d={`M0,${(chevronHeight - badgeHeight) / 2} L0,0`}
              stroke="#FF9800"
              strokeWidth={borderWidth * 2}
              fill="none"
            />
            <Path
              d={`M0,${chevronHeight} L0,${(chevronHeight + badgeHeight) / 2}`}
              stroke="#FF9800"
              strokeWidth={borderWidth * 2}
              fill="none"
            />
          </Svg>
        </View>
      </View>
    );
  }

  const chipContent = (
    <View style={containerStyle}>
      <Text style={textStyle}>{label}</Text>
      {onRemove && type !== "arrow" && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={16} color="#999" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress && type !== "arrow") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chipContent}
      </TouchableOpacity>
    );
  }

  return chipContent;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginHorizontal: 2,
  },
  chipText: {
    fontSize: 14,
  },

  // Trick chip: [butterfly twist]
  trickChip: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  trickText: {
    color: "#1976D2",
    fontWeight: "500",
  },

  // Transition chip: s/t (arrow-shaped)
  transitionChip: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
    borderRadius: 4,
    paddingHorizontal: 4,
    // Create visual arrow effect with asymmetric borders
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  transitionText: {
    color: "#F57C00",
    fontWeight: "600",
    fontSize: 13,
  },

  // Stance chip: (complete)
  stanceChip: {
    backgroundColor: "#F3E5F5",
    borderWidth: 1,
    borderColor: "#9C27B0",
  },
  stanceText: {
    color: "#7B1FA2",
    fontWeight: "500",
  },

  // Arrow chip: →
  arrowChip: {
    backgroundColor: "transparent",
    paddingHorizontal: 4,
  },
  arrowText: {
    color: "#999",
    fontSize: 16,
  },

  // Chevron container for transitions
  chevronContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
  },
  chevronLeft: {
    marginLeft: -2,
  },
  chevronRight: {
    marginLeft: -5,
    marginRight: -2,
  },
  chevronMiddle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 0,
    borderColor: "#FF9800",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    gap: 4,
    justifyContent: "center",
  },
});
