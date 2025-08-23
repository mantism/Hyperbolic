import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@/lib/supabase/database.types";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import Ionicons from "@expo/vector-icons/Ionicons";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricksTable"]["Row"];

interface TrickDetailPageProps {
  trick: Trick;
  onClose: () => void;
}

export default function TrickDetailPage({
  trick,
  onClose,
}: TrickDetailPageProps) {
  const { user } = useAuth();
  const [userTrick, setUserTrick] = useState<UserTrick | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [attempts, setAttempts] = useState(0);
  const [stomps, setStomps] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [isGoal, setIsGoal] = useState(false);

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);
  const categoryColorLight = getCategoryColorLight(primaryCategory);

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
      }
    } catch (error) {
      console.error("Error fetching user trick:", error);
      Alert.alert("Error", "Failed to load trick data");
    } finally {
      setLoading(false);
    }
  }, [user, trick.id]);

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
    const newAttempts = newStomps > attempts ? newStomps : attempts;

    // Optimistic updates
    setStomps(newStomps);
    if (newAttempts !== attempts) {
      setAttempts(newAttempts);
    }

    await autoSave(newAttempts, newStomps, userRating, isGoal, userTrick);
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

  const removeFromArsenal = async () => {
    if (!userTrick) return;

    Alert.alert(
      "Remove Trick",
      "Are you sure you want to remove this trick from your arsenal?",
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trick Info Card */}
        <View
          style={[styles.trickCard, { backgroundColor: categoryColorLight }]}
        >
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: categoryColor + "40" },
            ]}
          >
            <Ionicons
              name="image-outline"
              size={60}
              color={categoryColor + "AA"}
            />
          </View>

          <View style={styles.trickInfo}>
            <Text style={styles.trickName}>{trick.name}</Text>
            {primaryCategory ? (
              <Text style={[styles.category, { color: categoryColor }]}>
                {primaryCategory}
              </Text>
            ) : null}
            {trick.rating ? (
              <Text style={styles.difficulty}>
                Difficulty: {trick.rating}/10
              </Text>
            ) : null}
            {trick.description ? (
              <Text style={styles.description}>{trick.description}</Text>
            ) : null}
          </View>
        </View>

        {/* History and Actions Row */}
        {user ? (
          <View style={styles.historyActionsRow}>
            {/* Your History Panel */}
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>YOUR HISTORY</Text>

              {/* Sends Section */}
              <View>
                <View style={styles.historySectionHeader}>
                  <Ionicons name="flame-outline" size={20} color="#999" />
                  <Text style={styles.historySectionTitle}>STOMPS</Text>
                  <Text style={styles.historySectionValue}>
                    {userTrick?.stomps && userTrick.stomps > 0
                      ? userTrick.stomps
                      : "—"}
                  </Text>
                </View>
                <View style={styles.historySectionDivider} />
              </View>
              {/* Attempts Section */}
              <View>
                <View style={styles.historySectionHeader}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#999"
                  />
                  <Text style={styles.historySectionTitle}>ATTEMPTS</Text>
                  <Text style={styles.historySectionValue}>
                    {userTrick?.attempts && userTrick.attempts > 0
                      ? userTrick.attempts
                      : "—"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsVertical}>
              <TouchableOpacity
                style={styles.logStompButton}
                onPress={incrementStomps}
              >
                <Text style={styles.logStompButtonText}>LOG STOMP</Text>
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

        {/* Remove Button */}
        {user ? (
          <View style={styles.actionsCard}>
            {/* Remove Button Only */}
            {userTrick ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={removeFromArsenal}
              >
                <Text style={styles.removeButtonText}>Remove from Arsenal</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.autoSaveNote}>
                Start tracking to automatically add to your arsenal
              </Text>
            )}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  trickCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePlaceholder: {
    height: 120,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  trickInfo: {
    alignItems: "center",
  },
  trickName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    textAlign: "center",
  },
  category: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  difficulty: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  historyActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  historyCard: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    borderRadius: 16,
    padding: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
    letterSpacing: 1,
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
    height: 1,
    backgroundColor: "#444",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    marginBottom: 16,
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
    gap: 8,
  },
  logStompButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logStompButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  attemptButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#666",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  attemptButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
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
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4444",
    alignItems: "center",
  },
  removeButtonText: {
    color: "#ff4444",
    fontSize: 16,
    fontWeight: "500",
  },
  autoSaveNote: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  loginPrompt: {
    alignItems: "center",
    padding: 32,
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
