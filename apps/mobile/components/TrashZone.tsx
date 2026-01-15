import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";

interface TrashZoneProps {
  visible: boolean;
  onLayout?: (y: number) => void;
}

/**
 * Animated trash zone that appears when dragging combo chips
 */
export default function TrashZone({ visible, onLayout }: TrashZoneProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
    } else {
      translateY.value = withSpring(100);
      opacity.value = withSpring(0);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      onLayout={(event) => {
        const { y } = event.nativeEvent.layout;
        if (onLayout) {
          onLayout(y);
        }
      }}
    >
      <View style={styles.trashIcon}>
        <Ionicons name="trash" size={32} color="#FF3B30" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  trashIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "rgba(255, 59, 48, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
});
