import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTricks } from "@/contexts/TricksContext";
import { Trick } from "@hyperbolic/shared-types";

interface TrickSuggestionChipsProps {
  searchText: string;
  onSelectTrick: (trick: Trick) => void;
  maxResults?: number;
}

/**
 * Inline chip suggestions for trick selection
 * Shows max 3 matching tricks as tappable chips
 */
export default function TrickSuggestionChips({
  searchText,
  onSelectTrick,
  maxResults = 3,
}: TrickSuggestionChipsProps) {
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

  return (
    <View style={styles.container}>
      {filteredTricks.map((trick) => (
        <TouchableOpacity
          key={trick.id}
          style={styles.chip}
          onPress={() => onSelectTrick(trick)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{trick.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: "#E3F2FD",
    borderWidth: 1,
    borderColor: "#2196F3",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: {
    color: "#1976D2",
    fontSize: 14,
    fontWeight: "500",
  },
});
