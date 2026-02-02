import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";

import { TrickVideo } from "@hyperbolic/shared-types";

import { useAuth } from "@/contexts/AuthContext";
import { VideoGallery, VideoPlayerModal } from "@/components/video";
import { getUserVideos } from "@/lib/services/videoService";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function Index() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<TrickVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TrickVideo | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const fetchVideos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const userVideos = await getUserVideos(user.id);
      setVideos(userVideos);
    } catch (error) {
      console.error("Failed to fetch user videos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoPress = (video: TrickVideo) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* TODO: Search bar - placeholder for now */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, tricks..."
            editable={false} // TODO: Implement search functionality
            placeholderTextColor="#999"
          />
        </View>

        {/* User's Recent Videos */}
        {user && (
          <View style={styles.videoSection}>
            {videos.length > 0 ? (
              <VideoGallery
                title={"Your Recent Videos"}
                videos={videos}
                onVideoPress={handleVideoPress}
                showMetadata={true}
                showDeleteOption={true}
                onVideoDeleted={fetchVideos}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="videocam-off-outline" size={64} color="#CCC" />
                <Text style={styles.emptyText}>No videos yet</Text>
                <Text style={styles.emptySubtext}>
                  Upload your first video to track your progress
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TODO: Feed section will go here in the future */}
        <View style={styles.todoSection}>
          <Text style={styles.todoText}>
            {/* Feed content coming soon... */}
          </Text>
        </View>
      </ScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={showVideoPlayer}
        video={selectedVideo}
        onClose={handleCloseVideoPlayer}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  videoSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  todoSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  todoText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});
