import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

interface SearchBarProps {
  value?: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  showFilterButton?: boolean;
  onAddPress?: () => void;
  showAddButton?: boolean;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onFilterPress,
  showFilterButton = true,
  onAddPress,
  showAddButton = false,
}: SearchBarProps) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
        />
        {value && value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {showFilterButton && onFilterPress && (
        <TouchableOpacity style={styles.filterButton} onPress={onFilterPress}>
          <Ionicons name="options-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
      )}

      {showAddButton && onAddPress && (
        <TouchableOpacity style={styles.addButton} onPress={onAddPress}>
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 60,
    paddingBottom: 12,
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
  addButton: {
    padding: 4,
  },
});
