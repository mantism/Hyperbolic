import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Animated,
  ScrollView,
} from "react-native";

import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/lib/supabase/supabase";
import { TrickVideo, Trick, UserTrick } from "@hyperbolic/shared-types";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import {
  getUserTrick,
  updateUserTrickStats,
  upsertUserTrick,
  deleteUserTrick,
} from "@/lib/services/userTrickService";
import {
  getTrickTier,
  getTierColor,
  TrickTier,
  getProgressToNextTier,
  getTierName,
} from "@/lib/trickProgressTiers";
import Ionicons from "@expo/vector-icons/Ionicons";
import TrickProgressionGraph from "./TrickProgressionGraph";
import TrickLogs from "./TrickLogs";
import TrickLogModal from "./TrickLogModal";
import { CircularProgress, SurfaceBadges } from "@/components/ui";
import { VideoHero, VideoGallery, VideoPlayerModal } from "@/components/video";
import { getTrickVideos } from "@/lib/services/videoService";

interface TrickDetailPageProps {
  trick: Trick;
  onClose: () => void;
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function TrickDetailPage({
  trick,
  onClose,
}: TrickDetailPageProps) {
  const { user } = useAuth();
  const { activeSession } = useSession();
  const router = useRouter();
  const [userTrick, setUserTrick] = useState<UserTrick | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showLogModal, setShowLogModal] = useState(false);

  // Video states
  const [videos, setVideos] = useState<TrickVideo[]>([]);
  const [videoTab, setVideoTab] = useState<"my" | "community">("my");
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TrickVideo | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Form states
  const [attempts, setAttempts] = useState(0);
  const [stomps, setStomps] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [isGoal, setIsGoal] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);

  // Get trick tier for subtle accent styling
  const userStomps = userTrick?.stomps || 0;
  const trickTier = getTrickTier(userStomps);
  const tierColor =
    trickTier === TrickTier.NONE ? "#E5E5E5" : getTierColor(trickTier);

  // Calculate progress to next tier
  const tierProgress = getProgressToNextTier(userStomps, trickTier);
  const nextTierName = tierProgress.nextTier
    ? getTierName(tierProgress.nextTier)
    : null;
  const nextTierColor = tierProgress.nextTier
    ? getTierColor(tierProgress.nextTier)
    : tierColor;

  const fetchUserTrick = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getUserTrick(user.id, trick.id);

      if (data) {
        setUserTrick(data);
        setAttempts(data.attempts || 0);
        setStomps(data.stomps || 0);
        setUserRating(data.rating || 0);
        setIsGoal(data.isGoal || false);
      } else {
        // No UserTrick exists yet
        setUserTrick(null);
        setAttempts(0);
        setStomps(0);
        setUserRating(0);
        setIsGoal(false);
      }
    } catch (error) {
      console.error("Error fetching user trick:", error);
      Alert.alert("Error", "Failed to load trick data");
    } finally {
      setLoading(false);
    }
  }, [user, trick.id]);

  const fetchVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const userId = videoTab === "my" && user ? user.id : undefined;
      const fetchedVideos = await getTrickVideos(trick.id, userId);
      setVideos(fetchedVideos);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  }, [user, trick.id, videoTab]);

  useEffect(() => {
    if (user) {
      fetchUserTrick();
      fetchVideos();
    } else {
      setLoading(false);
    }
  }, [user, trick.id, fetchUserTrick]);

  // Refetch videos when tab changes
  useEffect(() => {
    if (user) {
      fetchVideos();
    }
  }, [videoTab]);

  // TODO: Add useFocusEffect to refresh videos when returning from upload page

  // Set up realtime subscription for this user's trick data
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-trick-${user.id}-${trick.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "UserToTricks",
          filter: `userID=eq.${user.id},trickID=eq.${trick.id}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            const newData = payload.new as UserTrick;
            setUserTrick(newData);
            setAttempts(newData.attempts || 0);
            setStomps(newData.stomps || 0);
            setUserRating(newData.rating || 0);
            setIsGoal(newData.isGoal || false);
          } else if (payload.eventType === "DELETE") {
            setUserTrick(null);
            setAttempts(0);
            setStomps(0);
            setUserRating(0);
            setIsGoal(false);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, trick.id]);

  // Auto-save helper function
  const autoSave = useCallback(
    async (
      newAttempts: number,
      newStomps: number,
      newRating: number,
      newIsGoal: boolean,
    ) => {
      if (!user) return;

      try {
        const landed = newStomps > 0;

        // Use upsert service to create or update
        const data = await upsertUserTrick(user.id, trick.id, {
          attempts: newAttempts,
          stomps: newStomps,
          landed,
          rating: newRating || null,
          isGoal: newIsGoal,
        });

        // Update the userTrick state with the latest data
        setUserTrick(data);
      } catch (error: any) {
        console.error("Error auto-saving:", error);
        // Revert the optimistic update on error
        Alert.alert("Sync Error", "Failed to save changes. Please try again.");
      }
    },
    [user, trick.id],
  );

  // Debounced increment functions to prevent rapid clicks creating duplicates
  const incrementAttemptsDebounced = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const incrementStompsDebounced = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const incrementAttempts = () => {
    // Clear any pending debounce
    if (incrementAttemptsDebounced.current) {
      clearTimeout(incrementAttemptsDebounced.current);
    }

    // Optimistic update immediately for UI responsiveness
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Debounce the actual save
    incrementAttemptsDebounced.current = setTimeout(() => {
      autoSave(newAttempts, stomps, userRating, isGoal);
    }, 300);
  };

  const incrementStomps = () => {
    // Clear any pending debounce
    if (incrementStompsDebounced.current) {
      clearTimeout(incrementStompsDebounced.current);
    }

    // Optimistic update immediately for UI responsiveness
    const newStomps = stomps + 1;
    setStomps(newStomps);

    // Debounce the actual save
    incrementStompsDebounced.current = setTimeout(() => {
      autoSave(attempts, newStomps, userRating, isGoal);
    }, 300);
  };

  const updateRating = async (rating: number) => {
    setUserRating(rating); // Optimistic update
    await autoSave(attempts, stomps, rating, isGoal);
  };

  const toggleGoal = async () => {
    const newIsGoal = !isGoal;
    setIsGoal(newIsGoal); // Optimistic update
    await autoSave(attempts, stomps, userRating, newIsGoal);
  };

  const handleTrickNavigation = (selectedTrick: Trick) => {
    router.push(`/trick/${selectedTrick.id}`);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert("Share", "Share functionality coming soon!");
  };

  const handleLogPress = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to log tricks");
      return;
    }
    // TODO: Remove this restriction, allow logging attempts even if trick not yet tracked
    // this will start tracking the trick for the user
    if (!userTrick) {
      Alert.alert(
        "Mark as Landed",
        "Log this trick as landed first by recording an attempt or stomp",
      );
      return;
    }
    setShowLogModal(true);
  };

  const handleUploadVideo = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to upload videos");
      return;
    }
    router.push({
      pathname: "/upload-video/[id]",
      params: { id: trick.id, name: trick.name, type: "trick" },
    });
  };

  const handlePlayVideo = (video: TrickVideo) => {
    setSelectedVideo(video);
    setShowVideoPlayer(true);
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  const removeFromTricks = async () => {
    if (!userTrick) {
      return;
    }

    Alert.alert(
      "Remove Trick",
      `Are you sure you want to clear your progress on ${trick.name}? This will remove it from your tracked tricks.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteUserTrick(userTrick.id);

              setUserTrick(null);
              setAttempts(0);
              setStomps(0);
              setUserRating(0);
              setIsGoal(false);
              Alert.alert("Success", "Trick removed from your tracked tricks");
            } catch (error) {
              console.error("Error removing trick:", error);
              Alert.alert("Error", "Failed to remove trick");
            }
          },
        },
      ],
    );
  };

  // Calculate success rate - if no attempts but has stomps, treat as 100%
  const successRate =
    userTrick?.stomps && userTrick.stomps > 0
      ? userTrick.attempts && userTrick.attempts > 0
        ? Math.round((userTrick.stomps / userTrick.attempts) * 100)
        : 100
      : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  const featuredVideo = videos.length > 0 ? videos[0] : null;

  const inlineStats = () => {
    return (
      <View style={styles.inlineStats}>
        <View style={styles.inlineStat}>
          <Text style={styles.inlineStatValue}>{userTrick?.stomps || 0}</Text>
          <Text style={styles.inlineStatLabel}>stomps</Text>
        </View>
        <View style={[styles.inlineStatDivider, { backgroundColor: "#333" }]} />
        <View style={styles.inlineStat}>
          <Text style={styles.inlineStatValue}>{userTrick?.attempts || 0}</Text>
          <Text style={styles.inlineStatLabel}>attempts</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.fab}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={20} color="#000" />
      </TouchableOpacity>

      {/* Right side FABs */}
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
        <VideoHero
          video={featuredVideo}
          categoryColor={categoryColor}
          scrollY={scrollY}
        />
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

      {/* Sticky header - appears when scrolling */}
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            opacity: scrollY.interpolate({
              inputRange: [200, 250],
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
        pointerEvents="none"
      >
        <Text style={styles.stickyHeaderText} numberOfLines={1}>
          {trick.name}
        </Text>
        {userTrick ? inlineStats() : null}
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

        {/* Content overlay card */}
        <View
          style={[
            styles.contentCard,
            { borderTopColor: tierColor, borderTopWidth: 4 },
          ]}
        >
          <View style={styles.trickInfo}>
            {/* Header with two-column layout */}
            <View style={styles.trickHeader}>
              {/* Left column: Badge and Name */}
              <View style={styles.trickHeaderLeft}>
                <Text style={styles.trickName}>{trick.name}</Text>
                {primaryCategory ? (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: categoryColor },
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>
                      {primaryCategory}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Right column: Stats and Progress */}
              {user ? (
                <View style={styles.trickHeaderRight}>
                  {userTrick ? inlineStats() : null}
                  {/* Progress Indicator - under stats */}
                  {tierProgress.nextTier && (
                    <View style={styles.progressSection}>
                      <CircularProgress
                        size={50}
                        strokeWidth={3}
                        progress={tierProgress.progress}
                        progressColor={nextTierColor}
                        backgroundColor="#E5E5E5"
                        centerContent={
                          <View style={styles.progressContent}>
                            <Text style={styles.progressPercentage}>
                              {Math.round(tierProgress.progress)}%
                            </Text>
                          </View>
                        }
                      />
                      <Text style={styles.progressLabel}>
                        to {nextTierName}
                      </Text>
                    </View>
                  )}
                </View>
              ) : trick.rating ? (
                <View style={styles.trickHeaderRight}>
                  <View style={styles.inlineStats}>
                    <View style={styles.inlineStat}>
                      <Text style={styles.inlineStatValue}>{trick.rating}</Text>
                      <Text style={styles.inlineStatLabel}>difficulty</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Surfaces Section */}
            {userTrick ? (
              <SurfaceBadges
                landedSurfaces={userTrick.landedSurfaces || []}
                showTitle={true}
                interactive={true}
              />
            ) : null}

            {/* Collapsible Description */}
            {trick.description ? (
              <View style={styles.descriptionSection}>
                <TouchableOpacity
                  style={styles.descriptionToggle}
                  activeOpacity={1}
                  onPress={() => {
                    if (Platform.OS === "ios") {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                    }
                    setShowDescription(!showDescription);
                  }}
                >
                  <View style={styles.descriptionToggleContent}>
                    <Text style={styles.descriptionToggleText}>
                      Description
                    </Text>
                    <Ionicons
                      name={showDescription ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
                {showDescription ? (
                  <Text style={styles.description}>{trick.description}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Video Gallery with Tabs */}
          {user && (
            <View style={styles.videoSection}>
              {/* Tabs */}
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
            </View>
          )}

          {/* Actions Row */}
          {user ? (
            <View style={styles.actionsRow}>
              <View style={styles.actionButtonsVertical}>
                <TouchableOpacity
                  style={styles.logStompButton}
                  onPress={incrementStomps}
                >
                  <Text style={styles.logStompButtonText}>STOMP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.attemptButton}
                  onPress={incrementAttempts}
                >
                  <Text style={styles.attemptButtonText}>ATTEMPT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Trick Logs */}
          {user && (
            <TrickLogs userTrick={userTrick} onAddPress={handleLogPress} />
          )}

          {/* Trick Progression Graph */}
          <TrickProgressionGraph
            trick={trick}
            onTrickPress={handleTrickNavigation}
          />

          {/* Remove Button */}
          {user && userTrick ? (
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={removeFromTricks}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.removeButtonText}>Clear Progress</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Login Prompt */}
          {!user ? (
            <View style={styles.loginPrompt}>
              <Ionicons name="person-outline" size={48} color="#ccc" />
              <Text style={styles.loginTitle}>Sign in to track this trick</Text>
              <Text style={styles.loginSubtitle}>
                Log attempts, rate tricks, and track your progress
              </Text>
            </View>
          ) : null}
        </View>
      </AnimatedScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={showVideoPlayer}
        video={selectedVideo}
        onClose={handleCloseVideoPlayer}
      />

      {/* Trick Log Modal */}
      <TrickLogModal
        visible={showLogModal}
        userTrick={userTrick}
        trickId={trick.id}
        userId={user?.id || ""}
        trickName={trick.name}
        sessionId={activeSession?.id}
        onClose={() => setShowLogModal(false)}
        onLogAdded={fetchUserTrick}
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  stickyHeaderText: {
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  videoSpacer: {
    height: 336, // VideoHero height (360) - overlap (24)
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
  contentCard: {
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
  trickInfo: {
    paddingBottom: 16,
  },
  trickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  trickHeaderLeft: {
    flex: 1,
    flexDirection: "column",
    gap: 8,
  },
  trickHeaderRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  inlineStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inlineStat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  inlineStatValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  inlineStatLabel: {
    fontSize: 12,
    fontWeight: "400",
    color: "#666",
    textTransform: "lowercase",
  },
  inlineStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#333",
  },
  trickName: {
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  progressSection: {
    alignItems: "center",
    marginTop: 2,
  },
  progressContent: {
    alignItems: "center",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  progressLabel: {
    fontSize: 10,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  progressRemaining: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  descriptionSection: {
    marginTop: 0,
    marginBottom: 12,
  },
  descriptionToggle: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  descriptionToggleContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  descriptionToggleText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    color: "#333",
    lineHeight: 24,
    marginTop: 12,
    paddingTop: 0,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    marginTop: 16,
  },
  historyCard: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    padding: 12,
  },
  historyTitle: {
    fontSize: 10,
    fontWeight: "500",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  historySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  historySectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 10,
    flex: 1,
  },
  historySectionValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
  },
  historySectionDivider: {
    height: 2,
    backgroundColor: "#000",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  actionsCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
    marginBottom: 20,
  },
  goalToggle: {
    marginBottom: 20,
  },
  goalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    gap: 8,
  },
  activeGoalButton: {
    backgroundColor: "#007AFF",
  },
  goalText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
  },
  activeGoalText: {
    color: "#fff",
  },
  actionButtonsVertical: {
    flex: 1,
    gap: 12,
    flexDirection: "row",
  },
  logStompButton: {
    backgroundColor: "#333",
    borderRadius: 0,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  logStompButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1.5,
  },
  attemptButton: {
    backgroundColor: "transparent",
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  attemptButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  ratingSection: {
    marginBottom: 24,
  },
  ratingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  removeButton: {
    marginTop: 0,
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  removeButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "500",
  },
  autoSaveNote: {
    marginTop: 16,
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    fontStyle: "normal",
  },
  loginPrompt: {
    alignItems: "center",
    padding: 48,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000",
    marginTop: 24,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
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
});
