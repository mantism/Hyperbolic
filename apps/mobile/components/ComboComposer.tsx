import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Trick, ComboTrick } from "@hyperbolic/shared-types";
import { createUserCombo } from "@/lib/services/userComboService";
import { createTrick } from "@/lib/utils/createTrick";
import DraggableComboChip from "./DraggableComboChip";
import TrickSuggestionChips from "./TrickSuggestionChips";
import ComboModifierButtons from "./ComboModifierButtons";
import TrashZone from "./TrashZone";

interface ComboComposerProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

type TrickItem = {
  id: string;
  type: "trick";
  data: ComboTrick;
};

type ArrowItem = {
  id: string;
  type: "arrow";
  transition?: string;
};

type SequenceItem = TrickItem | ArrowItem;

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
  const [isDragging, setIsDragging] = useState(false);
  const [trashZoneY, setTrashZoneY] = useState(0);

  // Auto-generate combo name from tricks
  const generateComboName = (items: SequenceItem[]): string => {
    const tricks = items
      .filter((item): item is TrickItem => item.type === "trick")
      .map((item) => item.data.trick_id)
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

    const updatedSequence = [...sequence];

    // Add arrow separator if not the first trick
    if (sequence.length > 0) {
      const arrowItem: SequenceItem = {
        id: `${Date.now()}-arrow`,
        type: "arrow",
      };
      updatedSequence.push(arrowItem);
    }

    updatedSequence.push(newItem);
    setSequence(updatedSequence);
    setSearchText("");

    // Auto-generate name if not manually set
    if (!comboName) {
      setComboName(generateComboName(updatedSequence));
    }
  };

  const handleCreateCustomTrick = (trickName: string) => {
    const customTrick = createTrick({
      id: trickName.toLowerCase().replace(/\s+/g, "-"),
      name: trickName,
      aliases: [],
    });
    handleSelectTrick(customTrick);
  };

  const handleTransitionPress = (transition: string) => {
    // Need at least one trick in sequence
    if (sequence.length === 0) {
      return;
    }

    const lastItem = sequence[sequence.length - 1];

    // If last item is already an arrow, update its transition
    if (lastItem.type === "arrow") {
      const updatedSequence = [...sequence];
      updatedSequence[updatedSequence.length - 1] = {
        ...lastItem,
        transition,
      };
      setSequence(updatedSequence);
      return;
    }

    // Otherwise add a new arrow with the transition
    const arrowItem: ArrowItem = {
      id: `${Date.now()}-arrow`,
      type: "arrow",
      transition,
    };

    setSequence([...sequence, arrowItem]);
  };

  const handleStancePress = (stance: string) => {
    if (sequence.length === 0) return;

    const lastItem = sequence[sequence.length - 1];
    if (lastItem.type !== "trick") return;

    // Update the last trick with landing stance
    const updatedSequence = [...sequence];
    updatedSequence[updatedSequence.length - 1] = {
      ...lastItem,
      data: { ...lastItem.data, landing_stance: stance },
    };

    setSequence(updatedSequence);
  };

  const handleRemoveItem = (index: number) => {
    let updatedSequence = sequence.filter((_, i) => i !== index);

    // Clean up orphaned arrows
    // Remove arrow before the deleted item if it exists
    if (index > 0 && updatedSequence[index - 1]?.type === "arrow") {
      updatedSequence = updatedSequence.filter((_, i) => i !== index - 1);
    }
    // Remove arrow after the deleted item if it exists and is now at the start
    else if (
      updatedSequence.length > 0 &&
      updatedSequence[0]?.type === "arrow"
    ) {
      updatedSequence = updatedSequence.filter((_, i) => i !== 0);
    }

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
      const trickSequence = sequence
        .filter((item): item is TrickItem => item.type === "trick")
        .map((item) => item.data);

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
      // Only render arrows that have transitions
      if (!item.transition) {
        return null;
      }

      return (
        <DraggableComboChip
          key={item.id}
          type="transition"
          label={item.transition}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onDelete={() => handleRemoveItem(index)}
          trashZoneY={trashZoneY}
        />
      );
    }

    if (item.type === "trick") {
      const comboTrick = item.data;
      const label = comboTrick.landing_stance
        ? `${comboTrick.trick_id} (${comboTrick.landing_stance})`
        : comboTrick.trick_id;

      return (
        <DraggableComboChip
          key={item.id}
          type="trick"
          label={label}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onDelete={() => handleRemoveItem(index)}
          trashZoneY={trashZoneY}
        />
      );
    }

    return null;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.content}>
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
            onSubmitEditing={() => {
              if (searchText.trim()) {
                handleCreateCustomTrick(searchText.trim());
              }
            }}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>

        {/* Trick Suggestions */}
        <TrickSuggestionChips
          searchText={searchText}
          onSelectTrick={handleSelectTrick}
          onCreateCustom={handleCreateCustomTrick}
        />

        {/* Modifier Buttons */}
        <ComboModifierButtons
          onTransitionPress={handleTransitionPress}
          onStancePress={handleStancePress}
          transitionsDisabled={sequence.length === 0}
          stancesDisabled={
            sequence.length === 0 ||
            sequence[sequence.length - 1]?.type !== "trick"
          }
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

      {/* Trash Zone */}
      <TrashZone visible={isDragging} onLayout={setTrashZoneY} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  content: {
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
