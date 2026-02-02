import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoalsList, CreateGoalModal } from "@/components/goals";

export default function GoalsScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <GoalsList onCreateGoal={() => setShowCreateModal(true)} />
      </View>

      <CreateGoalModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
  },
});
