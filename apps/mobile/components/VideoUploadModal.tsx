import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { uploadVideo } from "@/lib/services/videoUploadService";
import { Database } from "@hyperbolic/shared-types";
import { VideoThumbnailSelector } from "./VideoThumbnailSelector";

type Trick = Database["public"]["Tables"]["Tricks"]["Row"];

interface VideoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  trick: Trick;
  userId: string;
}

export default function VideoUploadModal({
  visible,
  onClose,
  trick,
  userId,
}: VideoUploadModalProps) {
  const [selectedVideo, setSelectedVideo] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [showThumbnailSelector, setShowThumbnailSelector] = useState(false);

  const player = useVideoPlayer(selectedVideo?.uri ?? "", (player) => {
    player.loop = false;
    player.pause();
  });

  // Update player source when video changes
  useEffect(() => {
    if (selectedVideo?.uri) {
      player.replaceAsync(selectedVideo.uri).then(() => {
        player.pause();
      });
    }
  }, [selectedVideo?.uri]);

  const handleSelectVideo = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your media library to select videos"
        );
        return;
      }

      // Launch video picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 10, // 10 seconds max
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];

      // Validate video
      if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) {
        Alert.alert("File Too Large", "Video must be less than 100MB");
        return;
      }

      if (asset.duration && asset.duration > 10000) {
        Alert.alert("Video Too Long", "Video must be less than 10 seconds");
        return;
      }

      setSelectedVideo(asset);
    } catch (error) {
      console.error("Error selecting video:", error);
      Alert.alert("Error", "Failed to select video. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      Alert.alert("No Video", "Please select a video first");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const videoId = await uploadVideo(
        selectedVideo.uri,
        selectedVideo.fileName || "video.mp4",
        selectedVideo.fileSize || 0,
        selectedVideo.mimeType || "video/mp4",
        trick.id,
        userId,
        selectedVideo.duration || 0,
        (progress) => {
          setUploadProgress(Math.round(progress));
        }
      );

      // Show thumbnail selector after successful upload
      setUploadedVideoId(videoId);
      setShowThumbnailSelector(true);
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Failed to upload video. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailComplete = (thumbnailUrl: string) => {
    setShowThumbnailSelector(false);
    Alert.alert("Success", "Video and thumbnail uploaded successfully!");
    setSelectedVideo(null);
    setUploadProgress(0);
    setUploadedVideoId(null);
    onClose();
  };

  const handleThumbnailCancel = () => {
    setShowThumbnailSelector(false);
    Alert.alert("Success", "Video uploaded successfully!");
    setSelectedVideo(null);
    setUploadProgress(0);
    setUploadedVideoId(null);
    onClose();
  };

  const handleRemoveVideo = () => {
    setSelectedVideo(null);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";

    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDuration = (milliseconds?: number): string => {
    if (!milliseconds) return "Unknown duration";

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}s`;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Upload Video</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Trick Info */}
          <View style={styles.trickInfo}>
            <Text style={styles.trickName}>{trick.name}</Text>
            <Text style={styles.trickDescription}>
              Share your execution of this trick
            </Text>
          </View>

          {/* Video Selection Area */}
          {!selectedVideo ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleSelectVideo}
            >
              <Ionicons name="videocam-outline" size={48} color="#999" />
              <Text style={styles.uploadText}>Tap to select video</Text>
              <Text style={styles.uploadSubtext}>
                MP4 or MOV • Max 100MB • Up to 10 seconds
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.videoPreview}>
              <VideoView
                style={styles.videoPlayer}
                player={player}
                fullscreenOptions={{
                  enable: true,
                }}
                allowsPictureInPicture
                nativeControls
                contentFit="cover"
              />
              <View style={styles.videoInfo}>
                <Text style={styles.videoName}>
                  {selectedVideo.fileName || "Selected Video"}
                </Text>
                <Text style={styles.videoDetails}>
                  {formatDuration(selectedVideo.duration ?? undefined)} •{" "}
                  {formatFileSize(selectedVideo.fileSize)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveVideo}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          {/* Upload Progress */}
          {uploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}

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
                Ensure good lighting and video quality
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
              (!selectedVideo || uploading) && styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={!selectedVideo || uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Thumbnail Selector Modal */}
    {showThumbnailSelector && selectedVideo && uploadedVideoId && (
      <VideoThumbnailSelector
        visible={showThumbnailSelector}
        videoUri={selectedVideo.uri}
        videoId={uploadedVideoId}
        videoDuration={selectedVideo.duration || 0}
        onComplete={handleThumbnailComplete}
        onCancel={handleThumbnailCancel}
      />
    )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  trickInfo: {
    marginBottom: 24,
  },
  trickName: {
    fontSize: 24,
    fontWeight: "300",
    color: "#000",
    marginBottom: 4,
  },
  trickDescription: {
    fontSize: 14,
    color: "#666",
  },
  uploadArea: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
    padding: 48,
    alignItems: "center",
    marginBottom: 24,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  videoPreview: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    position: "relative",
  },
  videoPlayer: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  videoInfo: {
    marginTop: 12,
  },
  videoName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
  },
  videoDetails: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  guidelines: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  uploadButton: {
    backgroundColor: "#000",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
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
