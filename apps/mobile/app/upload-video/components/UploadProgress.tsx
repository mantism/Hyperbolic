import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { File } from "expo-file-system";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Database } from "@hyperbolic/shared-types";
import { uploadVideo, uploadThumbnail } from "@/lib/services/videoService";

type Trick = Database["public"]["Tables"]["Tricks"]["Row"];

interface UploadProgressProps {
  trick: Trick;
  video: MediaLibrary.Asset;
  thumbnailUri: string;
  userId: string;
  onComplete: () => void;
}

export default function UploadProgress({
  trick,
  video,
  thumbnailUri,
  userId,
  onComplete,
}: UploadProgressProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "uploading_video" | "uploading_thumbnail" | "complete" | "error"
  >("uploading_video");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    startUpload();
  }, []);

  const startUpload = async () => {
    try {
      // Get video file info
      const assetInfo = await MediaLibrary.getAssetInfoAsync(video);

      if (!assetInfo.localUri) {
        throw new Error("Could not access video file");
      }

      const file = new File(assetInfo.localUri);
      const fileSize = await file.size;

      setUploadStatus("uploading_video");

      // Upload video
      const videoId = await uploadVideo(
        assetInfo.localUri,
        video.filename || "video.mp4",
        fileSize,
        video.mediaType === "video" ? "video/mp4" : "video/mp4",
        trick.id,
        userId,
        video.duration,
        (progress) => {
          setUploadProgress(Math.round(progress));
        }
      );

      setUploadStatus("uploading_thumbnail");
      setUploadProgress(0);

      // Upload thumbnail
      await uploadThumbnail(videoId, thumbnailUri);

      setUploadStatus("complete");
      setUploadProgress(100);

      // Wait a moment to show success, then complete
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setErrorMessage(error.message || "Failed to upload video");
      Alert.alert(
        "Upload Failed",
        "Failed to upload video. Please try again.",
        [{ text: "OK", onPress: onComplete }]
      );
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case "uploading_video":
        return "Uploading video...";
      case "uploading_thumbnail":
        return "Uploading thumbnail...";
      case "complete":
        return "Upload complete!";
      case "error":
        return errorMessage || "Upload failed";
      default:
        return "Uploading...";
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading_video":
      case "uploading_thumbnail":
        return null;
      case "complete":
        return <Ionicons name="checkmark-circle" size={64} color="#10B981" />;
      case "error":
        return <Ionicons name="close-circle" size={64} color="#EF4444" />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {getStatusIcon() || <ActivityIndicator size="large" color="#000" />}

        <Text style={styles.statusMessage}>{getStatusMessage()}</Text>

        {/* Progress Bar */}
        {(uploadStatus === "uploading_video" ||
          uploadStatus === "uploading_thumbnail") && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{uploadProgress}%</Text>
          </View>
        )}

        {/* Trick Info */}
        <View style={styles.trickInfo}>
          <Text style={styles.trickName}>{trick.name}</Text>
          <Text style={styles.trickDescription}>
            {uploadStatus === "complete"
              ? "Your video has been uploaded successfully!"
              : "Please wait while we upload your video"}
          </Text>
        </View>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  statusMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginTop: 24,
    marginBottom: 32,
    textAlign: "center",
  },
  progressContainer: {
    width: "100%",
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E5E5",
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#000",
  },
  progressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  trickInfo: {
    alignItems: "center",
  },
  trickName: {
    fontSize: 24,
    fontWeight: "300",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  trickDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
