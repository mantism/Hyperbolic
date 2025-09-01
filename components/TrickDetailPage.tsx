import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@/lib/supabase/database.types";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import {
  getTrickTier,
  getTierColor,
  TrickTier,
  getProgressToNextTier,
  getTierName,
} from "@/lib/trickProgressTiers";
import {
  SurfaceType,
  getSurfaceTypeColor,
  getSurfaceTypeLabel,
} from "@/lib/surfaceTypes";
import Ionicons from "@expo/vector-icons/Ionicons";
import TrickProgressionGraph from "./TrickProgressionGraph";
import TrickLogs from "./TrickLogs";
import CircularProgress from "./CircularProgress";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricksTable"]["Row"];
type TrickLog = Database["public"]["Tables"]["tricklogs"]["Row"];

interface TrickDetailPageProps {
  trick: Trick;
  onClose: () => void;
}

export default function TrickDetailPage({
  trick,
  onClose,
}: TrickDetailPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [userTrick, setUserTrick] = useState<UserTrick | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showLogModal, setShowLogModal] = useState(false);

  // Form states
  const [attempts, setAttempts] = useState(0);
  const [stomps, setStomps] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [isGoal, setIsGoal] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [landedSurfaces, setLandedSurfaces] = useState<Set<string>>(new Set());
  const [showSurfaceLabels, setShowSurfaceLabels] = useState(false);

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);
  const categoryColorLight = getCategoryColorLight(primaryCategory);

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
      const { data, error } = await supabase
        .from("UserToTricksTable")
        .select("*")
        .eq("userID", user.id)
        .eq("trickID", trick.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setUserTrick(data);
        setAttempts(data.attempts || 0);
        setStomps(data.stomps || 0);
        setUserRating(data.rating || 0);
        setIsGoal(data.isGoal || false);

        // Fetch surfaces from trick logs
        fetchLandedSurfaces(data.id);
      }
    } catch (error) {
      console.error("Error fetching user trick:", error);
      Alert.alert("Error", "Failed to load trick data");
    } finally {
      setLoading(false);
    }
  }, [user, trick.id]);

  const fetchLandedSurfaces = async (userTrickId: string) => {
    try {
      const { data, error } = await supabase
        .from("tricklogs")
        .select("surface_type")
        .eq("user_trick_id", userTrickId)
        .eq("landed", true)
        .not("surface_type", "is", null);

      if (error) throw error;

      if (data) {
        const surfaces = new Set<string>();
        data.forEach((log) => {
          if (log.surface_type) {
            surfaces.add(log.surface_type);
          }
        });
        setLandedSurfaces(surfaces);
      }
    } catch (error) {
      console.error("Error fetching landed surfaces:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserTrick();
    } else {
      setLoading(false);
    }
  }, [user, trick.id, fetchUserTrick]);

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
          table: "UserToTricksTable",
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
            // Refresh surfaces when user trick is updated
            fetchLandedSurfaces(newData.id);
          } else if (payload.eventType === "DELETE") {
            setUserTrick(null);
            setAttempts(0);
            setStomps(0);
            setUserRating(0);
            setIsGoal(false);
          }
        }
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
      currentUserTrick: UserTrick | null
    ) => {
      if (!user) return;

      try {
        const landed = newStomps > 0;
        const trickData = {
          userID: user.id,
          trickID: trick.id,
          attempts: newAttempts,
          stomps: newStomps,
          landed,
          rating: newRating || null,
          isGoal: newIsGoal,
        };

        if (currentUserTrick) {
          // Update existing
          const { data, error } = await supabase
            .from("UserToTricksTable")
            .update(trickData)
            .eq("id", currentUserTrick.id)
            .select()
            .single();

          if (error) throw error;
          // Update the userTrick state with the latest data
          setUserTrick(data);
        } else {
          // Insert new
          const { data, error } = await supabase
            .from("UserToTricksTable")
            .insert(trickData)
            .select()
            .single();

          if (error) throw error;
          setUserTrick(data);
        }
      } catch (error: any) {
        console.error("Error auto-saving:", error);
        // Revert the optimistic update on error
        Alert.alert("Sync Error", "Failed to save changes. Please try again.");
      }
    },
    [user, trick.id]
  );

  const incrementAttempts = async () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts); // Optimistic update
    await autoSave(newAttempts, stomps, userRating, isGoal, userTrick);
  };

  const incrementStomps = async () => {
    const newStomps = stomps + 1;
    setStomps(newStomps); // Optimistic update
    await autoSave(attempts, newStomps, userRating, isGoal, userTrick);
  };

  const updateRating = async (rating: number) => {
    setUserRating(rating); // Optimistic update
    await autoSave(attempts, stomps, rating, isGoal, userTrick);
  };

  const toggleGoal = async () => {
    const newIsGoal = !isGoal;
    setIsGoal(newIsGoal); // Optimistic update
    await autoSave(attempts, stomps, userRating, newIsGoal, userTrick);
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
    if (!userTrick) {
      Alert.alert(
        "Add to Arsenal",
        "Add this trick to your arsenal first by logging an attempt or stomp"
      );
      return;
    }
    setShowLogModal(true);
  };

  const handleUploadVideo = () => {
    // TODO: Implement video upload functionality
    Alert.alert("Upload Video", "Video upload functionality coming soon!");
  };

  const removeFromArsenal = async () => {
    if (!userTrick) {
      return;
    }

    Alert.alert(
      "Remove Trick",
      `Are you sure you want to clear your progress on ${trick.name}? This will also remove it from your arsenal.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("UserToTricksTable")
                .delete()
                .eq("id", userTrick.id);

              if (error) throw error;

              setUserTrick(null);
              setAttempts(0);
              setStomps(0);
              setUserRating(0);
              setIsGoal(false);
              Alert.alert("Success", "Trick removed from arsenal");
            } catch (error) {
              console.error("Error removing trick:", error);
              Alert.alert("Error", "Failed to remove trick");
            }
          },
        },
      ]
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

  return (
    <View style={styles.container}>
      {/* Fixed background image */}
      <Animated.View
        style={[
          styles.fixedImageContainer,
          {
            backgroundColor: categoryColor + "20",
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, 300],
                  outputRange: [0, -100],
                  extrapolate: "clamp",
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="image-outline" size={48} color={categoryColor} />
      </Animated.View>

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
          <TouchableOpacity
            style={styles.fabSmall}
            onPress={handleLogPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Image spacer with upload FAB */}
        <View style={styles.imageSpacerContainer}>
          <View style={styles.imageSpacer} />

          {/* Upload video FAB */}
          <TouchableOpacity
            style={styles.uploadVideoFab}
            onPress={handleUploadVideo}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam-outline" size={18} color="#000" />
          </TouchableOpacity>
        </View>

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
                <Text style={styles.trickName}>{trick.name}</Text>
              </View>

              {/* Right column: Stats and Progress */}
              {user ? (
                <View style={styles.trickHeaderRight}>
                  <View style={styles.inlineStats}>
                    <View style={styles.inlineStat}>
                      <Text style={styles.inlineStatValue}>
                        {userTrick?.stomps || 0}
                      </Text>
                      <Text style={styles.inlineStatLabel}>stomps</Text>
                    </View>
                    <View
                      style={[
                        styles.inlineStatDivider,
                        { backgroundColor: "#333" },
                      ]}
                    />
                    <View style={styles.inlineStat}>
                      <Text style={styles.inlineStatValue}>
                        {userTrick?.attempts || 0}
                      </Text>
                      <Text style={styles.inlineStatLabel}>attempts</Text>
                    </View>
                  </View>
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
            {user ? (
              <TouchableOpacity
                style={styles.surfacesSection}
                activeOpacity={1}
                onPress={() => {
                  if (landedSurfaces.size > 0) {
                    setShowSurfaceLabels(!showSurfaceLabels);
                  }
                }}
              >
                <Text style={styles.surfacesTitle}>SURFACES</Text>
                {landedSurfaces.size > 0 ? (
                  <View style={styles.surfaceBadges}>
                    {Array.from(landedSurfaces).map((surfaceType) => (
                      <View
                        key={surfaceType}
                        style={styles.surfaceBadgeContainer}
                      >
                        <View
                          style={[
                            styles.surfaceBadge,
                            {
                              backgroundColor: getSurfaceTypeColor(
                                surfaceType as SurfaceType
                              ),
                            },
                          ]}
                        >
                          {/* TODO: Add icons for each surface type */}
                        </View>
                        {showSurfaceLabels && (
                          <Text style={styles.surfaceBadgeLabel}>
                            {getSurfaceTypeLabel(surfaceType as SurfaceType)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.surfacesEmptyText}>
                    Log a trick in detail to earn your first surface badge
                  </Text>
                )}
              </TouchableOpacity>
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
                        LayoutAnimation.Presets.easeInEaseOut
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
            <TrickLogs
              userTrick={userTrick}
              trickId={trick.id}
              userId={user.id}
              onLogAdded={() => {
                fetchUserTrick();
                if (userTrick) {
                  fetchLandedSurfaces(userTrick.id);
                }
                setShowLogModal(false);
              }}
              trickName={trick.name}
              showAddModal={showLogModal}
              onCloseModal={() => setShowLogModal(false)}
            />
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
                onPress={removeFromArsenal}
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
                Log attempts, rate tricks, and build your arsenal
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
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
  scrollView: {
    flex: 1,
  },
  fixedImageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  imageSpacerContainer: {
    position: "relative",
    height: 276,
  },
  imageSpacer: {
    height: "100%",
  },
  uploadVideoFab: {
    position: "absolute",
    bottom: 32,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 24,
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
    zIndex: 10,
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
  surfacesSection: {
    marginTop: 16,
    marginBottom: 12,
  },
  surfacesTitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  surfaceBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  surfaceBadgeContainer: {
    alignItems: "center",
    minHeight: 40,
  },
  surfaceBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  surfaceBadgeLabel: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
    maxWidth: 30,
    marginTop: 0,
    position: "absolute",
    bottom: -15,
  },
  surfacesEmptyText: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
  },
});
