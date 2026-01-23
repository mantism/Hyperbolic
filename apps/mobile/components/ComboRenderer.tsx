import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { ComboGraph, SequenceItem } from "@hyperbolic/shared-types";
import { comboGraphToSequence } from "@/lib/utils/comboRendering";
import ComboChip from "./ComboChip";

const DEFAULT_PREVIEW_SCALE = 0.5;
const CHIP_HEIGHT = 32;

interface ComboRendererProps {
  /** ComboGraph from database or SequenceItem[] from composer */
  combo: ComboGraph | SequenceItem[];
  /** Optional style for the container */
  style?: ViewStyle;
  /** When true, renders at a smaller fixed scale for card previews */
  preview?: boolean;
}

/**
 * Read-only renderer for combo sequences.
 * Displays tricks and transitions as chips without any editing or gesture handling.
 */
export default function ComboRenderer({
  combo,
  style,
  preview = false,
}: ComboRendererProps) {
  // Convert ComboGraph to SequenceItem[] if needed
  const sequence = useMemo(() => {
    if (Array.isArray(combo)) {
      return combo;
    }
    return comboGraphToSequence(combo);
  }, [combo]);

  const chips = sequence.map((item) => {
    if (item.type === "arrow") {
      if (!item.transition_id) {
        return null;
      }
      return (
        <ComboChip key={item.id} type="transition" label={item.transition_id} />
      );
    }

    if (item.type === "trick") {
      const { trick_id, landing_stance } = item.data;
      const label = landing_stance
        ? `${trick_id} (${landing_stance})`
        : trick_id;

      return <ComboChip key={item.id} type="trick" label={label} />;
    }

    return null;
  });

  if (!preview) {
    return <View style={[styles.content, style]}>{chips}</View>;
  }

  let previewScale = DEFAULT_PREVIEW_SCALE;
  if (sequence.length > 10) {
    previewScale = DEFAULT_PREVIEW_SCALE * (10 / sequence.length);
  }

  return (
    <View style={[styles.previewContainer, style]}>
      <View
        style={[
          styles.content,
          {
            transform: [{ scale: previewScale }],
            transformOrigin: "left top",
          },
        ]}
      >
        {chips}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 4,
  },
  previewContainer: {
    height: CHIP_HEIGHT * DEFAULT_PREVIEW_SCALE,
  },
});
