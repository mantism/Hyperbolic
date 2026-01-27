import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ComboVideo, SequenceItem, UserCombo } from "@hyperbolic/shared-types";
import { useAuth } from "@/contexts/AuthContext";
import ComboRenderer from "./ComboRenderer";
import ComboComposer from "./ComboComposer";
import VideoHero from "./VideoHero";
import SurfaceBadges from "./SurfaceBadges";
import { useTricks } from "@/contexts/TricksContext";
import { useRouter } from "expo-router";
import VideoGallery from "./VideoGallery";
import { getComboVideos } from "@/lib/services/videoService";
import {
  renameUserCombo,
  updateUserComboGraph,
} from "@/lib/services/userComboService";
import {
  comboGraphToSequence,
  sequenceToComboGraph,
} from "@/lib/utils/comboRendering";
import VideoPlayerModal from "./VideoPlayerModal";

interface ComboDetailPageProps {
  combo: UserCombo;
  onClose: () => void;
  onComboUpdated?: (updatedCombo: UserCombo) => void;
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function ComboDetailPage({
  combo,
  onClose,
  onComboUpdated,
}: ComboDetailPageProps) {
  const { user } = useAuth();
  const { allTricks } = useTricks();
  const router = useRouter();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(combo.name);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const [showLogModal, setShowLogModal] = useState(false);
  const [videos, setVideos] = useState<ComboVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<ComboVideo | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [videoTab, setVideoTab] = useState<"my" | "community">("my");
  const [loadingVideos, setLoadingVideos] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Edit handlers
  const handleEditNamePress = () => {
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      Alert.alert("Error", "Combo name cannot be empty");
      return;
    }
    if (editedName === combo.name) {
      setIsEditingName(false);
      return;
    }
    try {
      setIsSaving(true);
      const updatedCombo = await renameUserCombo(combo.id, editedName.trim());
      onComboUpdated?.(updatedCombo);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error renaming combo:", error);
      Alert.alert("Error", "Failed to rename combo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelNameEdit = () => {
    setEditedName(combo.name);
    setIsEditingName(false);
  };

  const handleEditComboPress = () => {
    setIsEditing(true);
  };

  const handleSaveComboEdit = async (sequence: SequenceItem[]) => {
    try {
      setIsSaving(true);
      const comboGraph = sequenceToComboGraph(sequence);
      const updatedCombo = await updateUserComboGraph(combo.id, comboGraph);
      onComboUpdated?.(updatedCombo);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating combo:", error);
      Alert.alert("Error", "Failed to update combo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelComboEdit = () => {
    setIsEditing(false);
  };

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
    router.push({
      pathname: "/upload-video/[id]",
      params: { id: combo.id, name: combo.name, type: "combo" },
    });
  };

  const handlePlayVideo = (video: ComboVideo) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  const handleTrickPress = (trickId: string) => {
    const trick = allTricks.find((t) => t.id === trickId);
    if (trick) {
      router.push(`/trick/${trickId}`);
    }
  };

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const fetchedVideos = await getComboVideos(combo.id);
      setVideos(fetchedVideos);
    } catch (error) {
      console.error("Error fetching combo videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  }, [user, videoTab, combo.id]);

  useEffect(() => {
    if (user) {
      fetchVideos();
    } else {
      setLoadingVideos(false);
    }
  }, [user, combo.id, fetchVideos]);

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
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* Transparent spacer */}
        <View style={styles.videoSpacer} />

        <View style={styles.content}>
          <View style={styles.comboInfo}>
            {/* Editable combo name */}
            <View style={styles.comboNameRow}>
              {isEditingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    ref={nameInputRef}
                    style={styles.nameInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    onSubmitEditing={handleSaveName}
                    onBlur={handleCancelNameEdit}
                    autoFocus
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    onPress={handleSaveName}
                    disabled={isSaving}
                    style={styles.nameEditButton}
                  >
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={isSaving ? "#999" : "#10B981"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancelNameEdit}
                    style={styles.nameEditButton}
                  >
                    <Ionicons name="close" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.comboName}>{combo.name}</Text>
                  <TouchableOpacity
                    onPress={handleEditNamePress}
                    style={styles.editNameButton}
                    hitSlop={8}
                  >
                    <Ionicons name="pencil-outline" size={18} color="#999" />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Combo renderer with edit button */}
            <View style={styles.comboRendererWrapper}>
              {isEditing ? (
                <ComboComposer
                  initialSequence={comboGraphToSequence(combo.comboGraph)}
                  onSave={handleSaveComboEdit}
                  onCancel={handleCancelComboEdit}
                  saving={isSaving}
                  saveButtonText="Update Combo"
                />
              ) : (
                <>
                  <View style={styles.comboRendererContainer}>
                    <ComboRenderer
                      combo={combo.comboGraph}
                      onTrickPress={handleTrickPress}
                    />
                  </View>
                  {user && (
                    <TouchableOpacity
                      onPress={handleEditComboPress}
                      style={styles.editComboButton}
                    >
                      <Ionicons name="pencil" size={14} color="#666" />
                    </TouchableOpacity>
                  )}
                </>
              )}
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
          <View style={styles.videoSection}>
            <View style={styles.videoTabs}>
              <TouchableOpacity
                style={[
                  styles.videoTab,
                  videoTab === "my" && styles.videoTabActive,
                ]}
                onPress={() => setVideoTab("my")}
              >
                <Text
                  style={[
                    styles.videoTabText,
                    videoTab === "my" && styles.videoTabTextActive,
                  ]}
                >
                  My Videos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.videoTab,
                  videoTab === "community" && styles.videoTabActive,
                ]}
                onPress={() => setVideoTab("community")}
              >
                <Text
                  style={[
                    styles.videoTabText,
                    videoTab === "community" && styles.videoTabTextActive,
                  ]}
                >
                  Community
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Video Gallery */}
          {loadingVideos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : (
            <VideoGallery
              videos={videos}
              onVideoPress={handlePlayVideo}
              onVideoDeleted={fetchVideos}
              showDeleteOption={videoTab === "my"}
            />
          )}

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
  comboNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  comboName: {
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  editNameButton: {
    padding: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
  },
  nameEditContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    letterSpacing: -0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#007AFF",
    paddingVertical: 4,
  },
  nameEditButton: {
    padding: 4,
  },
  comboRendererWrapper: {
    position: "relative",
  },
  comboRendererContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    elevation: 1,
  },
  editComboButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
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
  videoSection: {
    marginTop: 24,
  },
  videoTabs: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  videoTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  videoTabActive: {
    backgroundColor: "#000",
  },
  videoTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  videoTabTextActive: {
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // TODO: Add styles for action buttons
  // actionsRow: {},
  // stompButton: {},
  // stompButtonText: {},
  // attemptButton: {},
  // attemptButtonText: {},
});
