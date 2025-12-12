import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import { Trick, UserTrick } from "@hyperbolic/shared-types";
import SurfaceBadges from "./SurfaceBadges";

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

  // Get landed surfaces from userTrick
  const landedSurfaces = userTrick?.landedSurfaces
    ? new Set(userTrick.landedSurfaces)
    : new Set<string>();

  // Check if trick has been landed
  const isLanded = userTrick?.landed === true;

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
          <View style={styles.topRow}>
            <Text style={styles.trickName}>{trick.name}</Text>
            <Ionicons
              name={isLanded ? "checkmark-circle" : "ellipse-outline"}
              size={20}
              color={isLanded ? "#22C55E" : "#D1D5DB"}
            />
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.bottomLeft}>
              <View
                style={[
                  styles.category,
                  { backgroundColor: categoryColorLight },
                ]}
              >
                <Text style={[styles.categoryLabel]}>
                  {trick.categories?.join(", ")}
                </Text>
              </View>
              {landedSurfaces.size > 0 && (
                <View style={styles.surfaceBadgesContainer}>
                  <SurfaceBadges
                    landedSurfaces={landedSurfaces}
                    showTitle={false}
                    interactive={false}
                    showLabels={false}
                  />
                </View>
              )}
            </View>
            {isLanded && <Text style={styles.landedCount}>{stompsCount}</Text>}
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
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  trickName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  category: {
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
  surfaceBadgesContainer: {
    flex: 1,
  },
  landedCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
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
