import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  type TextInput as TextInputType,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTricks } from "@/contexts/TricksContext";
import { Trick } from "@hyperbolic/shared-types";

interface SessionTrickInputProps {
  onSelect: (trick: Trick) => void;
  onDismiss: () => void;
}

/**
 * Inline trick input with autocomplete for session logging.
 * Stays open after selection for rapid entry.
 */
export default function SessionTrickInput({
  onSelect,
  onDismiss,
}: SessionTrickInputProps) {
  const { filterAndSortTricks } = useTricks();
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef<TextInputType>(null);

  useEffect(() => {
    // Focus the input when component mounts
    inputRef.current?.focus();
  }, []);

  const suggestions = useMemo(() => {
    let results: Trick[] = [];
    if (searchText.trim().length) {
      results = filterAndSortTricks({
        search: searchText.trim(),
        sortBy: "name",
        sortOrder: "asc",
      }).slice(0, 8);
    }
    return results.filter(
      (trick) => trick && trick.name != null && typeof trick.name === "string",
    );
  }, [filterAndSortTricks, searchText]);

  // Clear for next entry (stays open for rapid entry)
  const handleSelect = (trick: Trick) => {
    onSelect(trick);
    setSearchText("");
  };

  const showDropdown =
    suggestions.length > 0 ||
    (searchText.trim().length > 0 && suggestions.length === 0);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Ionicons name="search" size={18} color="#999" style={styles.icon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search tricks..."
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          {suggestions.length > 0 ? (
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {suggestions.map((trick) => {
                const name = trick.name ?? "Unknown";
                return (
                  <TouchableOpacity
                    key={trick.id}
                    style={styles.suggestionItem}
                    onPress={() => handleSelect(trick)}
                  >
                    <Text style={styles.suggestionText}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No tricks found</Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  suggestionText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  noResults: {
    padding: 16,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 14,
    color: "#999",
  },
});
