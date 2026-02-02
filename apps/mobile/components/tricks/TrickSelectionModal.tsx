import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useTricks, TrickFilterOptions } from "@/contexts/TricksContext";
import { Trick } from "@hyperbolic/shared-types";
import TrickCard from "./TrickCard";
import { FilterRow } from "@/components/ui";
import Ionicons from "@expo/vector-icons/Ionicons";

interface TrickSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTrick: (trick: Trick) => void;
}

const TRICK_CARD_HEIGHT = 140;

export default function TrickSelectionModal({
  visible,
  onClose,
  onSelectTrick,
}: TrickSelectionModalProps) {
  const {
    availableCategories,
    loading,
    getUserTrickForTrickId,
    filterAndSortTricks,
  } = useTricks();

  const [filters, setFilters] = useState<TrickFilterOptions>({
    search: "",
    category: "",
    sortBy: "name",
    sortOrder: "asc",
    showLandedOnly: false,
  });

  const filteredTricks = useMemo(() => {
    return filterAndSortTricks(filters);
  }, [filterAndSortTricks, filters]);

  const categoryOptions = useMemo(() => {
    return [
      { value: "", label: "All" },
      ...availableCategories.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [availableCategories]);

  const handleTrickPress = (trick: Trick) => {
    onSelectTrick(trick);
  };

  if (loading && visible) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Trick</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search and Filters */}
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
            {(filters.search ?? "").length > 0 && (
              <TouchableOpacity
                onPress={() => setFilters((prev) => ({ ...prev, search: "" }))}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterRowsContainer}>
          <FilterRow
            options={categoryOptions}
            selectedValue={filters.category}
            onSelect={(value) =>
              setFilters((prev) => ({ ...prev, category: value }))
            }
          />
        </View>

        {/* Tricks List */}
        <FlatList
          data={filteredTricks}
          renderItem={({ item: trick }) => {
            const userTrick = getUserTrickForTrickId(trick.id);
            return (
              <TrickCard
                trick={trick}
                userTrick={userTrick}
                onPress={() => handleTrickPress(trick)}
              />
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.flatListContent}
          style={styles.flatList}
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
    </Modal>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 36,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  searchBar: {
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
  filterRowsContainer: {
    backgroundColor: "#fff",
    paddingBottom: 8,
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
