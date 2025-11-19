import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import Slider from "@react-native-community/slider";
import * as VideoThumbnails from "expo-video-thumbnails";
import { uploadThumbnail } from "@/lib/services/videoService";

interface VideoThumbnailSelectorProps {
  visible: boolean;
  videoUri: string;
  videoId: string;
  videoDuration?: number; // in milliseconds
  onComplete: (thumbnailUrl: string) => void;
  onCancel: () => void;
}

export function VideoThumbnailSelector({
  visible,
  videoUri,
  videoId,
  videoDuration = 0,
  onComplete,
  onCancel,
}: VideoThumbnailSelectorProps) {
  const [selectedTime, setSelectedTime] = useState(0);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.muted = true;
  });

  // Generate thumbnail when time changes
  useEffect(() => {
    if (!visible || !videoUri) return;

    const generateThumbnail = async () => {
      setIsGenerating(true);
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: selectedTime,
          quality: 0.8,
        });
        setThumbnailUri(uri);
      } catch (error) {
        console.error("Failed to generate thumbnail:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateThumbnail();
  }, [selectedTime, videoUri, visible]);

  // Seek video when time changes
  useEffect(() => {
    if (player && selectedTime !== undefined) {
      player.currentTime = selectedTime / 1000; // Convert ms to seconds
      player.pause();
    }
  }, [selectedTime, player]);

  const handleConfirm = async () => {
    if (!thumbnailUri) {
      Alert.alert("Error", "No thumbnail generated");
      return;
    }

    setIsUploading(true);
    try {
      const thumbnailUrl = await uploadThumbnail(videoId, thumbnailUri);
      onComplete(thumbnailUrl);
    } catch (error) {
      console.error("Failed to upload thumbnail:", error);
      Alert.alert(
        "Upload Failed",
        error instanceof Error ? error.message : "Failed to upload thumbnail"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const durationInSeconds = videoDuration / 1000;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} disabled={isUploading}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Thumbnail</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={isUploading || isGenerating}>
            <Text
              style={[
                styles.confirmButton,
                (isUploading || isGenerating) && styles.disabledButton,
              ]}
            >
              {isUploading ? "Uploading..." : "Confirm"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="contain"
          />
          {isGenerating && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#10B981" />
            </View>
          )}
        </View>

        <View style={styles.controls}>
          <Text style={styles.timeText}>
            {(selectedTime / 1000).toFixed(1)}s / {durationInSeconds.toFixed(1)}s
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={videoDuration}
            value={selectedTime}
            onValueChange={setSelectedTime}
            minimumTrackTintColor="#10B981"
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor="#10B981"
            step={100} // 100ms steps
          />
          <Text style={styles.instructions}>
            Drag the slider to select a frame for the thumbnail
          </Text>
        </View>

        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.uploadingText}>Uploading thumbnail...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    fontSize: 16,
    color: "#6B7280",
  },
  confirmButton: {
    fontSize: 16,
    color: "#10B981",
    fontWeight: "600",
  },
  disabledButton: {
    color: "#9CA3AF",
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  timeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  instructions: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  uploadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
