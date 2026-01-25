import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TrickVideo } from "@hyperbolic/shared-types";

interface VideoPlayerModalProps {
  visible: boolean;
  video: TrickVideo | null;
  onClose: () => void;
}

export default function VideoPlayerModal({
  visible,
  video,
  onClose,
}: VideoPlayerModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);

  const player = useVideoPlayer(video?.url ?? "", (player) => {
    player.loop = true;
    player.play();
  });

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (!video) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            fullscreenOptions={{
              enable: true,
            }}
            nativeControls={false}
          />

          {/* Custom Controls Overlay */}
          <TouchableOpacity
            style={styles.controlsOverlay}
            onPress={togglePlayPause}
            activeOpacity={1}
          >
            {!isPlaying && (
              <View style={styles.playButton}>
                <Ionicons name="play" size={48} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4, // Optical alignment for play icon
  },
  infoContainer: {
    padding: 20,
    gap: 8,
  },
  infoText: {
    color: "#FFF",
    fontSize: 14,
    opacity: 0.8,
  },
});
