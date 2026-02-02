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
  moveTrickToPosition,
} from "@/lib/utils/comboRendering";
import { createTrick } from "@/lib/utils/createTrick";
import ComboChip from "./ComboChip";
import TappableTransitionChip from "./TappableTransitionChip";
import ComboModifierButtons from "./ComboModifierButtons";
import TrashZone from "./TrashZone";
import TrickSuggestionChips from "./TrickSuggestionChips";

interface ComboComposerProps {
  /** Initial sequence for editing an existing combo */
  initialSequence?: SequenceItem[];
  /** Called when sequence changes */
  onSequenceChange?: (sequence: SequenceItem[]) => void;
  /** Called when save button is pressed with the current sequence */
  onSave: (sequence: SequenceItem[]) => void;
  /** Called when cancel is pressed */
  onCancel: () => void;
  /** Whether save is in progress (disables button) */
  saving?: boolean;
  /** Button text (defaults to "Save") */
  saveButtonText?: string;
  /** Hide the action buttons (Save/Cancel) - useful when embedding in other forms */
  hideButtons?: boolean;
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
  initialSequence,
  onSequenceChange,
  onSave,
  onCancel,
  saving = false,
  saveButtonText = "Save",
  hideButtons = false,
}: ComboComposerProps) {
  const [searchText, setSearchText] = useState("");
  const [sequence, setSequence] = useState<SequenceItem[]>(
    initialSequence ?? [],
  );
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
  // Track which arrow slot is currently being previewed (for transition drag)
  const previewSlotIndexRef = useRef<number | null>(null);
  const [previewSlotIndex, setPreviewSlotIndex] = useState<number | null>(null);

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
        },
      );
    }
  }, []);

  // Notify parent when sequence changes
  const prevSequenceRef = useRef<SequenceItem[]>(sequence);
  React.useEffect(() => {
    if (sequence !== prevSequenceRef.current) {
      prevSequenceRef.current = sequence;
      onSequenceChange?.(sequence);
    }
  }, [sequence, onSequenceChange]);

  const handleSelectTrick = (trick: Trick) => {
    const newItem: SequenceItem = {
      id: `${Date.now()}-trick`,
      type: "trick",
      data: { trick_id: trick.id },
    };

    const updatedSequence = [...sequence];
    updatedSequence.push(newItem);
    const arrowItem: SequenceItem = {
      id: `${Date.now()}-arrow`,
      type: "arrow",
    };
    updatedSequence.push(arrowItem);

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

  const clearTransition = (index: number) => {
    const item = sequence[index];
    if (!item || item.type !== "arrow") {
      return;
    }
    const updatedSequence = [...sequence];
    updatedSequence[index] = {
      ...item,
      transition_id: undefined,
    };
    setSequence(updatedSequence);
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
    [measureAllChips],
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
    [measureAllChips],
  );

  // Handle drag from transition buttons - floating chip, previews in empty arrow slots
  const handleDragFromTransition = useCallback(
    (transition: string, absoluteX: number, absoluteY: number) => {
      // Set refs for drag tracking
      dragIndexRef.current = -1; // -1 means floating, not in sequence yet
      isInsertDragRef.current = true;
      previewSlotIndexRef.current = null;
      setPreviewSlotIndex(null);

      // Start the floating drag state
      setDragState({
        index: -1,
        type: "transition",
        label: transition,
        currentX: absoluteX,
        currentY: absoluteY,
        offsetX: 0,
        offsetY: 0,
        isInsertDrag: true,
      });

      // Measure chips for slot detection during drag
      // Double requestAnimationFrame to ensure placeholders have rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          measureAllChips();
        });
      });
    },
    [measureAllChips],
  );

  // Drag handlers for reordering
  const handleDragStart = useCallback(
    (
      index: number,
      absoluteX: number,
      absoluteY: number,
      isInsertDrag: boolean = false,
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
    [getLabelForItem],
  );

  // Find which trick position the finger is hovering over
  // Returns the trick position (0 = first trick, 1 = second trick, etc.)
  const findHoverTrickPosition = useCallback(
    (
      absoluteX: number,
      absoluteY: number,
      currentSequence: SequenceItem[],
      draggingIndex: number,
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
    [],
  );

  // Find the nearest empty arrow slot based on trick positions
  // Returns the sequence index of the arrow, or null if none found
  const findNearestEmptyArrowSlot = useCallback(
    (
      absoluteX: number,
      absoluteY: number,
      currentSequence: SequenceItem[],
    ): number | null => {
      // Get all tricks with their indices and measurements
      const tricks = currentSequence
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.type === "trick")
        .map(({ index }) => ({
          index,
          measurement: chipMeasurementsRef.current.get(index),
        }))
        .filter(({ measurement }) => measurement !== undefined);

      if (tricks.length < 2) return null;

      let nearestArrowIndex: number | null = null;
      let nearestDistance = Infinity;

      // Check each pair of adjacent tricks to find the slot between them
      for (let i = 0; i < tricks.length - 1; i++) {
        const trick1 = tricks[i];
        const trick2 = tricks[i + 1];

        if (!trick1.measurement || !trick2.measurement) continue;

        // Find the arrow index between these two tricks
        let arrowIndex: number | null = null;
        for (let j = trick1.index + 1; j < trick2.index; j++) {
          const item = currentSequence[j];
          if (item.type === "arrow") {
            // Only consider empty arrows or the current preview
            if (!item.transition_id || j === previewSlotIndexRef.current) {
              arrowIndex = j;
              break;
            }
          }
        }

        if (arrowIndex === null) continue;

        // Calculate the midpoint between the two tricks
        const midX =
          (trick1.measurement.x +
            trick1.measurement.width +
            trick2.measurement.x) /
          2;
        const midY =
          (trick1.measurement.y + trick2.measurement.y) / 2 +
          trick1.measurement.height / 2;

        // Calculate distance from finger to midpoint
        const distance = Math.sqrt(
          Math.pow(absoluteX - midX, 2) + Math.pow(absoluteY - midY, 2),
        );

        // Only consider if within a reasonable range
        if (distance < 150 && distance < nearestDistance) {
          nearestDistance = distance;
          nearestArrowIndex = arrowIndex;
        }
      }

      return nearestArrowIndex;
    },
    [],
  );

  const handleDragMove = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const currentDragIndex = dragIndexRef.current;

      // Handle floating transition drag (not in sequence yet)
      if (currentDragIndex === -1) {
        const currentSequence = sequenceRef.current;
        const currentDragState = dragState;

        // Find nearest empty arrow slot
        const nearestSlot = findNearestEmptyArrowSlot(
          absoluteX,
          absoluteY,
          currentSequence,
        );
        const previousSlot = previewSlotIndexRef.current;

        // If slot changed, update the sequence
        if (nearestSlot !== previousSlot && currentDragState) {
          setSequence((current) => {
            const updated = [...current];

            // Clear previous preview slot if it exists
            if (
              previousSlot !== null &&
              updated[previousSlot]?.type === "arrow"
            ) {
              updated[previousSlot] = {
                ...updated[previousSlot],
                transition_id: undefined,
              };
            }

            // Set new preview slot if found
            if (
              nearestSlot !== null &&
              updated[nearestSlot]?.type === "arrow"
            ) {
              updated[nearestSlot] = {
                ...updated[nearestSlot],
                transition_id: currentDragState.label,
              };
            }

            return updated;
          });

          previewSlotIndexRef.current = nearestSlot;
          setPreviewSlotIndex(nearestSlot);
        }

        // Update drag position
        setDragState((prev) =>
          prev ? { ...prev, currentX: absoluteX, currentY: absoluteY } : null,
        );
        return;
      }

      if (currentDragIndex === null) return;

      const currentSequence = sequenceRef.current;

      // Handle trick dragging (swap positions with other tricks)
      const hoverTrickPosition = findHoverTrickPosition(
        absoluteX,
        absoluteY,
        currentSequence,
        currentDragIndex,
      );

      if (hoverTrickPosition !== null) {
        const result = moveTrickToPosition(
          currentSequence,
          currentDragIndex,
          hoverTrickPosition,
        );

        if (result.newIndex !== currentDragIndex) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          dragIndexRef.current = result.newIndex;
          setSequence(result.sequence);
          setDragState((prev) =>
            prev
              ? {
                  ...prev,
                  currentX: absoluteX,
                  currentY: absoluteY,
                  index: result.newIndex,
                }
              : null,
          );
          return;
        }
      }

      // Just update position if no reorder happened
      setDragState((prev) =>
        prev ? { ...prev, currentX: absoluteX, currentY: absoluteY } : null,
      );
    },
    [findHoverTrickPosition, findNearestEmptyArrowSlot, dragState],
  );

  const handleDragEnd = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const dragIndex = dragIndexRef.current;
      const isInsertDrag = isInsertDragRef.current;

      // Handle floating transition drag (index === -1)
      if (dragIndex === -1) {
        const previewSlot = previewSlotIndexRef.current;

        // Check if dropped inside sequence container
        const isInSequenceContainer =
          sequenceContainerBounds &&
          absoluteX >= sequenceContainerBounds.x &&
          absoluteX <=
            sequenceContainerBounds.x + sequenceContainerBounds.width &&
          absoluteY >= sequenceContainerBounds.y &&
          absoluteY <=
            sequenceContainerBounds.y + sequenceContainerBounds.height;

        if (!isInSequenceContainer && previewSlot !== null) {
          // Dropped outside - clear the preview
          setSequence((current) => {
            const updated = [...current];
            if (updated[previewSlot]?.type === "arrow") {
              updated[previewSlot] = {
                ...updated[previewSlot],
                transition_id: undefined,
              };
            }
            return updated;
          });
        }
        // If dropped inside, keep the preview (it's now permanent)

        previewSlotIndexRef.current = null;
        setPreviewSlotIndex(null);
        dragIndexRef.current = null;
        isInsertDragRef.current = false;
        setDragState(null);
        return;
      }

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
    [trashZoneBounds, sequenceContainerBounds],
  );

  // Store handlers in refs so they can be called from worklet via scheduleOnRN
  const handleGestureStart = useCallback(
    async (absoluteX: number, absoluteY: number) => {
      const tappedIndex = await findTappedChipIndex(absoluteX, absoluteY);
      if (tappedIndex !== null) {
        handleDragStart(tappedIndex, absoluteX, absoluteY);
      }
    },
    [findTappedChipIndex, handleDragStart],
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

  const handleSave = () => {
    if (sequence.length === 0) {
      return;
    }
    onSave(sequence);
  };

  const renderSequenceItem = (item: SequenceItem, index: number) => {
    const isBeingDragged = dragState?.index === index;

    if (item.type === "arrow") {
      // Empty arrow - render placeholder only for the nearest slot during transition drag
      if (!item.transition_id) {
        // Only render placeholder for the slot nearest to finger
        if (
          dragState?.type === "transition" &&
          dragState?.index === -1 &&
          previewSlotIndex === index
        ) {
          return (
            <View
              key={item.id}
              style={{
                width: 40,
                height: 28,
                borderRadius: 6,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "#FF9800",
                backgroundColor: "#FFF8E1",
                marginHorizontal: 2,
              }}
            />
          );
        }
        return null;
      }

      return (
        <TappableTransitionChip
          key={item.id}
          label={item.transition_id}
          isGhost={isBeingDragged}
          onDelete={() => clearTransition(index)}
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
        <View>
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
            onDragTransition={handleDragFromTransition}
            onDragMove={onGestureUpdate}
            onDragEnd={onGestureEnd}
          />

          {/* Action Buttons */}
          {!hideButtons && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (sequence.length === 0 || saving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={sequence.length === 0 || saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : saveButtonText}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    backgroundColor: "#fff",
  },
  gestureContainer: {
    flex: 1,
  },
  sequenceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
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
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
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
