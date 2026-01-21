import React, { useRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import ComboChip from "./ComboChip";
import { TrashZoneBounds } from "./TrashZone";

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
  onDragStart?: (index: number, absoluteX: number, absoluteY: number) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: (index: number) => void;
  onDelete?: () => void;
  onMeasure?: (index: number, measurement: ChipMeasurement) => void;
  trashZoneBounds?: TrashZoneBounds;
}

/**
 * Draggable wrapper for ComboChip
 * Allows user to drag chips to delete them
 */
export default function DraggableComboChip({
  type,
  label,
  index,
  isGhost = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDelete,
  onMeasure,
  trashZoneBounds,
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

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      // Original chip stays in place - floating overlay handles visual drag
      // Just notify parent of drag start
      if (onDragStart) {
        const x = event.absoluteX;
        const y = event.absoluteY;
        scheduleOnRN(onDragStart, index, x, y);
      }
    })
    .onUpdate((event) => {
      // Original chip stays in place - just update parent with position
      if (onDragMove) {
        const x = event.absoluteX;
        const y = event.absoluteY;
        scheduleOnRN(onDragMove, x, y);
      }
    })
    .onEnd((event) => {
      const { absoluteX, absoluteY } = event;

      // Check if dropped within the trash icon bounds
      let isInTrashZone = false;
      if (trashZoneBounds) {
        const { x, y, width, height } = trashZoneBounds;
        isInTrashZone =
          absoluteX >= x &&
          absoluteX <= x + width &&
          absoluteY >= y &&
          absoluteY <= y + height;
      }

      if (isInTrashZone && onDelete) {
        scheduleOnRN(onDelete);
      }

      if (onDragEnd) {
        const idx = index;
        scheduleOnRN(onDragEnd, idx);
      }
    });

  // Don't make arrows draggable
  if (type === "arrow") {
    return <ComboChip type={type} label={label} />;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View
        ref={viewRef}
        style={[styles.container, isGhost && styles.ghost]}
        onLayout={handleLayout}
      >
        <ComboChip type={type} label={label} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {},
  ghost: {
    opacity: 0.4,
  },
});
