import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
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

export default function TrickDetailPage({ trick, onClose }: TrickDetailPageProps) {
  const { user } = useAuth();
  const [userTrick, setUserTrick] = useState<UserTrick | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [attempts, setAttempts] = useState("");
  const [stomps, setStomps] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [isGoal, setIsGoal] = useState(false);

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);
  const categoryColorLight = getCategoryColorLight(primaryCategory);

  useEffect(() => {
    if (user) {
      fetchUserTrick();
    } else {
      setLoading(false);
    }
  }, [user, trick.id]);

  const fetchUserTrick = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("UserToTricksTable")
        .select("*")
        .eq("userID", user.id)
        .eq("trickID", trick.id)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setUserTrick(data);
        setAttempts(data.attempts?.toString() || "");
        setStomps(data.stomps?.toString() || "");
        setUserRating(data.rating || 0);
        setIsGoal(data.isGoal || false);
      }
    } catch (error) {
      console.error("Error fetching user trick:", error);
      Alert.alert("Error", "Failed to load trick data");
    } finally {
      setLoading(false);
    }
  };

  const saveUserTrick = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const attemptsNum = parseInt(attempts) || 0;
      const stompsNum = parseInt(stomps) || 0;
      const landed = stompsNum > 0;

      const trickData = {
        userID: user.id,
        trickID: trick.id,
        attempts: attemptsNum,
        stomps: stompsNum,
        landed,
        rating: userRating || null,
        isGoal,
      };

      if (userTrick) {
        // Update existing
        const { error } = await supabase
          .from("UserToTricksTable")
          .update(trickData)
          .eq("id", userTrick.id);

        if (error) throw error;
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

      Alert.alert("Success", "Trick updated successfully!");
    } catch (error) {
      console.error("Error saving trick:", error);
      Alert.alert("Error", "Failed to save trick data");
    } finally {
      setSaving(false);
    }
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
              setAttempts("");
              setStomps("");
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

  const successRate = userTrick?.attempts 
    ? Math.round(((userTrick.stomps || 0) / userTrick.attempts) * 100)
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
        <View style={[styles.trickCard, { backgroundColor: categoryColorLight }]}>
          <View style={[
            styles.imagePlaceholder,
            { backgroundColor: categoryColor + '40' }
          ]}>
            <Ionicons name="image-outline" size={60} color={categoryColor + 'AA'} />
          </View>
          
          <View style={styles.trickInfo}>
            <Text style={styles.trickName}>{trick.name}</Text>
            {primaryCategory ? (
              <Text style={[styles.category, { color: categoryColor }]}>
                {primaryCategory}
              </Text>
            ) : null}
            {trick.rating ? (
              <Text style={styles.difficulty}>Difficulty: {trick.rating}/10</Text>
            ) : null}
            {trick.description ? (
              <Text style={styles.description}>{trick.description}</Text>
            ) : null}
          </View>
        </View>

        {/* User Stats */}
        {userTrick ? (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userTrick.attempts || 0}</Text>
                <Text style={styles.statLabel}>Attempts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userTrick.stomps || 0}</Text>
                <Text style={styles.statLabel}>Stomps</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{successRate}%</Text>
                <Text style={styles.statLabel}>Success Rate</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* User Actions */}
        {user ? (
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Track Progress</Text>
            
            {/* Goal Toggle */}
            <View style={styles.goalToggle}>
              <TouchableOpacity
                style={[styles.goalButton, isGoal && styles.activeGoalButton]}
                onPress={() => setIsGoal(!isGoal)}
              >
                <Ionicons 
                  name={isGoal ? "star" : "star-outline"} 
                  size={20} 
                  color={isGoal ? "#fff" : "#007AFF"} 
                />
                <Text style={[styles.goalText, isGoal && styles.activeGoalText]}>
                  {isGoal ? "In Wishlist" : "Add to Wishlist"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Attempts & Stomps */}
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Attempts</Text>
                <TextInput
                  style={styles.numberInput}
                  value={attempts}
                  onChangeText={setAttempts}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stomps/Lands</Text>
                <TextInput
                  style={styles.numberInput}
                  value={stomps}
                  onChangeText={setStomps}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            {/* Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.inputLabel}>Your Rating</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={styles.starButton}
                    onPress={() => setUserRating(rating)}
                  >
                    <Ionicons
                      name={rating <= userRating ? "star" : "star-outline"}
                      size={32}
                      color={rating <= userRating ? "#FFD700" : "#ddd"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={saveUserTrick}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {userTrick ? "Update" : "Add to Arsenal"}
                  </Text>
                )}
              </TouchableOpacity>

              {userTrick ? (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={removeFromArsenal}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
  statsCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
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
  inputRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: "center",
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
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  removeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  removeButtonText: {
    color: "#ff4444",
    fontSize: 16,
    fontWeight: "500",
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