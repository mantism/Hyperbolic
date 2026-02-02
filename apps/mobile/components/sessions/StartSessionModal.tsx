import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSession } from "@/contexts/SessionContext";

interface StartSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StartSessionModal({
  visible,
  onClose,
  onSuccess,
}: StartSessionModalProps) {
  const { startSession } = useSession();
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setLocationName("");
    setNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleStart = async () => {
    setSubmitting(true);
    try {
      await startSession({
        locationName: locationName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error starting session:", error);
      Alert.alert("Error", "Failed to start session. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.title}>Start Session</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* Icon and description */}
          <View style={styles.iconSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="timer-outline" size={48} color="#007AFF" />
            </View>
            <Text style={styles.description}>
              Start a training session to group your trick and combo logs together.
            </Text>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Location (optional)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                value={locationName}
                onChangeText={setLocationName}
                placeholder="e.g., Gym, Park, Beach..."
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes for this session..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
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
            style={[styles.button, styles.startButton, submitting && styles.disabledButton]}
            onPress={handleStart}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.startButtonText}>Start Session</Text>
              </>
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
  iconSection: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 24,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9F9F9",
    gap: 8,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F9F9F9",
    minHeight: 100,
    paddingHorizontal: 14,
    paddingTop: 14,
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
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  startButton: {
    backgroundColor: "#007AFF",
  },
  startButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
