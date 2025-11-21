import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import { Database } from "@hyperbolic/shared-types";
import {
  getTrickTier,
  getTierBorderStyle,
  TrickTier,
} from "@/lib/trickProgressTiers";

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
  const tier = getTrickTier(stompsCount);
  const tierBorderStyle =
    tier !== TrickTier.NONE ? getTierBorderStyle(tier) : {};

  return (
    <View style={styles.linkContainer}>
      <TouchableOpacity
        style={[
          styles.trickCard,
          { backgroundColor: categoryColorLight },
          tierBorderStyle,
        ]}
      >
        <Link
          href={{
            pathname: "/trick/[id]",
            params: { id: trick.id },
          }}
          style={styles.linkOverlay}
        />

        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: categoryColor + "40" },
          ]}
        >
          <Ionicons
            name="image-outline"
            size={40}
            color={categoryColor + "AA"}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.trickName}>{trick.name}</Text>

          {primaryCategory ? (
            <Text style={[styles.category, { color: categoryColor }]}>
              {primaryCategory}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  linkContainer: {
    width: "48%",
    marginBottom: 16,
  },
  trickCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  cardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  trickName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  category: {
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
