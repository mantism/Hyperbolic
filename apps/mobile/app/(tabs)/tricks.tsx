import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTricks, TrickFilterOptions } from "@/contexts/TricksContext";
import { TrickCard, TrickStatsHexagon } from "@/components/tricks";
import {
  FilterSheet,
  FilterRow,
  FilterSwitch,
  SearchBar,
  PageHeader,
} from "@/components/ui";
import Ionicons from "@expo/vector-icons/Ionicons";

// Height of each TrickCard including margins for FlatList optimization
const TRICK_CARD_HEIGHT = 140;

export default function TricksScreen() {
  const { user } = useAuth();
  const {
    availableCategories,
    loading,
    refreshing,
    refetchTricks,
    refetchUserTricks,
    getUserTrickForTrickId,
    filterAndSortTricks,
  } = useTricks();
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<TrickFilterOptions>({
    search: "",
    category: "",
    showLandedOnly: false,
    difficultyRange: [1, 10],
    sortBy: "name",
    sortOrder: "asc",
  });

  const filteredTricks = useMemo(() => {
    return filterAndSortTricks(filters);
  }, [filterAndSortTricks, filters]);

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
      <PageHeader>
        <SearchBar
          value={filters.search}
          onChangeText={(text: string) =>
            setFilters((prev) => ({ ...prev, search: text }))
          }
          placeholder="Search tricks..."
          showFilterButton={true}
          onFilterPress={() => setShowFilters(true)}
        />

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
      </PageHeader>

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
          const userTrick = getUserTrickForTrickId(trick.id);
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
  filterRowsContainer: {
    backgroundColor: "#fff",
    paddingBottom: 8,
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
