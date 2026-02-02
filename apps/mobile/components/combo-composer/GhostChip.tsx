import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface GhostChipProps {
  label: string;
}

/**
 * A grayed-out placeholder chip that shows where a dragged chip will be placed.
 * Rendered inline in the sequence layout.
 */
export default function GhostChip({ label }: GhostChipProps) {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderStyle: "dashed",
    marginHorizontal: 2,
  },
  text: {
    fontSize: 14,
    color: "#9E9E9E",
    fontWeight: "500",
  },
});
