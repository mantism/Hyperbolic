import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TrickVideo } from "@hyperbolic/shared-types";
import { deleteVideo } from "@/lib/services/videoService";

interface VideoGalleryProps {
  title?: string;
  videos: TrickVideo[];
  onVideoPress?: (video: TrickVideo) => void;
  onVideoDeleted?: () => void;
  showDeleteOption?: boolean; // Only allow delete for user's own videos
  showMetadata?: boolean; // Show trick name and upload date below thumbnail
}

export default function VideoGallery({
  title,
  videos,
  onVideoPress,
  onVideoDeleted,
  showDeleteOption = false,
  showMetadata = false,
}: VideoGalleryProps) {
  const handleLongPress = (video: TrickVideo) => {
    if (!showDeleteOption) return;

    Alert.alert(
      "Delete Video",
      "Are you sure you want to delete this video? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteVideo(video.id);
              onVideoDeleted?.();
              Alert.alert("Success", "Video deleted successfully");
            } catch (error) {
              console.error("Failed to delete video:", error);
              Alert.alert(
                "Error",
                error instanceof Error
                  ? error.message
                  : "Failed to delete video"
              );
            }
          },
        },
      ]
    );
  };

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="videocam-off-outline" size={48} color="#CCC" />
        <Text style={styles.emptyText}>No videos yet</Text>
        <Text style={styles.emptySubtext}>
          Upload your first video to track your progress
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title ?? "VIDEOS"}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {videos.map((video) => (
          <View
            key={video.id}
            style={showMetadata ? styles.videoCardContainer : undefined}
          >
            <TouchableOpacity
              style={styles.videoCard}
              onPress={() => onVideoPress?.(video)}
              onLongPress={() => handleLongPress(video)}
              activeOpacity={0.8}
            >
              {video.thumbnail_url ? (
                <Image
                  source={{ uri: video.thumbnail_url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderThumbnail}>
                  <Ionicons name="videocam-outline" size={32} color="#999" />
                </View>
              )}

              {/* Play button overlay */}
              <View style={styles.playOverlay}>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={20} color="#FFF" />
                </View>
              </View>

              {/* Upload status indicator */}
              {video.upload_status === "processing" && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Processing...</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Metadata section */}
            {showMetadata && (
              <View style={styles.metadataContainer}>
                {video.trick_name && (
                  <Link
                    href={{
                      pathname: "/trick/[id]",
                      params: { id: video.trick_id },
                    }}
                  >
                    <Text style={styles.trickName} numberOfLines={1}>
                      {video.trick_name}
                    </Text>
                  </Link>
                )}
                {video.created_at && (
                  <Text style={styles.uploadDate} numberOfLines={1}>
                    {formatUploadDate(video.created_at)}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function formatUploadDate(dateString: string | null): string {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Format as "Dec 9, 2025"
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  videoCardContainer: {
    width: 108,
  },
  videoCard: {
    width: 108,
    height: 192,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
    position: "relative",
  },
  metadataContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  trickName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  uploadDate: {
    fontSize: 11,
    color: "#666",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  placeholderThumbnail: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E5E5E5",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 2, // Optical alignment
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
});
