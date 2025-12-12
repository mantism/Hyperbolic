import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";

interface FilterSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function FilterSwitch({
  label,
  value,
  onValueChange,
}: FilterSwitchProps) {
  return (
    <View style={styles.container}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e0e0e0", true: "#007AFF" }}
        thumbColor="#fff"
        ios_backgroundColor="#e0e0e0"
        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
});
