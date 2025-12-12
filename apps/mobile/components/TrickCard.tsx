import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import { Database } from "@hyperbolic/shared-types";

type Trick = Database["public"]["Tables"]["Tricks"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricks"]["Row"] & {
  trick: Trick;
};

interface TrickCardProps {
  trick: Trick;
  userTrick?: UserTrick;
  showStats?: boolean;
}

export default function TrickCard({
  trick,
  userTrick,
  showStats = true,
}: TrickCardProps) {
  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);
  const categoryColorLight = getCategoryColorLight(primaryCategory);

  // Determine border tier based on stomps count
  const stompsCount = userTrick?.stomps || 0;

  return (
    <View style={styles.linkContainer}>
      <TouchableOpacity style={styles.trickCard}>
        <Link
          href={{
            pathname: "/trick/[id]",
            params: { id: trick.id },
          }}
          style={styles.linkOverlay}
        />
        <View style={styles.cardContent}>
          <Text style={styles.trickName}>{trick.name}</Text>
          <View
            style={[styles.category, { backgroundColor: categoryColorLight }]}
          >
            <Text style={[styles.categoryLabel]}>
              {trick.categories?.join(", ")}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  linkContainer: {
    width: "100%",
    marginBottom: 16,
  },
  trickCard: {
    width: "100%",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    padding: 16,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  cardContent: {
    flexDirection: "column",
    gap: 4,
  },
  trickName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  category: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  linkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
});
