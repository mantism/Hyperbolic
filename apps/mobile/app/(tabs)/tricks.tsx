import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/supabase";
import { Trick, UserTrick } from "@hyperbolic/shared-types";
import TrickCard from "@/components/TrickCard";
import FilterDropdown from "@/components/FilterDropdown";
import TrickStatsHexagon from "@/components/TrickStatsHexagon";
import Ionicons from "@expo/vector-icons/Ionicons";

type FilterOptions = {
  search: string;
  category: string;
  landedStatus: "all" | "landed" | "not_landed";
  difficultyRange: [number, number];
  sortBy: "name" | "difficulty" | "category";
  sortOrder: "asc" | "desc";
};

// Height of each TrickCard including margins for FlatList optimization
const TRICK_CARD_HEIGHT = 140;

export default function TricksScreen() {
  const { user } = useAuth();
  const [allTricks, setAllTricks] = useState<Trick[]>([]);
  const [userTricks, setUserTricks] = useState<UserTrick[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    category: "",
    landedStatus: "all",
    difficultyRange: [1, 10],
    sortBy: "name",
    sortOrder: "asc",
  });

  const fetchAllTricks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("Tricks")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      const tricks = data as Trick[];
      setAllTricks(tricks);

      // Extract unique categories
      const categories = new Set<string>();
      tricks.forEach((trick) => {
        trick.categories?.forEach((category: string) =>
          categories.add(category)
        );
      });
      setAvailableCategories(Array.from(categories).sort());
    } catch (error) {
      console.error("Error fetching tricks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUserTricks = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("UserToTricks")
        .select(
          `
          *,
          trick:Tricks(*)
        `
        )
        .eq("userID", user.id);

      if (error) throw error;
      setUserTricks(data as UserTrick[]);
    } catch (error) {
      console.error("Error fetching user tricks:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTricks();
    if (user) {
      fetchUserTricks();
    }
  }, [user, fetchUserTricks, fetchAllTricks]);

  // Create a lookup map for user tricks for better performance
  const userTricksMap = useMemo(() => {
    const map = new Map<string, UserTrick>();
    userTricks.forEach((userTrick) => {
      map.set(userTrick.trickID, userTrick);
    });
    return map;
  }, [userTricks]);

  const filteredTricks = useMemo(() => {
    let filtered = allTricks.filter((trick) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = trick.name.toLowerCase().includes(searchLower);
        const matchesAlias = trick.aliases?.some((alias) =>
          alias.toLowerCase().includes(searchLower)
        );
        if (!matchesName && !matchesAlias) return false;
      }

      // Category filter
      if (filters.category && filters.category !== "") {
        if (!trick.categories?.includes(filters.category)) return false;
      }

      // Difficulty range filter
      if (trick.rating) {
        if (
          trick.rating < filters.difficultyRange[0] ||
          trick.rating > filters.difficultyRange[1]
        ) {
          return false;
        }
      }

      // Landed status filter - now O(1) lookup instead of O(n)
      if (filters.landedStatus !== "all") {
        const userTrick = userTricksMap.get(trick.id);
        const isLanded = userTrick?.landed === true;

        if (filters.landedStatus === "landed" && !isLanded) return false;
        if (filters.landedStatus === "not_landed" && isLanded) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "difficulty":
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case "category":
          aValue = a.categories?.[0] || "";
          bValue = b.categories?.[0] || "";
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allTricks, userTricksMap, filters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllTricks();
    if (user) {
      fetchUserTricks();
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      landedStatus: "all",
      difficultyRange: [1, 10],
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const getUserTrickForTrick = (trickId: string) => {
    return userTricksMap.get(trickId);
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
      {/* Search Container - positioned relatively for dropdown positioning */}
      <View style={styles.searchContainerWrapper}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tricks..."
              value={filters.search}
              onChangeText={(text) =>
                setFilters((prev) => ({ ...prev, search: text }))
              }
            />
            {filters.search.length > 0 && (
              <TouchableOpacity
                onPress={() => setFilters((prev) => ({ ...prev, search: "" }))}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Filters Dropdown - positioned absolutely within the wrapper */}
        {showFilters && (
          <>
            {/* Overlay for tap-to-close */}
            <TouchableOpacity
              style={styles.filterOverlay}
              activeOpacity={1}
              onPress={() => setShowFilters(false)}
            />
            <FilterDropdown
              filters={filters}
              setFilters={setFilters}
              availableCategories={availableCategories}
              hasUser={!!user}
              onReset={resetFilters}
              onClose={() => setShowFilters(false)}
            />
          </>
        )}
      </View>

      {/* Tricks List */}
      <FlatList
        data={filteredTricks}
        renderItem={({ item: trick }) => {
          const userTrick = getUserTrickForTrick(trick.id);
          return <TrickCard trick={trick} userTrick={userTrick} />;
        }}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            {/* Stats Hexagon - Mock data for now */}
            <TrickStatsHexagon
              stats={{
                power: 75,
                creativity: 60,
                flips: 85,
                twists: 70,
                variations: 50,
                kicks: 65,
              }}
            />

            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredTricks.length} tricks found
              </Text>
            </View>
          </>
        }
        contentContainerStyle={styles.flatListContent}
        style={styles.flatList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No tricks found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filters
            </Text>
          </View>
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: TRICK_CARD_HEIGHT,
          offset: TRICK_CARD_HEIGHT * index,
          index,
        })}
      />
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
  searchContainerWrapper: {
    position: "relative",
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
    alignItems: "center",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  filterButton: {
    padding: 8,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
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
  filterOverlay: {
    position: "absolute",
    top: 0,
    left: -1000, // Extend far left
    right: -1000, // Extend far right
    bottom: -1000, // Extend far down
    backgroundColor: "transparent",
    zIndex: 10,
  },
});
