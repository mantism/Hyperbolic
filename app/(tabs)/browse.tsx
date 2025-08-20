import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@/lib/supabase/database.types";
import TrickCard from "@/components/TrickCard";
import Ionicons from "@expo/vector-icons/Ionicons";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricksTable"]["Row"] & {
  trick: Trick;
};

type FilterOptions = {
  search: string;
  category: string;
  landedStatus: "all" | "landed" | "not_landed";
  difficultyRange: [number, number];
  sortBy: "name" | "difficulty" | "category";
  sortOrder: "asc" | "desc";
};

export default function BrowseScreen() {
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

  useEffect(() => {
    fetchAllTricks();
    if (user) {
      fetchUserTricks();
    }
  }, [user]);

  const fetchAllTricks = async () => {
    try {
      const { data, error } = await supabase
        .from("TricksTable")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllTricks(data);

      // Extract unique categories
      const categories = new Set<string>();
      data.forEach((trick) => {
        trick.categories?.forEach((category) => categories.add(category));
      });
      setAvailableCategories(Array.from(categories).sort());
    } catch (error) {
      console.error("Error fetching tricks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserTricks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("UserToTricksTable")
        .select(`
          *,
          trick:TricksTable(*)
        `)
        .eq("userID", user.id);

      if (error) throw error;
      setUserTricks(data as UserTrick[]);
    } catch (error) {
      console.error("Error fetching user tricks:", error);
    }
  };

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

      // Landed status filter
      if (filters.landedStatus !== "all") {
        const userTrick = userTricks.find((ut) => ut.trickID === trick.id);
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
  }, [allTricks, userTricks, filters]);

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
    return userTricks.find((ut) => ut.trickID === trickId);
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
      {/* Search Bar */}
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
              onPress={() =>
                setFilters((prev) => ({ ...prev, search: "" }))
              }
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

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Category Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filters.category === "" && styles.activeFilterChip,
                  ]}
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, category: "" }))
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.category === "" && styles.activeFilterChipText,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {availableCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      filters.category === category && styles.activeFilterChip,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, category }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.category === category &&
                          styles.activeFilterChipText,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Landed Status Filter */}
            {user && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: "all", label: "All" },
                    { key: "landed", label: "Landed" },
                    { key: "not_landed", label: "Not Landed" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.filterChip,
                        filters.landedStatus === option.key &&
                          styles.activeFilterChip,
                      ]}
                      onPress={() =>
                        setFilters((prev) => ({
                          ...prev,
                          landedStatus: option.key as any,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          filters.landedStatus === option.key &&
                            styles.activeFilterChipText,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Sort Options */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sort</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: "name", label: "Name" },
                  { key: "difficulty", label: "Difficulty" },
                  { key: "category", label: "Category" },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterChip,
                      filters.sortBy === option.key && styles.activeFilterChip,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        sortBy: option.key as any,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.sortBy === option.key &&
                          styles.activeFilterChipText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredTricks.length} tricks found
        </Text>
      </View>

      {/* Tricks Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTricks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No tricks found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            {filteredTricks.map((trick) => {
              const userTrick = getUserTrickForTrick(trick.id);
              return (
                <TrickCard
                  key={trick.id}
                  trick={trick}
                  userTrick={userTrick}
                  showStats={!!userTrick}
                  onPress={() => {
                    // TODO: Navigate to trick detail page
                    console.log("Pressed trick:", trick.name);
                  }}
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
  filtersContainer: {
    backgroundColor: "#f9f9f9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterGroup: {
    marginRight: 24,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  filterOptions: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeFilterChip: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterChipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeFilterChipText: {
    color: "#fff",
  },
  resetButton: {
    alignSelf: "flex-end",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
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