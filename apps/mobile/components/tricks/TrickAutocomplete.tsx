import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTricks } from "@/contexts/TricksContext";
import { Trick } from "@hyperbolic/shared-types";

interface TrickAutocompleteProps {
  searchText: string;
  onSelectTrick: (trick: Trick) => void;
  maxResults?: number;
}

/**
 * Autocomplete dropdown for selecting tricks while typing
 * Filters tricks based on name and aliases
 */
export default function TrickAutocomplete({
  searchText,
  onSelectTrick,
  maxResults = 5,
}: TrickAutocompleteProps) {
  const { allTricks } = useTricks();

  const filteredTricks = useMemo(() => {
    if (!searchText || searchText.length < 2) {
      return [];
    }

    const searchLower = searchText.toLowerCase();
    const matches = allTricks.filter((trick) => {
      const matchesName = trick.name.toLowerCase().includes(searchLower);
      const matchesAlias = trick.aliases?.some((alias) =>
        alias.toLowerCase().includes(searchLower)
      );
      return matchesName || matchesAlias;
    });

    return matches.slice(0, maxResults);
  }, [allTricks, searchText, maxResults]);

  if (filteredTricks.length === 0) {
    return null;
  }

  // Calculate height based on number of items (max 200px)
  const ITEM_HEIGHT = 50; // Approximate height per item
  const calculatedHeight = Math.min(filteredTricks.length * ITEM_HEIGHT, 200);

  return (
    <View style={[styles.container, { height: calculatedHeight }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
      >
        {filteredTricks.map((trick) => (
          <TouchableOpacity
            key={trick.id}
            style={styles.item}
            onPress={() => onSelectTrick(trick)}
          >
            <Text style={styles.itemText}>{trick.name}</Text>
            {trick.aliases && trick.aliases.length > 0 && (
              <Text style={styles.aliasText}>
                aka {trick.aliases.slice(0, 2).join(", ")}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  aliasText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
});
