import React, { useRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
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
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  onDragStart,
  onDragEnd,
  onDelete,
  onMeasure,
  trashZoneBounds,
}: DraggableComboChipProps) {
  const viewRef = useRef<View>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

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
    .onStart(() => {
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
      if (onDragStart) {
        runOnJS(onDragStart)();
      }
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
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
        // Delete immediately, animate independently
        runOnJS(onDelete)();
        opacity.value = withSpring(0);
        scale.value = withSpring(0.5);
      } else {
        // Spring back to original position
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        opacity.value = withSpring(1);
      }

      if (onDragEnd) {
        runOnJS(onDragEnd)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: scale.value > 1 ? 1000 : 1,
  }));

  // Don't make arrows draggable
  if (type === "arrow") {
    return <ComboChip type={type} label={label} />;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        ref={viewRef}
        style={[styles.container, animatedStyle]}
        onLayout={handleLayout}
      >
        <ComboChip type={type} label={label} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    // Container for animated view
  },
});
