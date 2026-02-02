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
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import * as VideoThumbnails from "expo-video-thumbnails";
import VideoTrim, { isValidFile, showEditor } from "react-native-video-trim";
import type { Spec } from "react-native-video-trim";
import Ionicons from "@expo/vector-icons/Ionicons";
import { setSelectedVideo } from "@/lib/stores/selectedVideoStore";

const MAX_VIDEO_DURATION_SECONDS = 10;

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const SPACING = 2;
const THUMBNAIL_SIZE = (width - SPACING * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

interface VideoWithThumbnail extends MediaLibrary.Asset {
  thumbnailUri?: string;
}

export default function SelectVideoScreen() {
  const router = useRouter();

  const [videos, setVideos] = useState<VideoWithThumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const listenersRef = useRef<{ [key: string]: { remove: () => void } }>({});

  // Set up video trim event listeners
  useEffect(() => {
    const NativeVideoTrim = VideoTrim as Spec;

    // Handle successful trim completion
    listenersRef.current.onFinishTrimming = NativeVideoTrim.onFinishTrimming(
      async ({ outputPath, duration }) => {
        // Duration from trimmer is in milliseconds, convert to seconds
        const durationSeconds = duration / 1000;
        const filename = outputPath.split("/").pop() || "trimmed_video.mp4";

        // Generate thumbnail for the selected video
        let thumbnailUri: string | undefined;
        try {
          const thumbnail = await VideoThumbnails.getThumbnailAsync(
            outputPath,
            {
              time: 0,
              quality: 0.7,
            },
          );
          thumbnailUri = thumbnail.uri;
        } catch (error) {
          console.error("Error generating thumbnail:", error);
        }

        // Store the selected video data and go back to log screen
        setSelectedVideo({
          video: {
            uri: outputPath,
            duration: durationSeconds,
            filename,
            isTrimmed: true,
          },
          thumbnailUri: thumbnailUri || null,
        });
        router.back();
      },
    );

    // Handle errors
    listenersRef.current.onError = NativeVideoTrim.onError(
      ({ message, errorCode }) => {
        console.error("Video trim error:", errorCode, message);
        Alert.alert("Error", message || "Failed to process video");
      },
    );

    // Handle user cancel from trimmer (stay on this screen)
    listenersRef.current.onCancel = NativeVideoTrim.onCancel(() => {});

    return () => {
      Object.values(listenersRef.current).forEach((listener) =>
        listener?.remove(),
      );
    };
  }, [router]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your media library to select videos",
          [{ text: "OK", onPress: () => router.back() }],
        );
        setLoading(false);
        return;
      }

      setHasPermission(true);

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.video,
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 100,
      });

      setVideos(media.assets);
      setLoading(false);

      // Generate thumbnails progressively
      generateThumbnails(media.assets);
    } catch (error) {
      console.error("Error loading videos:", error);
      Alert.alert("Error", "Failed to load videos. Please try again.");
      setLoading(false);
    }
  };

  const generateThumbnails = async (assets: MediaLibrary.Asset[]) => {
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      try {
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        if (assetInfo.localUri) {
          const thumbnail = await VideoThumbnails.getThumbnailAsync(
            assetInfo.localUri,
            { time: 0, quality: 0.5 },
          );

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
      }
    }
  };

  const handleVideoPress = async (asset: MediaLibrary.Asset) => {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);

      if (!assetInfo.localUri) {
        Alert.alert("Error", "Could not access video file");
        return;
      }

      const videoUri = assetInfo.localUri;

      const validationResult = await isValidFile(videoUri);
      if (!validationResult.isValid) {
        Alert.alert("Error", "This video format is not supported.");
        return;
      }

      // Show the native video trimmer
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

  const handleClose = () => {
    router.back();
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Select Video</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      ) : !hasPermission ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>
            No permission to access media library
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadVideos}>
            <Text style={styles.retryButtonText}>Request Permission</Text>
          </TouchableOpacity>
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No videos found</Text>
          <Text style={styles.emptySubtext}>
            Record a video of your trick to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
