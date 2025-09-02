import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";

type FilterOptions = {
  search: string;
  category: string;
  landedStatus: "all" | "landed" | "not_landed";
  difficultyRange: [number, number];
  sortBy: "name" | "difficulty" | "category";
  sortOrder: "asc" | "desc";
};

interface FilterDropdownProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  availableCategories: string[];
  hasUser: boolean;
  onReset: () => void;
  onClose: () => void;
}

export default function FilterDropdown({
  filters,
  setFilters,
  availableCategories,
  hasUser,
  onReset,
  onClose,
}: FilterDropdownProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  return (
    <Animated.View
      style={[
        styles.filtersContainer,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.category === "" && styles.activeFilterChip,
              ]}
              onPress={() => setFilters((prev) => ({ ...prev, category: "" }))}
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
                onPress={() => setFilters((prev) => ({ ...prev, category }))}
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

        {/* Status Filter - only for logged in users */}
        {hasUser && (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filters.landedStatus === "all" && styles.activeFilterChip,
                ]}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, landedStatus: "all" }))
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.landedStatus === "all" &&
                      styles.activeFilterChipText,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filters.landedStatus === "landed" && styles.activeFilterChip,
                ]}
                onPress={() =>
                  setFilters((prev) => ({ ...prev, landedStatus: "landed" }))
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.landedStatus === "landed" &&
                      styles.activeFilterChipText,
                  ]}
                >
                  Landed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filters.landedStatus === "not_landed" &&
                    styles.activeFilterChip,
                ]}
                onPress={() =>
                  setFilters((prev) => ({
                    ...prev,
                    landedStatus: "not_landed",
                  }))
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filters.landedStatus === "not_landed" &&
                      styles.activeFilterChipText,
                  ]}
                >
                  Not Landed
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.sortBy === "name" && styles.activeFilterChip,
              ]}
              onPress={() =>
                setFilters((prev) => ({ ...prev, sortBy: "name" }))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.sortBy === "name" && styles.activeFilterChipText,
                ]}
              >
                Name
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.sortBy === "category" && styles.activeFilterChip,
              ]}
              onPress={() =>
                setFilters((prev) => ({ ...prev, sortBy: "category" }))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.sortBy === "category" && styles.activeFilterChipText,
                ]}
              >
                Category
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.sortOrder === "asc" && styles.activeFilterChip,
              ]}
              onPress={() =>
                setFilters((prev) => ({ ...prev, sortOrder: "asc" }))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.sortOrder === "asc" && styles.activeFilterChipText,
                ]}
              >
                A → Z
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filters.sortOrder === "desc" && styles.activeFilterChip,
              ]}
              onPress={() =>
                setFilters((prev) => ({ ...prev, sortOrder: "desc" }))
              }
            >
              <Text
                style={[
                  styles.filterChipText,
                  filters.sortOrder === "desc" && styles.activeFilterChipText,
                ]}
              >
                Z → A
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetButtonText}>Reset All</Text>
        </TouchableOpacity>
      </Animated.View>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    position: "absolute",
    top: "100%", // Position right below the search container
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 20,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeFilterChip: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  activeFilterChipText: {
    color: "#fff",
    fontWeight: "600",
  },
  resetButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  resetButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});
