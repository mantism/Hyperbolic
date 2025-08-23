import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getCategoryColor, getCategoryColorLight } from "@/lib/categoryColors";
import { Database } from "@/lib/supabase/database.types";

type Trick = Database["public"]["Tables"]["TricksTable"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricksTable"]["Row"] & {
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
  // Calculate success percentage - if no attempts but has stomps, treat as 100%
  const percentage = userTrick?.stomps && userTrick.stomps > 0
    ? userTrick.attempts && userTrick.attempts > 0
      ? Math.round((userTrick.stomps / userTrick.attempts) * 100)
      : 100
    : 0;

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);
  const categoryColorLight = getCategoryColorLight(primaryCategory);

  // Determine if we should show the success band and its color
  const hasLanded = userTrick?.landed === true;
  const showSuccessBand = hasLanded;

  // Color coding for success rate
  const getSuccessColor = (rate: number) => {
    if (rate >= 80) return "#10B981"; // Green
    if (rate >= 60) return "#F59E0B"; // Amber
    if (rate >= 40) return "#EF4444"; // Red
    return "#6B7280"; // Gray
  };

  const successBandColor = getSuccessColor(percentage);

  return (
    <View style={styles.linkContainer}>
      <TouchableOpacity
        style={[styles.trickCard, { backgroundColor: categoryColorLight }]}
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
          <Ionicons name="image-outline" size={40} color={categoryColor + "AA"} />
        </View>

        {/* Diagonal success band */}
        {showSuccessBand ? (
          <View
            style={[styles.successBand, { backgroundColor: successBandColor }]}
          >
            <Text style={styles.successBandText}>Landed</Text>
          </View>
        ) : null}

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
  successBand: {
    position: "absolute",
    top: 12,
    right: -30,
    width: 100,
    height: 24,
    backgroundColor: "#10B981", // Will be overridden
    transform: [{ rotate: "45deg" }],
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  successBandText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
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
