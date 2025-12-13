import React, { useState, useMemo } from "react";
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
import { useTricks } from "@/contexts/TricksContext";
import TrickCard from "@/components/TrickCard";
import FilterSheet from "@/components/FilterSheet";
import FilterRow from "@/components/FilterRow";
import FilterSwitch from "@/components/FilterSwitch";
import TrickStatsHexagon from "@/components/TrickStatsHexagon";
import Ionicons from "@expo/vector-icons/Ionicons";

type FilterOptions = {
  search: string;
  category: string;
  showLandedOnly: boolean;
  difficultyRange: [number, number];
  sortBy: "name" | "difficulty" | "category";
  sortOrder: "asc" | "desc";
};

// Height of each TrickCard including margins for FlatList optimization
const TRICK_CARD_HEIGHT = 140;

export default function TricksScreen() {
  const { user } = useAuth();
  const {
    allTricks,
    userTricks,
    availableCategories,
    loading,
    refreshing,
    refetchTricks,
    refetchUserTricks,
    getUserTrickForTrickId,
  } = useTricks();
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    category: "",
    showLandedOnly: false,
    difficultyRange: [1, 10],
    sortBy: "name",
    sortOrder: "asc",
  });

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
      if (filters.showLandedOnly) {
        const userTrick = userTricksMap.get(trick.id);
        const isLanded = userTrick?.landed === true;
        if (!isLanded) return false;
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

  const onRefresh = async () => {
    await refetchTricks();
    if (user) {
      await refetchUserTricks();
    }
  };

  // Prepare category options for FilterRow
  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: "All" },
      ...availableCategories.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [availableCategories]);

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
      {/* Header Container - Search + Filters */}
      <View style={styles.headerContainer}>
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
                onPress={() => setFilters((prev) => ({ ...prev, search: "" }))}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Filter Rows - always visible below search */}
        <View style={styles.filterRowsContainer}>
          {/* Category Filter Row */}
          <FilterRow
            options={categoryOptions}
            selectedValue={filters.category}
            onSelect={(value) =>
              setFilters((prev) => ({ ...prev, category: value }))
            }
          />

          {/* Status Filter Switch - only show for logged in users */}
          {user && (
            <FilterSwitch
              label="Landed"
              value={filters.showLandedOnly}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, showLandedOnly: value }))
              }
            />
          )}
        </View>
      </View>

      {/* Sort Filter Sheet */}
      <FilterSheet
        visible={showFilters}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortByChange={(sortBy) => setFilters((prev) => ({ ...prev, sortBy }))}
        onSortOrderChange={(sortOrder) =>
          setFilters((prev) => ({ ...prev, sortOrder }))
        }
        onClose={() => setShowFilters(false)}
      />

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
  headerContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 60,
    paddingBottom: 12,
    alignItems: "center",
    gap: 12,
  },
  filterRowsContainer: {
    backgroundColor: "#fff",
    paddingBottom: 8,
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
    paddingBottom: 16,
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
});
