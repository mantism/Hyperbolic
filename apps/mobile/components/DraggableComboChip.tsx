import React, { useRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import ComboChip from "./ComboChip";

type ChipType = "trick" | "transition" | "stance" | "arrow";

export interface ChipMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

interface DraggableComboChipProps {
  type: ChipType;
  label: string;
  index: number;
  isGhost?: boolean;
  onMeasure?: (index: number, measurement: ChipMeasurement) => void;
}

/**
 * A ComboChip that reports its measurements for hit detection.
 * Gesture handling is done at the parent level to survive reorders.
 */
export default function DraggableComboChip({
  type,
  label,
  index,
  isGhost = false,
  onMeasure,
}: DraggableComboChipProps) {
  const viewRef = useRef<View>(null);

  const measureChip = useCallback(() => {
    if (!onMeasure || !viewRef.current) return;

    viewRef.current.measure((x, y, width, height, pageX, pageY) => {
      if (width > 0 && height > 0) {
        onMeasure(index, { x, y, width, height, pageX, pageY });
      }
    });
  }, [index, onMeasure]);

  const handleLayout = useCallback(() => {
    // Small delay to ensure layout is complete
    requestAnimationFrame(() => {
      measureChip();
    });
  }, [measureChip]);

  return (
    <View
      ref={viewRef}
      style={[styles.container, isGhost && styles.ghost]}
      onLayout={handleLayout}
    >
      <ComboChip type={type} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  ghost: {
    opacity: 0.4,
  },
});
