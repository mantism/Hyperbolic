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
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
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
          <View style={styles.cardsGrid}>
            {tricks.map((userTrick) => {
              const { trick } = userTrick;
              const percentage = userTrick.attempts 
                ? Math.round(((userTrick.stomps || 0) / userTrick.attempts) * 100)
                : 0;

              const primaryCategory = trick.categories?.[0];
              const categoryColor = getCategoryColor(primaryCategory);
              const categoryColorLight = getCategoryColorLight(primaryCategory);

              return (
                <TouchableOpacity 
                  key={userTrick.id} 
                  style={[
                    styles.trickCard,
                    { backgroundColor: categoryColorLight }
                  ]}
                >
                  {/* Image placeholder */}
                  <View style={[
                    styles.imagePlaceholder,
                    { backgroundColor: categoryColor + '40' } // 25% opacity
                  ]}>
                    <Ionicons name="image-outline" size={40} color={categoryColor + 'AA'} />
                  </View>
                  
                  {/* Card content overlay */}
                  <View style={styles.cardContent}>
                    <Text style={styles.trickName}>{trick.name}</Text>
                    
                    {primaryCategory && (
                      <Text style={[styles.category, { color: categoryColor }]}>
                        {primaryCategory}
                      </Text>
                    )}
                    
                    <Text style={styles.successRate}>{percentage}% success</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  trickCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  trickName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  successRate: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
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