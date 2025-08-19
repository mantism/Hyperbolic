import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@/lib/supabase/database.types";
import Ionicons from "@expo/vector-icons/Ionicons";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricksTable"]["Row"] & {
  trick: Trick;
};

export default function ArsenalScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"arsenal" | "wishlist">("arsenal");
  const [tricks, setTricks] = useState<UserTrick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTricks();
    }
  }, [user, activeTab]);

  const fetchTricks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("UserToTricksTable")
        .select(`
          *,
          trick:TricksTable(*)
        `)
        .eq("userID", user.id)
        .eq("isGoal", activeTab === "wishlist");

      if (error) throw error;
      setTricks(data as UserTrick[]);
    } catch (error) {
      console.error("Error fetching tricks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTricks();
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
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "arsenal" && styles.activeTab]}
          onPress={() => setActiveTab("arsenal")}
        >
          <Text style={[styles.tabText, activeTab === "arsenal" && styles.activeTabText]}>
            My Tricks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "wishlist" && styles.activeTab]}
          onPress={() => setActiveTab("wishlist")}
        >
          <Text style={[styles.tabText, activeTab === "wishlist" && styles.activeTabText]}>
            Wishlist
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {tricks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name={activeTab === "arsenal" ? "trophy-outline" : "star-outline"} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyTitle}>
              {activeTab === "arsenal" 
                ? "No tricks in your arsenal yet"
                : "Your wishlist is empty"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "arsenal"
                ? "Add tricks you've landed to track your progress"
                : "Add tricks you want to learn to your wishlist"}
            </Text>
          </View>
        ) : (
          tricks.map((userTrick) => {
            const { trick } = userTrick;
            const percentage = userTrick.attempts 
              ? Math.round(((userTrick.stomps || 0) / userTrick.attempts) * 100)
              : 0;

            return (
              <TouchableOpacity key={userTrick.id} style={styles.trickCard}>
                <View style={styles.trickHeader}>
                  <Text style={styles.trickName}>{trick.name}</Text>
                  {userTrick.rating && (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>{userTrick.rating}/10</Text>
                    </View>
                  )}
                </View>
                
                {trick.categories && (
                  <View style={styles.categories}>
                    {trick.categories.slice(0, 3).map((cat, idx) => (
                      <Text key={idx} style={styles.categoryTag}>
                        {cat}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{userTrick.attempts || 0}</Text>
                    <Text style={styles.statLabel}>Attempts</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{userTrick.stomps || 0}</Text>
                    <Text style={styles.statLabel}>Stomps</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{percentage}%</Text>
                    <Text style={styles.statLabel}>Success</Text>
                  </View>
                </View>

                {activeTab === "wishlist" && (
                  <TouchableOpacity style={styles.addToArsenalButton}>
                    <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    <Text style={styles.addToArsenalText}>Mark as Landed</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
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
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#007AFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  trickCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trickName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  ratingBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  categoryTag: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  addToArsenalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  addToArsenalText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});