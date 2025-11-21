import React, { useState, useEffect, useCallback } from "react";
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
import { Database } from "@hyperbolic/shared-types";
import TrickCard from "@/components/TrickCard";
import Ionicons from "@expo/vector-icons/Ionicons";

type Trick = Database["public"]["Tables"]["Tricks"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricks"]["Row"] & {
  trick: Trick;
};

export default function ArsenalScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"arsenal" | "wishlist">("arsenal");
  const [tricks, setTricks] = useState<UserTrick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTricks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("UserToTricks")
        .select(
          `
          *,
          trick:Tricks(*)
        `
        )
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
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      fetchTricks();
    }
  }, [user, activeTab, fetchTricks]);

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
          <Text
            style={[
              styles.tabText,
              activeTab === "arsenal" && styles.activeTabText,
            ]}
          >
            My Tricks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "wishlist" && styles.activeTab]}
          onPress={() => setActiveTab("wishlist")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "wishlist" && styles.activeTabText,
            ]}
          >
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
          <View style={styles.cardsGrid}>
            {tricks.map((userTrick) => {
              const { trick } = userTrick;
              return (
                <TrickCard
                  key={userTrick.id}
                  trick={trick}
                  userTrick={userTrick}
                />
              );
            })}
          </View>
        )}
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
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
