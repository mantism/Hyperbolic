import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { supabase } from "@/lib/supabase/supabase";
import { Database } from "@hyperbolic/shared-types";
import { format } from "date-fns";
import {
  SurfaceType,
  getAllSurfaceTypes,
  getSurfaceTypeLabel,
} from "@/lib/surfaceTypes";

type TrickLog = Database["public"]["Tables"]["TrickLogs"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricks"]["Row"];

interface TrickLogsProps {
  userTrick?: UserTrick | null;
  trickId: string;
  userId: string;
  onLogAdded?: () => void;
  trickName?: string;
  showAddModal?: boolean;
  onCloseModal?: () => void;
}

export default function TrickLogs({
  userTrick,
  trickId,
  userId,
  onLogAdded,
  trickName,
  showAddModal: externalShowModal,
  onCloseModal,
}: TrickLogsProps) {
  const [logs, setLogs] = useState<TrickLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalShowModal, setInternalShowModal] = useState(false);

  const showAddModal =
    externalShowModal !== undefined ? externalShowModal : internalShowModal;
  const setShowAddModal = (value: boolean) => {
    if (externalShowModal !== undefined && onCloseModal) {
      if (!value) onCloseModal();
    } else {
      setInternalShowModal(value);
    }
  };
  const [formData, setFormData] = useState({
    reps: "1",
    rating: "",
    notes: "",
    location_name: "",
    surface_type: "",
    landed: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [userTrick?.id]);

  const fetchLogs = async () => {
    if (!userTrick?.id) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("TrickLogs")
        .select("*")
        .eq("user_trick_id", userTrick.id)
        .order("logged_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

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

        const { data: newUserTrick, error: createError } = await supabase
          .from("UserToTricks")
          .insert({
            userID: userId,
            trickID: trickId,
            attempts: newAttempts,
            stomps: newStomps,
            landed: newStomps > 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        currentUserTrick = newUserTrick;
      } else {
        // Update existing UserTrick stats
        const currentAttempts = currentUserTrick.attempts || 0;
        const currentStomps = currentUserTrick.stomps || 0;

        const newAttempts = currentAttempts + reps;
        const newStomps = formData.landed
          ? currentStomps + reps
          : currentStomps;

        const { error: updateError } = await supabase
          .from("UserToTricks")
          .update({
            attempts: newAttempts,
            stomps: newStomps,
            landed: newStomps > 0,
          })
          .eq("id", currentUserTrick.id);

        if (updateError) {
          throw updateError;
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

      // Reset form and refresh
      setFormData({
        reps: "1",
        rating: "",
        notes: "",
        location_name: "",
        surface_type: "",
        landed: true,
      });
      setShowAddModal(false);
      fetchLogs();
      onLogAdded?.();
    } catch (error) {
      console.error("Error adding log:", error);
      Alert.alert("Error", "Failed to add log. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const surfaceTypes = getAllSurfaceTypes();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#333" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RECENT LOGS</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color="#333" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No detailed logs yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "Add Log" to record a session with notes and details
          </Text>
        </View>
      ) : (
        <View style={styles.logsList}>
          {logs.map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={styles.logDate}>
                  {format(new Date(log.logged_at), "MMM d, yyyy")}
                </Text>
                {log.rating && (
                  <View style={styles.rating}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.ratingText}>{log.rating}/10</Text>
                  </View>
                )}
              </View>

              <View style={styles.logDetails}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Reps:</Text>
                  <Text style={styles.statValue}>{log.reps}</Text>
                </View>
                {log.landed !== null && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Landed:</Text>
                    <Ionicons
                      name={log.landed ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={log.landed ? "#10B981" : "#EF4444"}
                    />
                  </View>
                )}
                {log.surface_type && (
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Surface:</Text>
                    <Text style={styles.statValue}>
                      {getSurfaceTypeLabel(log.surface_type as SurfaceType)}
                    </Text>
                  </View>
                )}
              </View>

              {log.location_name && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.locationText}>{log.location_name}</Text>
                </View>
              )}

              {log.notes && <Text style={styles.notes}>{log.notes}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Add Log Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log {trickName || "Trick"}</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                disabled={submitting}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formRow}>
                <Text style={styles.label}>Reps *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.reps}
                  onChangeText={(text) =>
                    setFormData({ ...formData, reps: text })
                  }
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
                  onChangeText={(text) =>
                    setFormData({ ...formData, rating: text })
                  }
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

              <View style={styles.formRow}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Any notes about this session..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    borderRadius: 0,
    marginBottom: 32,
    overflow: "hidden",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  header: {
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    color: "#999",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "400",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#D0D0D0",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#CCC",
    textAlign: "center",
  },
  logsList: {
    padding: 0,
  },
  logItem: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logDate: {
    fontSize: 13,
    fontWeight: "400",
    color: "#000",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: "#999",
  },
  logDetails: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: "#999",
  },
  notes: {
    fontSize: 13,
    color: "#666",
    fontStyle: "normal",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#D0D0D0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "400",
    color: "#000",
    letterSpacing: -0.3,
  },
  modalBody: {
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
  modalFooter: {
    flexDirection: "row",
    gap: 0,
    padding: 0,
    borderTopWidth: 1,
    borderTopColor: "#D0D0D0",
  },
  modalButton: {
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
