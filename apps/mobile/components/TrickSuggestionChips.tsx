import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useTricks } from "@/contexts/TricksContext";
import { Trick } from "@hyperbolic/shared-types";
import { searchTricks, hasExactTrickMatch } from "@/lib/utils/trickSearch";

interface TrickSuggestionChipsProps {
  searchText: string;
  onSelectTrick: (trick: Trick) => void;
  onCreateCustom?: (trickName: string) => void;
  maxResults?: number;
}

/**
 * Inline chip suggestions for trick selection
 * Shows max 3 matching tricks as tappable chips
 */
export default function TrickSuggestionChips({
  searchText,
  onSelectTrick,
  onCreateCustom,
  maxResults = 8,
}: TrickSuggestionChipsProps) {
  const { allTricks } = useTricks();

  const filteredTricks = useMemo(() => {
    return searchTricks(allTricks, searchText, maxResults);
  }, [allTricks, searchText, maxResults]);

  if (filteredTricks.length === 0) {
    return null;
  }

  // Check if search text is an exact match
  const hasExactMatch = hasExactTrickMatch(allTricks, searchText);

  const showCustomOption =
    searchText.length >= 2 && !hasExactMatch && onCreateCustom;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
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
      {showCustomOption && (
        <TouchableOpacity
          style={[styles.chip, styles.customChip]}
          onPress={() => onCreateCustom(searchText.trim())}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, styles.customChipText]}>
            + "{searchText.trim()}"
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginTop: 8,
  },
  container: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 16,
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
  customChip: {
    backgroundColor: "#F5F5F5",
    borderColor: "#999",
    borderStyle: "dashed",
  },
  customChipText: {
    color: "#666",
    fontStyle: "italic",
  },
});
