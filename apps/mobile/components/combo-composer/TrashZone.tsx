import React, { useRef, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";

export interface TrashZoneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TrashZoneProps {
  visible: boolean;
  onLayout?: (bounds: TrashZoneBounds) => void;
}

const PADDING_VERTICAL = 40;
const TRANSLATE_Y_START = 50;

/**
 * Animated trash zone that appears when dragging combo chips
 */
export default function TrashZone({ visible, onLayout }: TrashZoneProps) {
  const iconRef = useRef<View>(null);
  const translateY = useSharedValue(TRANSLATE_Y_START);
  const opacity = useSharedValue(0);

  const measureAndReport = () => {
    if (onLayout && iconRef.current) {
      iconRef.current.measureInWindow((x, y, width, height) => {
        // Full screen width, vertical padding around icon
        onLayout({
          x: 0,
          y: y - TRANSLATE_Y_START - PADDING_VERTICAL,
          width: 9999, // Full width
          height: height + PADDING_VERTICAL * 2,
        });
      });
    }
  };

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withSpring(1);
    } else {
      translateY.value = withSpring(TRANSLATE_Y_START);
      opacity.value = withSpring(0);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <BlurView
        intensity={20}
        tint="light"
        style={[styles.hitArea, { paddingVertical: PADDING_VERTICAL }]}
      >
        <View
          ref={iconRef}
          style={styles.trashIcon}
          onLayout={measureAndReport}
        >
          <Ionicons name="trash" size={24} color="#999" />
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    zIndex: 999,
  },
  hitArea: {
    width: "100%",
    alignItems: "center",
  },
  trashIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#999",
    justifyContent: "center",
    alignItems: "center",
  },
});
