import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Goal,
  getGoalTypeLabel,
  getGoalProgress,
  isGoalCompleted,
} from "@/lib/services/goalService";

interface GoalCardProps {
  goal: Goal;
  onDelete?: (goalId: string) => void;
  onPress?: (goal: Goal) => void;
}

export default function GoalCard({ goal, onDelete, onPress }: GoalCardProps) {
  const progress = getGoalProgress(goal);
  const completed = isGoalCompleted(goal);
  const typeLabel = getGoalTypeLabel(goal.goal_type);

  const handlePress = () => {
    onPress?.(goal);
  };

  const handleDelete = () => {
    onDelete?.(goal.id);
  };

  return (
    <TouchableOpacity
      style={[styles.container, completed && styles.completedContainer]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          {completed ? (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          ) : (
            <Ionicons name="flag" size={24} color="#007AFF" />
          )}
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
          {goal.target_name && (
            <Text style={styles.targetName} numberOfLines={1}>
              {goal.target_name}
            </Text>
          )}
        </View>
        {onDelete && !completed && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress}%` },
              completed && styles.completedProgressBar,
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {goal.current_value} / {goal.target_value}
        </Text>
      </View>

      {completed && goal.completed_at && (
        <Text style={styles.completedText}>
          Completed {new Date(goal.completed_at).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedContainer: {
    backgroundColor: "#F8FFF8",
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  targetName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  completedProgressBar: {
    backgroundColor: "#4CAF50",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    minWidth: 60,
    textAlign: "right",
  },
  completedText: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 8,
  },
});
