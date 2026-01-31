import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGoals } from "@/contexts/GoalsContext";
import { useTricks } from "@/contexts/TricksContext";
import { useCombos } from "@/contexts/CombosContext";
import { GoalType, getGoalTypeLabel } from "@/lib/services/goalService";

interface CreateGoalModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Pre-select a target (e.g., when creating goal from trick detail page)
  preselectedType?: "trick" | "combo";
  preselectedTargetId?: string;
  preselectedTargetName?: string;
}

type GoalCategory = "trick" | "combo";
type GoalMetric = "stomps" | "attempts";

export default function CreateGoalModal({
  visible,
  onClose,
  onSuccess,
  preselectedType,
  preselectedTargetId,
  preselectedTargetName,
}: CreateGoalModalProps) {
  const { createGoal } = useGoals();
  const { allTricks } = useTricks();
  const { userCombos } = useCombos();

  const [category, setCategory] = useState<GoalCategory>(
    preselectedType || "trick",
  );
  const [metric, setMetric] = useState<GoalMetric>("stomps");
  const [targetId, setTargetId] = useState<string>(preselectedTargetId || "");
  const [targetName, setTargetName] = useState<string>(
    preselectedTargetName || "",
  );
  const [targetValue, setTargetValue] = useState<string>("10");
  const [searchText, setSearchText] = useState("");
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setCategory(preselectedType || "trick");
    setMetric("stomps");
    setTargetId(preselectedTargetId || "");
    setTargetName(preselectedTargetName || "");
    setTargetValue("10");
    setSearchText("");
    setShowTargetPicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!targetId) {
      Alert.alert("Error", "Please select a target trick or combo");
      return;
    }

    const value = parseInt(targetValue);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Error", "Please enter a valid target number");
      return;
    }

    setSubmitting(true);
    try {
      const goalType: GoalType = `${category}_${metric}` as GoalType;
      await createGoal({
        goalType,
        targetId,
        targetName,
        targetValue: value,
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating goal:", error);
      Alert.alert("Error", "Failed to create goal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTricks = allTricks.filter((trick) =>
    trick.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const filteredCombos = userCombos.filter((combo) =>
    combo.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const goalTypeLabel = getGoalTypeLabel(`${category}_${metric}` as GoalType);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Goal</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* Goal Type Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Goal Type</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  category === "trick" && styles.segmentActive,
                ]}
                onPress={() => {
                  setCategory("trick");
                  setTargetId("");
                  setTargetName("");
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    category === "trick" && styles.segmentTextActive,
                  ]}
                >
                  Trick
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  category === "combo" && styles.segmentActive,
                ]}
                onPress={() => {
                  setCategory("combo");
                  setTargetId("");
                  setTargetName("");
                }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    category === "combo" && styles.segmentTextActive,
                  ]}
                >
                  Combo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Metric</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  metric === "stomps" && styles.segmentActive,
                ]}
                onPress={() => setMetric("stomps")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    metric === "stomps" && styles.segmentTextActive,
                  ]}
                >
                  Stomps (Lands)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  metric === "attempts" && styles.segmentActive,
                ]}
                onPress={() => setMetric("attempts")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    metric === "attempts" && styles.segmentTextActive,
                  ]}
                >
                  Attempts
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Target Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Select {category === "trick" ? "Trick" : "Combo"}
            </Text>
            <TouchableOpacity
              style={styles.targetSelector}
              onPress={() => setShowTargetPicker(true)}
            >
              {targetName ? (
                <Text style={styles.targetText}>{targetName}</Text>
              ) : (
                <Text style={styles.targetPlaceholder}>
                  Tap to select {category}...
                </Text>
              )}
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Target Value */}
          <View style={styles.section}>
            <Text style={styles.label}>Target Number</Text>
            <TextInput
              style={styles.input}
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="numeric"
              placeholder="e.g., 10"
            />
            <Text style={styles.helperText}>
              {goalTypeLabel} {targetValue || "X"} times
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleClose}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              (submitting || !targetId) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !targetId}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Create Goal</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Target Picker Modal */}
        <Modal
          visible={showTargetPicker}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowTargetPicker(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => setShowTargetPicker(false)}
                style={styles.closeButton}
              >
                <Ionicons name="chevron-back" size={28} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>
                Select {category === "trick" ? "Trick" : "Combo"}
              </Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${category}s...`}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.pickerList}>
              {category === "trick" ? (
                filteredTricks.length > 0 ? (
                  filteredTricks.map((trick) => (
                    <TouchableOpacity
                      key={trick.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setTargetId(trick.id);
                        setTargetName(trick.name);
                        setShowTargetPicker(false);
                        setSearchText("");
                      }}
                    >
                      <Text style={styles.pickerItemText}>{trick.name}</Text>
                      {targetId === trick.id && (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noResults}>No tricks found</Text>
                )
              ) : filteredCombos.length > 0 ? (
                filteredCombos.map((combo) => (
                  <TouchableOpacity
                    key={combo.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setTargetId(combo.id);
                      setTargetName(combo.name);
                      setShowTargetPicker(false);
                      setSearchText("");
                    }}
                  >
                    <Text style={styles.pickerItemText}>{combo.name}</Text>
                    {targetId === combo.id && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noResults}>
                  {userCombos.length === 0
                    ? "No combos yet. Create a combo first!"
                    : "No combos found"}
                </Text>
              )}
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 36,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  segmentActive: {
    backgroundColor: "#333",
  },
  segmentText: {
    fontSize: 14,
    color: "#666",
  },
  segmentTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  targetSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#F9F9F9",
  },
  targetText: {
    fontSize: 16,
    color: "#333",
  },
  targetPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#333",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Picker modal styles
  pickerContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  pickerList: {
    flex: 1,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  pickerItemText: {
    fontSize: 16,
    color: "#333",
  },
  noResults: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    padding: 24,
  },
});
