import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

interface FilterRowProps {
  label?: string;
  options: { value: string; label: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export default function FilterRow({
  options,
  selectedValue,
  onSelect,
}: FilterRowProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.chip,
              selectedValue === option.value && styles.activeChip,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.chipText,
                selectedValue === option.value && styles.activeChipText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 8,
  },
  chip: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeChip: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  chipText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeChipText: {
    color: "#fff",
    fontWeight: "600",
  },
});
