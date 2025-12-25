import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "@/lib/supabase/supabase";
import { UserTrick } from "@hyperbolic/shared-types";
import {
  SurfaceType,
  getAllSurfaceTypes,
  getSurfaceTypeLabel,
} from "@/lib/surfaceTypes";
import {
  createUserTrick,
  updateUserTrickStats,
  addLandedSurface,
} from "@/lib/services/userTrickService";

interface TrickLogModalProps {
  visible: boolean;
  userTrick?: UserTrick | null;
  trickId: string;
  userId: string;
  trickName?: string;
  onClose: () => void;
  onLogAdded?: () => void;
}

export default function TrickLogModal({
  visible,
  userTrick,
  trickId,
  userId,
  trickName,
  onClose,
  onLogAdded,
}: TrickLogModalProps) {
  const [formData, setFormData] = useState({
    reps: "1",
    rating: "",
    notes: "",
    location_name: "",
    surface_type: "",
    landed: true,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const handleAddLog = async () => {
    if (!formData.reps || parseInt(formData.reps) < 1) {
      Alert.alert("Error", "Please enter a valid number of reps");
      return;
    }

    setSubmitting(true);
    try {
      const reps = parseInt(formData.reps);
      let currentUserTrick = userTrick;

      // Create UserTrick record if it doesn't exist
      if (!currentUserTrick) {
        const newAttempts = reps;
        const newStomps = formData.landed ? reps : 0;
        const landedSurfaces =
          formData.surface_type && formData.landed
            ? [formData.surface_type]
            : [];

        currentUserTrick = await createUserTrick({
          userId,
          trickId,
          attempts: newAttempts,
          stomps: newStomps,
          landed: newStomps > 0,
          landedSurfaces,
        });
      } else {
        // Update existing UserTrick stats
        const currentAttempts = currentUserTrick.attempts || 0;
        const currentStomps = currentUserTrick.stomps || 0;

        const newAttempts = currentAttempts + reps;
        const newStomps = formData.landed
          ? currentStomps + reps
          : currentStomps;

        currentUserTrick = await updateUserTrickStats(currentUserTrick.id, {
          attempts: newAttempts,
          stomps: newStomps,
          landed: newStomps > 0,
        });

        // Update landedSurfaces if surface was provided and trick was landed
        if (formData.surface_type && formData.landed) {
          try {
            currentUserTrick = await addLandedSurface(
              currentUserTrick.id,
              formData.surface_type
            );
          } catch (error) {
            console.error("Error updating landed surfaces:", error);
            // Don't throw - log was created successfully, this is just a cache update
          }
        }
      }

      if (!currentUserTrick) {
        throw new Error("Failed to create or retrieve UserTrick record");
      }

      // Insert the log
      const { error: logError } = await supabase.from("TrickLogs").insert({
        user_trick_id: currentUserTrick.id,
        reps: reps,
        rating: formData.rating ? parseInt(formData.rating) : null,
        notes: formData.notes || null,
        location_name: formData.location_name || null,
        surface_type: formData.surface_type || null,
        landed: formData.landed,
      });

      if (logError) {
        throw logError;
      }

      // Reset form and close
      setFormData({
        reps: "1",
        rating: "",
        notes: "",
        location_name: "",
        surface_type: "",
        landed: true,
      });
      onLogAdded?.();
      onClose();
    } catch (error) {
      console.error("Error adding log:", error);
      Alert.alert("Error", "Failed to add log. Please try again.");
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
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            disabled={submitting}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Log {trickName || "Trick"}</Text>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.formRow}>
          <Text style={styles.label}>Reps *</Text>
          <TextInput
            style={styles.input}
            value={formData.reps}
            onChangeText={(text) => setFormData({ ...formData, reps: text })}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

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

        <View style={styles.formRow}>
          <Text style={styles.label}>Rating (1-10)</Text>
          <TextInput
            style={styles.input}
            value={formData.rating}
            onChangeText={(text) => setFormData({ ...formData, rating: text })}
            keyboardType="numeric"
            placeholder="How well did it go?"
          />
        </View>

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
                  formData.surface_type === surface && styles.surfaceChipActive,
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

        <View style={styles.formRow}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Any notes about this session..."
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.saveButton,
            submitting && styles.disabledButton,
          ]}
          onPress={handleAddLog}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Log</Text>
          )}
        </TouchableOpacity>
      </View>
      </View>
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
    padding: 16,
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
