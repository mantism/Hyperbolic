import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { VideoView, useVideoPlayer } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SelectedVideo } from "@hyperbolic/shared-types";

interface VideoDetailsProps {
  video: SelectedVideo;
  onBack: () => void;
  onProceedToUpload: (thumbnailUri: string) => void;
}

export default function VideoDetails({
  video,
  onBack,
  onProceedToUpload,
}: VideoDetailsProps) {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);

  const player = useVideoPlayer(video.uri, (player) => {
    player.loop = true;
    player.play();
  });

  // Generate thumbnail on mount
  useEffect(() => {
    generateThumbnail(video.uri);
  }, [video.uri]);

  const generateThumbnail = async (uri: string) => {
    setGeneratingThumbnail(true);
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
        time: 0, // First frame
        quality: 0.8,
      });
      setThumbnailUri(thumbUri);
    } catch (error) {
      console.error("Failed to generate thumbnail:", error);
      Alert.alert("Error", "Failed to generate thumbnail");
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const handleUpload = () => {
    if (!thumbnailUri) {
      Alert.alert("Please Wait", "Thumbnail is being generated...");
      return;
    }

    onProceedToUpload(thumbnailUri);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Video Preview */}
        <View style={styles.videoPreview}>
          <VideoView
            style={styles.videoPlayer}
            player={player}
            nativeControls
            contentFit="contain"
          />
          <View style={styles.videoInfo}>
            <Text style={styles.videoDetails}>
              {formatDuration(video.duration)}
            </Text>
          </View>
        </View>

        {/* Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>GUIDELINES</Text>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.guidelineText}>
              Show the full trick from start to finish
            </Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.guidelineText}>
              Keep videos under 10 seconds
            </Text>
          </View>
          <View style={styles.guideline}>
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.guidelineText}>No inappropriate content</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!thumbnailUri || generatingThumbnail) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={!thumbnailUri || generatingThumbnail}
        >
          {generatingThumbnail ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Text style={styles.uploadButtonText}>Upload</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  videoPreview: {
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },
  videoPlayer: {
    width: "100%",
    height: 400,
  },
  videoInfo: {
    backgroundColor: "#FFF",
    padding: 12,
  },
  videoDetails: {
    fontSize: 12,
    color: "#666",
  },
  loadingContainer: {
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    borderRadius: 12,
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#FFF",
  },
  guidelines: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  guidelinesTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
    marginBottom: 12,
  },
  guideline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadButton: {
    flex: 2,
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: "#999",
  },
  uploadButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
