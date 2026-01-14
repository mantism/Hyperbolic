import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

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

  // Transition chip: s/t
  transitionChip: {
    backgroundColor: "#FFF3E0",
    borderWidth: 1,
    borderColor: "#FF9800",
  },
  transitionText: {
    color: "#F57C00",
    fontWeight: "500",
    fontStyle: "italic",
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
});
