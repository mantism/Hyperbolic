import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SequenceItem } from "@hyperbolic/shared-types";
import { sequenceToComboGraph } from "@/lib/utils/comboRendering";
import { createComboLog } from "@/lib/services/comboLogService";
import {
  getAllSurfaceTypes,
  getSurfaceTypeLabel,
} from "@/lib/surfaceTypes";
import { useCombos } from "@/contexts/CombosContext";
import { useSession } from "@/contexts/SessionContext";
import ComboComposer from "./ComboComposer";

interface QuickComboLoggerProps {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface LogFormData {
  name: string;
  rating: string;
  notes: string;
  location_name: string;
  surface_type: string;
  landed: boolean;
}

const initialFormData: LogFormData = {
  name: "",
  rating: "",
  notes: "",
  location_name: "",
  surface_type: "",
  landed: true,
};

export default function QuickComboLogger({
  visible,
  userId,
  onClose,
  onSuccess,
}: QuickComboLoggerProps) {
  const { refetchUserCombos } = useCombos();
  const { activeSession } = useSession();
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [formData, setFormData] = useState<LogFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const handleClose = () => {
    setSequence([]);
    setFormData(initialFormData);
    onClose();
  };

  const handleSequenceChange = (newSequence: SequenceItem[]) => {
    setSequence(newSequence);
  };

  const handleSubmit = async () => {
    if (sequence.length === 0) {
      Alert.alert("Error", "Please add at least one trick to the combo.");
      return;
    }

    setSubmitting(true);
    try {
      const comboGraph = sequenceToComboGraph(sequence);

      // Create the combo log (this auto-creates UserCombo if needed)
      // Note: createComboLog already handles incrementing combo/trick stats
      await createComboLog({
        userId,
        comboGraph,
        comboName: formData.name || undefined,
        landed: formData.landed,
        rating: formData.rating ? parseInt(formData.rating) : undefined,
        notes: formData.notes || undefined,
        locationName: formData.location_name || undefined,
        surfaceType: formData.surface_type || undefined,
        sessionId: activeSession?.id,
      });

      // Refresh combos list to show the new combo
      await refetchUserCombos();

      // Reset form and close
      setSequence([]);
      setFormData(initialFormData);
      onSuccess();
    } catch (error) {
      console.error("Error logging combo:", error);
      Alert.alert("Error", "Failed to log combo. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const surfaceTypes = getAllSurfaceTypes();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={submitting}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Quick Log</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Combo Composer Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Build Your Combo</Text>
            <ComboComposer
              initialSequence={sequence}
              onSequenceChange={handleSequenceChange}
              onSave={() => {}} // We handle save ourselves
              onCancel={handleClose}
              hideButtons={true}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Log Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log Details</Text>

            {/* Combo Name */}
            <View style={styles.formRow}>
              <Text style={styles.label}>Combo Name (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Auto-generated if left blank"
              />
            </View>

            {/* Landed Toggle */}
            <View style={styles.formRow}>
              <Text style={styles.label}>Landed?</Text>
              <View style={styles.switchContainer}>
                <TouchableOpacity
                  style={[
                    styles.switchButton,
                    formData.landed && styles.switchButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, landed: true })}
                >
                  <Text
                    style={[
                      styles.switchText,
                      formData.landed && styles.switchTextActive,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.switchButton,
                    !formData.landed && styles.switchButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, landed: false })}
                >
                  <Text
                    style={[
                      styles.switchText,
                      !formData.landed && styles.switchTextActive,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Rating */}
            <View style={styles.formRow}>
              <Text style={styles.label}>Rating (1-10)</Text>
              <TextInput
                style={styles.input}
                value={formData.rating}
                onChangeText={(text) =>
                  setFormData({ ...formData, rating: text })
                }
                keyboardType="numeric"
                placeholder="How well did it go?"
              />
            </View>

            {/* Location */}
            <View style={styles.formRow}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, location_name: text })
                }
                placeholder="e.g., Local park, Gym"
              />
            </View>

            {/* Surface Type */}
            <View style={styles.formRow}>
              <Text style={styles.label}>Surface Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.surfaceScroll}
              >
                {surfaceTypes.map((surface) => (
                  <TouchableOpacity
                    key={surface}
                    style={[
                      styles.surfaceChip,
                      formData.surface_type === surface &&
                        styles.surfaceChipActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, surface_type: surface })
                    }
                  >
                    <Text
                      style={[
                        styles.surfaceChipText,
                        formData.surface_type === surface &&
                          styles.surfaceChipTextActive,
                      ]}
                    >
                      {getSurfaceTypeLabel(surface)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Notes */}
            <View style={styles.formRow}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes: text })
                }
                placeholder="Any notes about this combo..."
                multiline
                numberOfLines={3}
              />
            </View>
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
              (submitting || sequence.length === 0) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={submitting || sequence.length === 0}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Log Combo</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 18,
    fontWeight: "400",
    color: "#000",
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 44,
  },
  body: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: {
    height: 8,
    backgroundColor: "#F5F5F5",
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#999",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 0,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  switchContainer: {
    flexDirection: "row",
    gap: 8,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 0,
    alignItems: "center",
  },
  switchButtonActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  switchText: {
    fontSize: 14,
    color: "#999",
  },
  switchTextActive: {
    color: "#fff",
    fontWeight: "400",
  },
  surfaceScroll: {
    flexDirection: "row",
  },
  surfaceChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 0,
    marginRight: 8,
  },
  surfaceChipActive: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  surfaceChipText: {
    fontSize: 13,
    color: "#999",
  },
  surfaceChipTextActive: {
    color: "#fff",
  },
  footer: {
    flexDirection: "row",
    gap: 0,
    padding: 0,
    borderTopWidth: 1,
    borderTopColor: "#D0D0D0",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 0,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FAFAFA",
    borderRightWidth: 1,
    borderRightColor: "#D0D0D0",
  },
  cancelButtonText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "400",
  },
  saveButton: {
    backgroundColor: "#333",
  },
  saveButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
