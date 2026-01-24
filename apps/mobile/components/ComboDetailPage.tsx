import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ComboVideo, UserCombo } from "@hyperbolic/shared-types";
import { useAuth } from "@/contexts/AuthContext";
import ComboRenderer from "./ComboRenderer";
import VideoHero from "./VideoHero";
import SurfaceBadges from "./SurfaceBadges";
import { useTricks } from "@/contexts/TricksContext";
import { useRouter } from "expo-router";

interface ComboDetailPageProps {
  combo: UserCombo;
  onClose: () => void;
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function ComboDetailPage({
  combo,
  onClose,
}: ComboDetailPageProps) {
  const { user } = useAuth();
  const { allTricks } = useTricks();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [videos, setVideos] = useState<ComboVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ComboVideo | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // TODO: Add handler for toggling edit mode
  // const handleEditPress = () => setIsEditing(true);

  // TODO: Add handler for saving edits (will need to call updateUserComboGraph)

  // TODO: Add handler for canceling edits

  // TODO: Add handler for deleting combo

  // TODO: Add handler for logging attempt/stomp

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert("Share", "Share functionality coming soon!");
  };

  const handleLogPress = () => {
    setShowLogModal(true);
  };

  const handleUploadVideo = () => {
    Alert.alert("Upload Video", "Video upload functionality coming soon!");
  };

  const handlePlayVideo = (video: ComboVideo) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleTrickPress = (trickId: string) => {
    const trick = allTricks.find((t) => t.id === trickId);
    if (trick) {
      router.push(`/trick/${trickId}`);
    }
  };

  const featuredVideo = videos.length > 0 ? videos[0] : null;

  // TODO: Build out complexity calculation in backend service
  const getComboComplexity = () => {
    return combo.comboGraph.tricks.length;
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={20} color="#000" />
      </TouchableOpacity>

      {/* Right side action buttons */}
      <View style={styles.rightFabs}>
        <TouchableOpacity
          style={styles.fabSmall}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Ionicons name="share-outline" size={18} color="#000" />
        </TouchableOpacity>

        {user && (
          <>
            <TouchableOpacity
              style={styles.fabSmall}
              onPress={handleLogPress}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabSmall}
              onPress={handleUploadVideo}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam-outline" size={18} color="#000" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Video Hero - not clickable, just visual */}
      <View style={styles.videoHeroWrapper}>
        <VideoHero video={featuredVideo} scrollY={scrollY} />
        {/* Dim overlay that appears on scroll */}
        <Animated.View
          style={[
            styles.videoDimOverlay,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 200],
                outputRange: [0, 0.6],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
      </View>

      {/* Sticky Header - appears when scrolling */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            opacity: scrollY.interpolate({
              inputRange: [150, 250],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [200, 250],
                  outputRange: [-20, 0],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.stickyHeaderTitle}>{combo.name}</Text>
        <View style={styles.comboRendererContainer}>
          {/* TODO: When isEditing, render ComboComposer instead */}
          <ComboRenderer
            combo={combo.comboGraph}
            onTrickPress={handleTrickPress}
          />
        </View>
      </Animated.View>
      {/* Play button overlaying the VideoHero */}
      {featuredVideo && (
        <Animated.View
          style={[
            styles.playButton,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0],
                extrapolate: "clamp",
              }),
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              handlePlayVideo(featuredVideo);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.playButtonInner}>
              <Ionicons name="play" size={32} color="#FFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      <AnimatedScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Transparent spacer */}
        <View style={styles.videoSpacer} />

        <View style={styles.content}>
          <View style={styles.comboInfo}>
            <Text style={styles.comboName}>{combo.name}</Text>
            <View style={styles.comboRendererContainer}>
              {/* TODO: When isEditing, render ComboComposer instead */}
              <ComboRenderer
                combo={combo.comboGraph}
                onTrickPress={handleTrickPress}
              />
            </View>
          </View>
          {/* Stats section */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {combo.comboGraph.tricks.length}
              </Text>
              <Text style={styles.statLabel}>tricks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{combo.attempts ?? 0}</Text>
              <Text style={styles.statLabel}>attempts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{combo.stomps ?? 0}</Text>
              <Text style={styles.statLabel}>stomps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{getComboComplexity()}</Text>
              <Text style={styles.statLabel}>complexity</Text>
            </View>
          </View>

          <SurfaceBadges
            landedSurfaces={combo.landedSurfaces || []}
            showTitle
            interactive
            emptyMessage="Log the combo in detail to earn a surface badge for this combo."
          />

          {/* TODO: Action buttons (STOMP / ATTEMPT) */}
          {/*
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.stompButton}>
              <Text style={styles.stompButtonText}>STOMP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attemptButton}>
              <Text style={styles.attemptButtonText}>ATTEMPT</Text>
            </TouchableOpacity>
          </View>
          */}

          {/* TODO: Combo logs section (similar to TrickLogs) */}

          {/* TODO: Delete combo button */}
        </View>
      </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  fab: {
    position: "absolute",
    top: 64,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rightFabs: {
    position: "absolute",
    top: 64,
    right: 16,
    flexDirection: "row",
    gap: 12,
    zIndex: 1000,
  },
  fabSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  content: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 500,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  comboInfo: {
    paddingBottom: 16,
  },
  comboName: {
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  comboRendererContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    elevation: 1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 24,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "#E5E5E5",
  },
  videoHeroWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    zIndex: 1,
  },
  videoDimOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  videoSpacer: {
    height: 336, // VideoHero height (360) - overlap (24)
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FAFAFA",
    paddingTop: 110, // Space for FABs
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 999,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    display: "flex",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stickyHeaderTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    letterSpacing: -0.5,
  },
  playButton: {
    position: "absolute",
    top: 150, // Center vertically in VideoHero visible area
    left: "50%",
    marginLeft: -40, // Half of button size for centering
    zIndex: 100,
  },
  playButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  // TODO: Add styles for action buttons
  // actionsRow: {},
  // stompButton: {},
  // stompButtonText: {},
  // attemptButton: {},
  // attemptButtonText: {},
});
