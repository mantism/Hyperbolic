import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  LayoutAnimation,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
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
  moveTrickToPosition,
} from "../lib/utils/comboRendering";
import { createUserCombo } from "@/lib/services/userComboService";
import { createTrick } from "@/lib/utils/createTrick";
import ComboChip from "./ComboChip";
import TappableTransitionChip from "./TappableTransitionChip";
import TrickSuggestionChips from "./TrickSuggestionChips";
import ComboModifierButtons from "./ComboModifierButtons";
import TrashZone from "./TrashZone";

interface ComboComposerProps {
  userId: string;
  onSave: () => void;
  onCancel: () => void;
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
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
  // True if this is a new trick being dragged from suggestions (not a reorder)
  isInsertDrag: boolean;
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
  const [trashZoneBounds, setTrashZoneBounds] = useState<Bounds | null>(null);
  const [sequenceContainerBounds, setSequenceContainerBounds] =
    useState<Bounds | null>(null);
  const sequenceContainerRef = useRef<View>(null);

  // Track the container's position for accurate floating chip positioning
  const containerRef = useRef<View>(null);
  const [containerOffset, setContainerOffset] = useState({ x: 0, y: 0 });

  // Store refs for each chip by their sequence index (for measurement)
  const chipRefsRef = useRef<Map<number, View>>(new Map());
  // Cached measurements - refreshed at drag start
  const chipMeasurementsRef = useRef<Map<number, Bounds>>(new Map());

  // Use refs to track current state for gesture handlers (avoids stale closures)
  const sequenceRef = useRef<SequenceItem[]>(sequence);
  sequenceRef.current = sequence;

  const dragIndexRef = useRef<number | null>(null);
  const isInsertDragRef = useRef(false);

  // Measure all chips and cache results (called at drag start)
  const measureAllChips = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const entries = Array.from(chipRefsRef.current.entries());
      if (entries.length === 0) {
        resolve();
        return;
      }

      let remaining = entries.length;
      chipMeasurementsRef.current.clear();

      entries.forEach(([index, view]) => {
        view.measure((x, y, width, height, pageX, pageY) => {
          if (width > 0 && height > 0) {
            chipMeasurementsRef.current.set(index, {
              x: pageX,
              y: pageY,
              width,
              height,
            });
          }
          remaining--;
          if (remaining === 0) {
            resolve();
          }
        });
      });
    });
  }, []);

  // Measure container position for floating chip offset calculation
  const handleContainerLayout = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.measure((x, y, width, height, pageX, pageY) => {
        setContainerOffset({ x: pageX, y: pageY });
      });
    }
  }, []);

  // Measure sequence container for insert drag drop detection
  const handleSequenceContainerLayout = useCallback(() => {
    if (sequenceContainerRef.current) {
      sequenceContainerRef.current.measure(
        (x, y, width, height, pageX, pageY) => {
          setSequenceContainerBounds({ x: pageX, y: pageY, width, height });
        }
      );
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

  // Find which chip (trick only) was tapped based on coordinates
  // Measures all chips fresh, caches them, and returns the tapped index
  const findTappedChipIndex = useCallback(
    async (tapX: number, tapY: number): Promise<number | null> => {
      // Measure all chips fresh
      await measureAllChips();

      const currentSequence = sequenceRef.current;
      // Get only trick indices
      const trickIndices = currentSequence
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.type === "trick")
        .map(({ index }) => index);

      for (const index of trickIndices) {
        const measurement = chipMeasurementsRef.current.get(index);
        if (!measurement) continue;

        const { x, y, width, height } = measurement;
        if (tapX >= x && tapX <= x + width && tapY >= y && tapY <= y + height) {
          return index;
        }
      }
      return null;
    },
    [measureAllChips]
  );

  // Handle drag from suggestion chips - insert trick and start dragging it
  const handleDragFromSuggestion = useCallback(
    (trick: Trick, absoluteX: number, absoluteY: number) => {
      // Create the new trick item
      const newItem: TrickItem = {
        id: `${Date.now()}-trick`,
        type: "trick",
        data: { trick_id: trick.id },
      };

      // Insert at the end of the sequence
      const currentSequence = sequenceRef.current;
      let newIndex: number;

      if (currentSequence.length === 0) {
        // First trick - just add it
        setSequence([newItem]);
        newIndex = 0;
      } else {
        // Add arrow separator then the trick
        const arrowItem: ArrowItem = {
          id: `${Date.now()}-arrow`,
          type: "arrow",
        };
        setSequence([...currentSequence, arrowItem, newItem]);
        newIndex = currentSequence.length + 1; // After existing items + arrow
      }

      // Set the drag refs immediately
      dragIndexRef.current = newIndex;
      isInsertDragRef.current = true;

      // Start the drag state (no offset since we don't have a chip to measure yet)
      setDragState({
        index: newIndex,
        type: "trick",
        label: trick.id,
        currentX: absoluteX,
        currentY: absoluteY,
        offsetX: 0,
        offsetY: 0,
        isInsertDrag: true,
      });

      // Measure chips after the new chip renders (for hover detection during drag)
      requestAnimationFrame(() => {
        measureAllChips();
      });
    },
    [measureAllChips]
  );

  // Drag handlers for reordering
  const handleDragStart = useCallback(
    (
      index: number,
      absoluteX: number,
      absoluteY: number,
      isInsertDrag: boolean = false
    ) => {
      const item = sequenceRef.current[index];
      if (!item) {
        return;
      }

      const label = getLabelForItem(item);
      const chipType = item.type === "trick" ? "trick" : "transition";

      // Get the chip's measured position to calculate offset
      const measurement = chipMeasurementsRef.current.get(index);
      const offsetX = measurement ? absoluteX - measurement.x : 0;
      const offsetY = measurement ? absoluteY - measurement.y : 0;

      // Set the ref immediately for use in handleDragMove
      dragIndexRef.current = index;

      setDragState({
        index,
        type: chipType,
        label,
        currentX: absoluteX,
        currentY: absoluteY,
        offsetX,
        offsetY,
        isInsertDrag,
      });
    },
    [getLabelForItem]
  );

  // Find which trick position the finger is hovering over
  // Returns the trick position (0 = first trick, 1 = second trick, etc.)
  const findHoverTrickPosition = useCallback(
    (
      absoluteX: number,
      absoluteY: number,
      currentSequence: SequenceItem[],
      draggingIndex: number
    ): number | null => {
      // Get all tricks with their indices
      const tricks = currentSequence
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.type === "trick");

      for (let trickPos = 0; trickPos < tricks.length; trickPos++) {
        const { index } = tricks[trickPos];

        // Skip the trick being dragged
        if (index === draggingIndex) continue;

        const measurement = chipMeasurementsRef.current.get(index);
        if (!measurement) continue;

        // Check if finger is within this chip's bounds
        const { x, y, width, height } = measurement;
        if (
          absoluteX >= x &&
          absoluteX <= x + width &&
          absoluteY >= y &&
          absoluteY <= y + height
        ) {
          return trickPos;
        }
      }
      return null;
    },
    []
  );

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const currentDragIndex = dragIndexRef.current;
      if (currentDragIndex === null) return;

      const currentSequence = sequenceRef.current;
      const hoverTrickPosition = findHoverTrickPosition(
        absoluteX,
        absoluteY,
        currentSequence,
        currentDragIndex
      );

      if (hoverTrickPosition !== null) {
        // Move the trick to the new position
        const result = moveTrickToPosition(
          currentSequence,
          currentDragIndex,
          hoverTrickPosition
        );

        // Only update if the sequence actually changed
        if (result.newIndex !== currentDragIndex) {
          // Animate the layout change for smooth reflow
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

          // Update the ref immediately so subsequent moves use correct index
          dragIndexRef.current = result.newIndex;

          // Update both states together
          setSequence(result.sequence);
          setDragState((prev) =>
            prev
              ? {
                  ...prev,
                  currentX: absoluteX,
                  currentY: absoluteY,
                  index: result.newIndex,
                }
              : null
          );
          return;
        }
      }

      // Just update position if no reorder happened
      setDragState((prev) =>
        prev ? { ...prev, currentX: absoluteX, currentY: absoluteY } : null
      );
    },
    [findHoverTrickPosition]
  );

  const handleDragEnd = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const dragIndex = dragIndexRef.current;
      const isInsertDrag = isInsertDragRef.current;

      if (dragIndex !== null) {
        if (isInsertDrag) {
          // Insert drag: check if dropped outside sequence container → cancel
          if (sequenceContainerBounds) {
            const { x, y, width, height } = sequenceContainerBounds;
            const isInSequenceContainer =
              absoluteX >= x &&
              absoluteX <= x + width &&
              absoluteY >= y &&
              absoluteY <= y + height;

            if (!isInSequenceContainer) {
              // Dropped outside - cancel the insert
              setSequence((current) => removeSequenceItem(current, dragIndex));
            }
          }
        } else {
          // Reorder drag: check if dropped in trash zone → delete
          if (trashZoneBounds) {
            const { x, y, width, height } = trashZoneBounds;
            const isInTrashZone =
              absoluteX >= x &&
              absoluteX <= x + width &&
              absoluteY >= y &&
              absoluteY <= y + height;

            if (isInTrashZone) {
              setSequence((current) => removeSequenceItem(current, dragIndex));
            }
          }
        }
      }

      dragIndexRef.current = null;
      isInsertDragRef.current = false;
      setDragState(null);
    },
    [trashZoneBounds, sequenceContainerBounds]
  );

  // Store handlers in refs so they can be called from worklet via scheduleOnRN
  const handleGestureStart = useCallback(
    async (absoluteX: number, absoluteY: number) => {
      const tappedIndex = await findTappedChipIndex(absoluteX, absoluteY);
      if (tappedIndex !== null) {
        handleDragStart(tappedIndex, absoluteX, absoluteY);
      }
    },
    [findTappedChipIndex, handleDragStart]
  );

  const handleGestureStartRef = useRef(handleGestureStart);
  handleGestureStartRef.current = handleGestureStart;

  const handleDragMoveRef = useRef(handleDragMove);
  handleDragMoveRef.current = handleDragMove;

  const handleDragEndRef = useRef(handleDragEnd);
  handleDragEndRef.current = handleDragEnd;

  // Wrapper functions that read from refs (stable references for worklet)
  const onGestureStart = useCallback((x: number, y: number) => {
    handleGestureStartRef.current(x, y);
  }, []);

  const onGestureUpdate = useCallback((x: number, y: number) => {
    handleDragMoveRef.current(x, y);
  }, []);

  const onGestureEnd = useCallback((x: number, y: number) => {
    handleDragEndRef.current(x, y);
  }, []);

  // Pan gesture for the sequence container - survives reorders since it's on parent
  const sequencePanGesture = Gesture.Pan()
    .activateAfterLongPress(150)
    .minDistance(0)
    .onStart((event) => {
      const x = event.absoluteX;
      const y = event.absoluteY;
      scheduleOnRN(onGestureStart, x, y);
    })
    .onUpdate((event) => {
      const x = event.absoluteX;
      const y = event.absoluteY;
      scheduleOnRN(onGestureUpdate, x, y);
    })
    .onEnd((event) => {
      const x = event.absoluteX;
      const y = event.absoluteY;
      scheduleOnRN(onGestureEnd, x, y);
    });

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
    const isBeingDragged = dragState?.index === index;

    if (item.type === "arrow") {
      // Only render arrows that have transitions
      if (!item.transition_id) {
        return null;
      }

      return (
        <TappableTransitionChip
          key={item.id}
          label={item.transition_id}
          isGhost={isBeingDragged}
          onDelete={() => handleRemoveItem(index)}
          viewRef={(ref) => {
            if (ref) chipRefsRef.current.set(index, ref);
            else chipRefsRef.current.delete(index);
          }}
        />
      );
    }

    if (item.type === "trick") {
      const comboNode = item.data;
      const label = comboNode.landing_stance
        ? `${comboNode.trick_id} (${comboNode.landing_stance})`
        : comboNode.trick_id;

      return (
        <ComboChip
          key={item.id}
          type="trick"
          label={label}
          isGhost={isBeingDragged}
          viewRef={(ref) => {
            if (ref) chipRefsRef.current.set(index, ref);
            else chipRefsRef.current.delete(index);
          }}
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

          {/* Sequence Display - wrapped in gesture detector for drag reordering */}
          {sequence.length > 0 && (
            <GestureDetector gesture={sequencePanGesture}>
              <View
                ref={sequenceContainerRef}
                style={styles.sequenceContainer}
                onLayout={handleSequenceContainerLayout}
              >
                {sequence.map((item, index) => renderSequenceItem(item, index))}
              </View>
            </GestureDetector>
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
            onDragTrick={handleDragFromSuggestion}
            onDragMove={onGestureUpdate}
            onDragEnd={onGestureEnd}
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

        {/* Trash Zone - only shown for reorder drags, not insert drags */}
        {dragState && !dragState.isInsertDrag && (
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
