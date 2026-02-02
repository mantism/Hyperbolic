import React from "react";
import { View, StyleSheet, Image, Animated } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { UserVideo } from "@hyperbolic/shared-types";

const DEFAULT_COLOR = "#999999";

interface VideoHeroProps {
  video: UserVideo | null;

  scrollY: Animated.Value;
  categoryColor?: string;
}

export default function VideoHero({
  video,
  scrollY,
  categoryColor = DEFAULT_COLOR,
}: VideoHeroProps) {
  if (!video || !video.thumbnail_url) {
    // Fallback to category color with icon
    return (
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: categoryColor + "20",
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 300],
                  outputRange: [0, -100],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="image-outline" size={48} color={categoryColor} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, 300],
                outputRange: [0, -100],
                extrapolate: "clamp",
              }),
            },
          ],
        },
      ]}
    >
      <Image
        source={{ uri: video.thumbnail_url || undefined }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      {/* Gradient overlay */}
      <View style={styles.gradient} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 360,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
});
