import React, { useState, useMemo } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SequenceItem, TrickItem } from "@hyperbolic/shared-types";
import { sequenceToComboGraph } from "@/lib/utils/comboRendering";
import { createUserCombo } from "@/lib/services/userComboService";
import ComboComposer from "./ComboComposer";

interface NewComboComposerProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Wrapper around ComboComposer that includes the header and name input
 * for creating new combos.
 */
export default function NewComboComposer({
  userId,
  onSave,
  onCancel,
}: NewComboComposerProps) {
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [customName, setCustomName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-generate combo name from first and last tricks
  const generatedName = useMemo(() => {
    const tricks = sequence
      .filter((item): item is TrickItem => item.type === "trick")
      .map((item) => item.data.trick_id);

    if (tricks.length === 0) {
      return "";
    }
    if (tricks.length === 1) {
      return `${tricks[0]} Combo`;
    }

    return `${tricks[0]} to ${tricks[tricks.length - 1]} Combo`;
  }, [sequence]);

  // Use custom name if user has edited the field, otherwise use generated name
  const comboName = customName !== null ? customName : generatedName;

  const handleSequenceChange = (newSequence: SequenceItem[]) => {
    setSequence(newSequence);
  };

  const handleSave = async (finalSequence: SequenceItem[]) => {
    if (finalSequence.length === 0) {
      return;
    }

    try {
      setSaving(true);

      // Convert sequence to ComboGraph
      const comboGraph = sequenceToComboGraph(finalSequence);

      await createUserCombo({
        userId,
        name: comboName || generatedName,
        comboGraph,
      });

      onSave();
    } catch (error) {
      console.error("Error saving combo:", error);
      alert("Failed to save combo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Create Combo</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={8}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Combo Name Input */}
      <View style={styles.nameInputContainer}>
        <TextInput
          style={styles.nameInput}
          placeholder="Combo name (optional)"
          value={comboName}
          onChangeText={setCustomName}
        />
      </View>

      {/* Combo Composer */}
      <ComboComposer
        onSequenceChange={handleSequenceChange}
        onSave={handleSave}
        onCancel={onCancel}
        saving={saving}
        saveButtonText="Save Combo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  nameInputContainer: {
    paddingVertical: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#F9F9F9",
  },
});
