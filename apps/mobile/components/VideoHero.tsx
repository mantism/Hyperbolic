import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Image, Animated } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TrickVideo } from "@/lib/services/videoService";

interface VideoHeroProps {
  video: TrickVideo | null;
  categoryColor: string;
  scrollY: Animated.Value;
  onPlayPress?: () => void;
}

export default function VideoHero({
  video,
  categoryColor,
  scrollY,
  onPlayPress,
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

      {/* Play button */}
      {onPlayPress && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={onPlayPress}
          activeOpacity={0.8}
        >
          <View style={styles.playButtonInner}>
            <Ionicons name="play" size={32} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
  playButton: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4, // Optical alignment for play icon
  },
});
