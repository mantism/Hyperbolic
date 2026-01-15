import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Trick, ComboTrick } from "@hyperbolic/shared-types";
import { createUserCombo } from "@/lib/services/userComboService";
import ComboChip from "./ComboChip";
import TrickSuggestionChips from "./TrickSuggestionChips";
import ComboModifierButtons from "./ComboModifierButtons";

interface ComboComposerProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

type SequenceItem = {
  id: string;
  type: "trick" | "transition" | "stance" | "arrow";
  data: ComboTrick | { value: string };
};

/**
 * Inline combo composer for creating new combos
 * Allows typing trick names with autocomplete and inserting transitions/stances
 */
export default function ComboComposer({
  userId,
  onSave,
  onCancel,
}: ComboComposerProps) {
  const [searchText, setSearchText] = useState("");
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [comboName, setComboName] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-generate combo name from tricks
  const generateComboName = (items: SequenceItem[]): string => {
    const tricks = items
      .filter((item) => item.type === "trick")
      .map((item) => (item.data as ComboTrick).trick_id)
      .slice(0, 2); // Use first 2 tricks

    if (tricks.length === 0) return "";
    if (tricks.length === 1) return `${tricks[0]} Combo`;
    return `${tricks[0]} to ${tricks[1]} Combo`;
  };

  const handleSelectTrick = (trick: Trick) => {
    const newItem: SequenceItem = {
      id: `${Date.now()}-trick`,
      type: "trick",
      data: { trick_id: trick.id },
    };

    const updatedSequence = [...sequence, newItem];

    // Add arrow separator if not the first trick
    if (sequence.length > 0) {
      const arrowItem: SequenceItem = {
        id: `${Date.now()}-arrow`,
        type: "arrow",
        data: { value: "→" },
      };
      updatedSequence.splice(updatedSequence.length - 1, 0, arrowItem);
    }

    setSequence(updatedSequence);
    setSearchText("");

    // Auto-generate name if not manually set
    if (!comboName) {
      setComboName(generateComboName(updatedSequence));
    }
  };

  const handleTransitionPress = (transition: string) => {
    if (sequence.length === 0) return;

    const lastItem = sequence[sequence.length - 1];
    if (lastItem.type !== "trick") return;

    // Update the last trick with transition
    const updatedSequence = [...sequence];
    const lastTrickData = lastItem.data as ComboTrick;
    updatedSequence[updatedSequence.length - 1] = {
      ...lastItem,
      data: { ...lastTrickData, transition },
    };

    setSequence(updatedSequence);
  };

  const handleStancePress = (stance: string) => {
    if (sequence.length === 0) return;

    const lastItem = sequence[sequence.length - 1];
    if (lastItem.type !== "trick") return;

    // Update the last trick with landing stance
    const updatedSequence = [...sequence];
    const lastTrickData = lastItem.data as ComboTrick;
    updatedSequence[updatedSequence.length - 1] = {
      ...lastItem,
      data: { ...lastTrickData, landing_stance: stance },
    };

    setSequence(updatedSequence);
  };

  const handleRemoveItem = (index: number) => {
    const updatedSequence = sequence.filter((_, i) => i !== index);
    setSequence(updatedSequence);

    // Regenerate name if auto-generated
    if (!comboName || comboName.includes("Combo")) {
      setComboName(generateComboName(updatedSequence));
    }
  };

  const handleSave = async () => {
    if (sequence.length === 0) {
      return;
    }

    try {
      setSaving(true);

      // Extract only tricks from sequence (filter out arrows)
      const trickSequence: ComboTrick[] = sequence
        .filter((item) => item.type === "trick")
        .map((item) => item.data as ComboTrick);

      console.log("Saving combo for user:", userId);

      await createUserCombo({
        userId,
        name: comboName || generateComboName(sequence),
        trickSequence,
      });

      // Reset and notify parent
      setSequence([]);
      setSearchText("");
      setComboName("");
      onSave();
    } catch (error) {
      console.error("Error saving combo:", error);
      alert("Failed to save combo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderSequenceItem = (item: SequenceItem, index: number) => {
    if (item.type === "arrow") {
      return <ComboChip key={item.id} type="arrow" label="→" />;
    }

    if (item.type === "trick") {
      const trickData = item.data as ComboTrick;
      return (
        <View key={item.id} style={styles.trickGroup}>
          <ComboChip
            type="trick"
            label={trickData.trick_id}
            onRemove={() => handleRemoveItem(index)}
          />
          {trickData.transition && (
            <ComboChip type="transition" label={trickData.transition} />
          )}
          {trickData.landing_stance && (
            <ComboChip type="stance" label={`(${trickData.landing_stance})`} />
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
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
            onChangeText={setComboName}
          />
        </View>

        {/* Sequence Display */}
        {sequence.length > 0 && (
          <View style={styles.sequenceContainer}>
            {sequence.map((item, index) => renderSequenceItem(item, index))}
          </View>
        )}

        {/* Trick Search Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type trick name..."
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Trick Suggestions */}
        <TrickSuggestionChips
          searchText={searchText}
          onSelectTrick={handleSelectTrick}
        />

        {/* Modifier Buttons */}
        <ComboModifierButtons
          onTransitionPress={handleTransitionPress}
          onStancePress={handleStancePress}
          disabled={sequence.length === 0}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (sequence.length === 0 || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={sequence.length === 0 || saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Combo"}
          </Text>
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  nameInputContainer: {
    marginBottom: 12,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#F9F9F9",
  },
  sequenceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  trickGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: "#CCC",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
