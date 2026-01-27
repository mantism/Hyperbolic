import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as VideoThumbnails from "expo-video-thumbnails";
import VideoTrim, { isValidFile, showEditor } from "react-native-video-trim";
import type { Spec } from "react-native-video-trim";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SelectedVideo } from "@hyperbolic/shared-types";

const MAX_VIDEO_DURATION_SECONDS = 10;

interface MediaSelectorProps {
  onVideoSelected: (video: SelectedVideo) => void;
  onCancel: () => void;
}

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const SPACING = 2;
const THUMBNAIL_SIZE = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

interface VideoWithThumbnail extends MediaLibrary.Asset {
  thumbnailUri?: string;
}

export default function MediaSelector({
  onVideoSelected,
  onCancel,
}: MediaSelectorProps) {
  const [videos, setVideos] = useState<VideoWithThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [loadingThumbnails, setLoadingThumbnails] = useState(false);
  const listenersRef = useRef<{ [key: string]: { remove: () => void } }>({});

  // Set up video trim event listeners
  useEffect(() => {
    const NativeVideoTrim = VideoTrim as Spec;

    // Handle successful trim completion
    listenersRef.current.onFinishTrimming = NativeVideoTrim.onFinishTrimming(
      ({ outputPath, duration }) => {
        // Duration from trimmer is in milliseconds, convert to seconds
        const durationSeconds = duration / 1000;
        const filename = outputPath.split("/").pop() || "trimmed_video.mp4";

        onVideoSelected({
          uri: outputPath,
          duration: durationSeconds,
          filename,
          isTrimmed: true,
        });
      },
    );

    // Handle errors
    listenersRef.current.onError = NativeVideoTrim.onError(
      ({ message, errorCode }) => {
        console.error("Video trim error:", errorCode, message);
        Alert.alert("Error", message || "Failed to process video");
      },
    );

    // Handle user cancel
    listenersRef.current.onCancel = NativeVideoTrim.onCancel(() => {});

    return () => {
      // Cleanup listeners
      Object.values(listenersRef.current).forEach((listener) =>
        listener?.remove(),
      );
    };
  }, [onVideoSelected]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your media library to select videos",
          [{ text: "OK", onPress: onCancel }],
        );
        setLoading(false);
        return;
      }

      setHasPermission(true);

      // Fetch videos from media library
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 100, // Load first 100 videos
      });

      // Show videos immediately without thumbnails
      setVideos(media.assets);
      setLoading(false);

      // Generate thumbnails progressively
      setLoadingThumbnails(true);
      generateThumbnails(media.assets);
    } catch (error) {
      console.error("Error loading videos:", error);
      Alert.alert("Error", "Failed to load videos. Please try again.");
      setLoading(false);
    }
  };

  const generateThumbnails = async (assets: MediaLibrary.Asset[]) => {
    // Generate thumbnails in batches for better performance
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        if (assetInfo.localUri) {
          // Generate thumbnail from first frame
          const thumbnail = await VideoThumbnails.getThumbnailAsync(
            assetInfo.localUri,
            {
              time: 0, // First frame
              quality: 0.5,
            },
          );

          // Update this specific video with its thumbnail
          setVideos((prevVideos) =>
            prevVideos.map((v) =>
              v.id === asset.id ? { ...v, thumbnailUri: thumbnail.uri } : v,
            ),
          );
        }
      } catch (error) {
        console.error(
          `Error generating thumbnail for video ${asset.id}:`,
          error,
        );
        // Continue with next video even if this one fails
      }
    }
    setLoadingThumbnails(false);
  };

  const handleVideoPress = async (asset: MediaLibrary.Asset) => {
    try {
      // Get full asset info to access the file
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);

      if (!assetInfo.localUri) {
        Alert.alert("Error", "Could not access video file");
        return;
      }

      const videoUri = assetInfo.localUri;

      // Validate video format
      const validationResult = await isValidFile(videoUri);
      if (!validationResult.isValid) {
        Alert.alert("Error", "This video format is not supported.");
        return;
      }

      // Always show the native video trimmer so users can optionally trim
      showEditor(videoUri, {
        maxDuration: MAX_VIDEO_DURATION_SECONDS,
        minDuration: 1,
        saveToPhoto: false,
        removeAfterSavedToPhoto: false,
        enableSaveDialog: false,
        trimmingText: "Trimming...",
        fullScreenModalIOS: true,
      });
    } catch (error) {
      console.error("Error selecting video:", error);
      Alert.alert("Error", "Failed to select video. Please try again.");
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs}s`;
  };

  const renderVideoItem = ({ item }: { item: VideoWithThumbnail }) => (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => handleVideoPress(item)}
      activeOpacity={0.7}
    >
      {item.thumbnailUri ? (
        <Image
          source={{ uri: item.thumbnailUri }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
      </View>
      <View style={styles.videoIcon}>
        <Ionicons name="play" size={24} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="lock-closed-outline" size={64} color="#CCC" />
        <Text style={styles.emptyText}>
          No permission to access media library
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
          <Text style={styles.retryButtonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-outline" size={64} color="#CCC" />
        <Text style={styles.emptyText}>No videos found</Text>
        <Text style={styles.emptySubtext}>
          Record a video of your trick to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Video Grid */}
      <FlatList
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={(item) => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  gridContent: {
    padding: SPACING,
  },
  videoItem: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    margin: SPACING,
    position: "relative",
    backgroundColor: "#000",
    borderRadius: 4,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  videoIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FAFAFA",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
