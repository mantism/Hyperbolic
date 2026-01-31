import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGoals } from "@/contexts/GoalsContext";
import { Goal } from "@/lib/services/goalService";
import GoalCard from "./GoalCard";

interface GoalsListProps {
  onCreateGoal?: () => void;
  onGoalPress?: (goal: Goal) => void;
  showCompleted?: boolean;
}

export default function GoalsList({
  onCreateGoal,
  onGoalPress,
  showCompleted = false,
}: GoalsListProps) {
  const {
    goals,
    completedGoals,
    loading,
    refreshing,
    refetchGoals,
    deleteGoal,
  } = useGoals();
  const [showCompletedSection, setShowCompletedSection] =
    useState(showCompleted);

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteGoal(goalId),
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.sectionTitle}>Active Goals</Text>
      {onCreateGoal && (
        <TouchableOpacity style={styles.addButton} onPress={onCreateGoal}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="flag-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No active goals</Text>
      <Text style={styles.emptySubtitle}>
        Set a goal to track your progress
      </Text>
      {onCreateGoal && (
        <TouchableOpacity style={styles.createButton} onPress={onCreateGoal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Goal</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCompletedSection = () => {
    if (completedGoals.length === 0) return null;

    return (
      <View style={styles.completedSection}>
        <TouchableOpacity
          style={styles.completedHeader}
          onPress={() => setShowCompletedSection(!showCompletedSection)}
        >
          <Text style={styles.completedTitle}>
            Completed ({completedGoals.length})
          </Text>
          <Ionicons
            name={showCompletedSection ? "chevron-up" : "chevron-down"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
        {showCompletedSection &&
          completedGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onPress={onGoalPress} />
          ))}
      </View>
    );
  };

  return (
    <FlatList
      data={goals}
      renderItem={({ item }) => (
        <GoalCard
          goal={item}
          onDelete={handleDeleteGoal}
          onPress={onGoalPress}
        />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderCompletedSection}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refetchGoals} />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  addButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completedSection: {
    marginTop: 24,
  },
  completedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginBottom: 12,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
});
