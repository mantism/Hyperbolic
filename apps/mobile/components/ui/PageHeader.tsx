import React from "react";
import { View, StyleSheet } from "react-native";

interface PageHeaderProps {
  children: React.ReactNode;
}

/**
 * Reusable page header container with consistent styling.
 * Provides shadow, border, and background for header content.
 */
export default function PageHeader({ children }: PageHeaderProps) {
  return <View style={styles.headerContainer}>{children}</View>;
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
