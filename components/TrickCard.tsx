import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
  onPress?: () => void;
  showStats?: boolean;
}

export default function TrickCard({ 
  trick, 
  userTrick, 
  onPress, 
  showStats = true 
}: TrickCardProps) {
  const percentage = userTrick?.attempts 
    ? Math.round(((userTrick.stomps || 0) / userTrick.attempts) * 100)
    : 0;

  const primaryCategory = trick.categories?.[0];
  const categoryColor = getCategoryColor(primaryCategory);
  const categoryColorLight = getCategoryColorLight(primaryCategory);

  return (
    <TouchableOpacity 
      style={[
        styles.trickCard,
        { backgroundColor: categoryColorLight }
      ]}
      onPress={onPress}
    >
      <View style={[
        styles.imagePlaceholder,
        { backgroundColor: categoryColor + '40' }
      ]}>
        <Ionicons name="image-outline" size={40} color={categoryColor + 'AA'} />
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.trickName}>{trick.name}</Text>
        
        {primaryCategory ? (
          <Text style={[styles.category, { color: categoryColor }]}>
            {primaryCategory}
          </Text>
        ) : null}
        
        {showStats && userTrick ? (
          <Text style={styles.successRate}>{percentage}% success</Text>
        ) : null}
        
        {trick.rating !== null && trick.rating !== undefined ? (
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>Difficulty: {trick.rating}/10</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trickCard: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 16,
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
  successRate: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  ratingContainer: {
    marginTop: 4,
  },
  rating: {
    fontSize: 11,
    color: "#888",
    fontWeight: "400",
  },
});