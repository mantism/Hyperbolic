import React from "react";
import { StyleSheet } from "react-native";
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

interface DraggableComboChipProps {
  type: ChipType;
  label: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDelete?: () => void;
  trashZoneBounds?: TrashZoneBounds;
}

/**
 * Draggable wrapper for ComboChip
 * Allows user to drag chips to delete them
 */
export default function DraggableComboChip({
  type,
  label,
  onDragStart,
  onDragEnd,
  onDelete,
  trashZoneBounds,
}: DraggableComboChipProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

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
        // Animate to trash and delete
        opacity.value = withSpring(0, {}, () => {
          runOnJS(onDelete)();
        });
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
      <Animated.View style={[styles.container, animatedStyle]}>
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
