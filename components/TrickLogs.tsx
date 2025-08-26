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
import { Database } from "@/lib/supabase/database.types";
import { format } from "date-fns";
import { SurfaceType, getAllSurfaceTypes, getSurfaceTypeLabel } from "@/lib/surfaceTypes";

type TrickLog = Database["public"]["Tables"]["tricklogs"]["Row"];
type UserTrick = Database["public"]["Tables"]["UserToTricksTable"]["Row"];

interface TrickLogsProps {
  userTrick: UserTrick;
  onLogAdded?: () => void;
}

export default function TrickLogs({ userTrick, onLogAdded }: TrickLogsProps) {
  const [logs, setLogs] = useState<TrickLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
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
  }, [userTrick.id]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("tricklogs")
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
      
      // Insert the log
      const { error: logError } = await supabase.from("tricklogs").insert({
        user_trick_id: userTrick.id,
        reps: reps,
        rating: formData.rating ? parseInt(formData.rating) : null,
        notes: formData.notes || null,
        location_name: formData.location_name || null,
        surface_type: formData.surface_type || null,
        landed: formData.landed,
      });

      if (logError) throw logError;

      // Update the UserToTricksTable stats
      const currentAttempts = userTrick.attempts || 0;
      const currentStomps = userTrick.stomps || 0;
      
      // Each rep counts as an attempt
      const newAttempts = currentAttempts + reps;
      // If landed, each rep also counts as a stomp
      const newStomps = formData.landed ? currentStomps + reps : currentStomps;
      
      const { error: updateError } = await supabase
        .from("UserToTricksTable")
        .update({
          attempts: newAttempts,
          stomps: newStomps,
          landed: newStomps > 0, // Update landed status if they've stomped it
        })
        .eq("id", userTrick.id);

      if (updateError) throw updateError;

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
          <ActivityIndicator size="small" color="#007AFF" />
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
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Log</Text>
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

              {log.notes && (
                <Text style={styles.notes}>{log.notes}</Text>
              )}
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
              <Text style={styles.modalTitle}>Log Trick Session</Text>
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
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  header: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  logsList: {
    padding: 12,
  },
  logItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
  },
  logDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
  },
  notes: {
    fontSize: 13,
    color: "#333",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalBody: {
    padding: 16,
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f8f8",
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
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 8,
    alignItems: "center",
  },
  switchButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  switchText: {
    fontSize: 16,
    color: "#666",
  },
  switchTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  surfaceScroll: {
    flexDirection: "row",
  },
  surfaceChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    borderRadius: 20,
    marginRight: 8,
  },
  surfaceChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  surfaceChipText: {
    fontSize: 14,
    color: "#666",
  },
  surfaceChipTextActive: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});