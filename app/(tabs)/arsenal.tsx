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
      console.log("Testing basic connectivity...");
      
      // Try the most basic possible query - just get Supabase to respond
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
      });
      
      console.log("Direct fetch response:", response.status);
      
      // If basic fetch works, try supabase client
      console.log("Now trying supabase client...");
      const { data, error } = await supabase
        .from("UserToTricksTable")
        .select("*")
        .eq("userID", user.id)
        .eq("isGoal", activeTab === "wishlist");

      console.log("Query result:", { data, error });
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
          tricks.map((userTrick) => (
            <TouchableOpacity key={userTrick.id} style={styles.trickCard}>
              <Text style={styles.trickName}>{userTrick.trickID}</Text>
              <Text style={styles.trickInfo}>
                {userTrick.attempts || 0} attempts • {userTrick.stomps || 0} stomps
                {userTrick.rating && ` • ${userTrick.rating}/10`}
              </Text>
            </TouchableOpacity>
          ))
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
  trickCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  trickName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  trickInfo: {
    fontSize: 14,
    color: "#666",
  },
});