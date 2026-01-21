import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  SequenceItem,
  TrickItem,
  ArrowItem,
  Trick,
} from "@hyperbolic/shared-types";
import {
  removeSequenceItem,
  sequenceToComboGraph,
} from "../lib/utils/comboRendering";
import { createUserCombo } from "@/lib/services/userComboService";
import { createTrick } from "@/lib/utils/createTrick";
import DraggableComboChip, { ChipMeasurement } from "./DraggableComboChip";
import ComboChip from "./ComboChip";
import TrickSuggestionChips from "./TrickSuggestionChips";
import ComboModifierButtons from "./ComboModifierButtons";
import TrashZone from "./TrashZone";

interface ComboComposerProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

// State for the floating drag overlay
interface DragState {
  index: number;
  type: "trick" | "transition";
  label: string;
  currentX: number;
  currentY: number;
  // Offset from finger to chip's top-left corner (captured at drag start)
  offsetX: number;
  offsetY: number;
}

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
  const [customName, setCustomName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [trashZoneBounds, setTrashZoneBounds] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Track the container's position for accurate floating chip positioning
  const containerRef = useRef<View>(null);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  // Store measurements for each chip by their sequence index
  const chipMeasurementsRef = useRef<Map<number, ChipMeasurement>>(new Map());

  // Callback to store chip measurements when they report their layout
  const handleChipMeasure = useCallback(
    (index: number, measurement: ChipMeasurement) => {
      chipMeasurementsRef.current.set(index, measurement);
    },
    []
  );

  // Clear stale measurements when sequence changes
  // (measurements for indices that no longer exist)
  const clearStaleMeasurements = useCallback(() => {
    const currentIndices = new Set(sequence.map((_, i) => i));
    chipMeasurementsRef.current.forEach((_, index) => {
      if (!currentIndices.has(index)) {
        chipMeasurementsRef.current.delete(index);
      }
    });
  }, [sequence]);

  // Measure container position for floating chip offset calculation
  const handleContainerLayout = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        setContainerOffset({ x: pageX, y: pageY });
      });
    }
  }, []);

  // Auto-generate combo name from first and last tricks
  const generatedName = useMemo(() => {
    const tricks = sequence
      .filter((item): item is TrickItem => item.type === "trick")
      .map((item) => item.data.trick_id);

    if (tricks.length === 0) return "";
    if (tricks.length === 1) return `${tricks[0]} Combo`;
    return `${tricks[0]} to ${tricks[tricks.length - 1]} Combo`;
  }, [sequence]);

  // Use custom name if user has typed one, otherwise use generated name
  const comboName = customName ?? generatedName;

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
  };

  const handleCreateCustomTrick = (trickName: string) => {
    const customTrick = createTrick({
      id: trickName.toLowerCase().replace(/\s+/g, "-"),
      name: trickName,
      aliases: [],
    });
    handleSelectTrick(customTrick);
  };

  const handleTransitionPress = (transitionId: string) => {
    // Need at least one trick in sequence
    if (sequence.length === 0) {
      return;
    }

    const lastItem = sequence[sequence.length - 1];

    // If last item is already an arrow, update its transition_id
    if (lastItem.type === "arrow") {
      const updatedSequence = [...sequence];
      updatedSequence[updatedSequence.length - 1] = {
        ...lastItem,
        transition_id: transitionId,
      };
      setSequence(updatedSequence);
      return;
    }

    // Otherwise add a new arrow with the transition_id
    const arrowItem: ArrowItem = {
      id: `${Date.now()}-arrow`,
      type: "arrow",
      transition_id: transitionId,
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
    setSequence(removeSequenceItem(sequence, index));
    // Clear stale measurements after sequence change
    clearStaleMeasurements();
  };

  // Get label for a sequence item
  const getLabelForItem = useCallback((item: SequenceItem): string => {
    if (item.type === "trick") {
      const comboNode = item.data;
      return comboNode.landing_stance
        ? `${comboNode.trick_id} (${comboNode.landing_stance})`
        : comboNode.trick_id;
    }
    if (item.type === "arrow" && item.transition_id) {
      return item.transition_id;
    }
    return "";
  }, []);

  // Drag handlers for reordering
  const handleDragStart = useCallback(
    (index: number, absoluteX: number, absoluteY: number) => {
      const item = sequence[index];
      if (!item) return;

      const label = getLabelForItem(item);
      const chipType = item.type === "trick" ? "trick" : "transition";

      // Get the chip's measured position to calculate offset
      const measurement = chipMeasurementsRef.current.get(index);
      const offsetX = measurement ? absoluteX - measurement.pageX : 0;
      const offsetY = measurement ? absoluteY - measurement.pageY : 0;

      setDragState({
        index,
        type: chipType,
        label,
        currentX: absoluteX,
        currentY: absoluteY,
        offsetX,
        offsetY,
      });
    },
    [sequence, getLabelForItem]
  );

  const handleDragMove = useCallback((absoluteX: number, absoluteY: number) => {
    setDragState((prev) => {
      if (!prev) return null;
      return { ...prev, currentX: absoluteX, currentY: absoluteY };
    });
  }, []);

  const handleDragEnd = useCallback((index: number) => {
    setDragState(null);
  }, []);

  const handleSave = async () => {
    if (sequence.length === 0) {
      return;
    }

    try {
      setSaving(true);

      // Convert sequence to ComboGraph
      const comboGraph = sequenceToComboGraph(sequence);

      await createUserCombo({
        userId,
        name: comboName || generatedName,
        comboGraph,
      });

      // Reset and notify parent
      setSequence([]);
      setSearchText("");
      setCustomName("");
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
      if (!item.transition_id) {
        return null;
      }

      return (
        <DraggableComboChip
          key={item.id}
          type="transition"
          label={item.transition_id}
          index={index}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDelete={() => handleRemoveItem(index)}
          onMeasure={handleChipMeasure}
          trashZoneBounds={trashZoneBounds ?? undefined}
        />
      );
    }

    if (item.type === "trick") {
      const comboNode = item.data;
      const label = comboNode.landing_stance
        ? `${comboNode.trick_id} (${comboNode.landing_stance})`
        : comboNode.trick_id;

      return (
        <DraggableComboChip
          key={item.id}
          type="trick"
          label={label}
          index={index}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onDelete={() => handleRemoveItem(index)}
          onMeasure={handleChipMeasure}
          trashZoneBounds={trashZoneBounds ?? undefined}
        />
      );
    }

    return null;
  };

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={handleContainerLayout}
    >
      <GestureHandlerRootView style={styles.gestureContainer}>
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
              onChangeText={(text) => setCustomName(text || null)}
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

        {/* Trash Zone - absolutely positioned over modifier buttons */}
        {dragState && (
          <View style={styles.trashZoneContainer}>
            <TrashZone visible={!!dragState} onLayout={setTrashZoneBounds} />
          </View>
        )}
      </GestureHandlerRootView>

      {/* Floating overlay chip that follows the finger during drag */}
      {dragState && (
        <View
          style={[
            styles.floatingChip,
            {
              // Position chip so finger stays at same relative position as when drag started
              // Subtract container offset since absolute positioning is relative to container
              left: dragState.currentX - dragState.offsetX - containerOffset.x,
              top: dragState.currentY - dragState.offsetY - containerOffset.y,
            },
          ]}
          pointerEvents="none"
        >
          <ComboChip type={dragState.type} label={dragState.label} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  gestureContainer: {
    flex: 1,
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
  trashZoneContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
  },
  floatingChip: {
    position: "absolute",
    zIndex: 1000,
    // Add shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
