import {
  SequenceItem,
  TrickItem,
  ArrowItem,
  ComboGraph,
  ComboNode,
  ComboEdge,
} from "@hyperbolic/shared-types";

/**
 * Converts database ComboGraph to UI SequenceItem[] with arrows between tricks
 *
 * @param graph - ComboGraph from database
 * @returns Array of SequenceItem for UI rendering
 */
export function comboGraphToSequence(graph: ComboGraph): SequenceItem[] {
  const sequence: SequenceItem[] = [];

  // Build a map of edges by from_index for quick lookup
  const edgesByFromIndex = new Map<number, ComboEdge>();
  graph.edges.forEach((edge) => {
    edgesByFromIndex.set(edge.from_index, edge);
  });

  graph.nodes.forEach((node, index) => {
    // Add arrow before trick (except for first trick)
    if (index > 0) {
      // Check if there's an edge from the previous node to this one
      const edge = edgesByFromIndex.get(index - 1);
      const arrowItem: ArrowItem = {
        id: `${Date.now()}-arrow-${index}`,
        type: "arrow",
        transition_id: edge?.transition_id,
      };
      sequence.push(arrowItem);
    }

    // Add trick
    const trickItem: TrickItem = {
      id: `${Date.now()}-trick-${index}`,
      type: "trick",
      data: {
        trick_id: node.trick_id,
        landing_stance: node.landing_stance,
      },
    };
    sequence.push(trickItem);
  });

  return sequence;
}

/**
 * Converts UI SequenceItem[] back to database ComboGraph
 *
 * @param sequence - Array of SequenceItem from UI
 * @returns ComboGraph for database storage
 */
export function sequenceToComboGraph(sequence: SequenceItem[]): ComboGraph {
  const nodes: ComboNode[] = [];
  const edges: ComboEdge[] = [];

  let nodeIndex = 0;
  let pendingTransitionId: string | undefined;

  sequence.forEach((item) => {
    if (item.type === "arrow" && item.transition_id) {
      // Store transition to attach to next node
      pendingTransitionId = item.transition_id;
    } else if (item.type === "trick") {
      // Add node
      nodes.push({
        trick_id: item.data.trick_id,
        landing_stance: item.data.landing_stance,
      });

      // If there was a pending transition, create an edge
      if (pendingTransitionId && nodeIndex > 0) {
        edges.push({
          from_index: nodeIndex - 1,
          to_index: nodeIndex,
          transition_id: pendingTransitionId,
        });
      }

      pendingTransitionId = undefined;
      nodeIndex++;
    }
  });

  return { nodes, edges };
}

/**
 * Removes an item from a combo sequence and cleans up adjacent arrows
 * to prevent invalid states like consecutive arrows.
 *
 * @param sequence - The current sequence of items
 * @param index - The index of the item to remove
 * @returns The updated sequence with the item removed and arrows cleaned up
 */
export function removeSequenceItem(
  sequence: SequenceItem[],
  index: number
): SequenceItem[] {
  if (index < 0 || index >= sequence.length) {
    return sequence;
  }

  const item = sequence[index];
  const updatedSequence = [...sequence];

  // Remove the item
  updatedSequence.splice(index, 1);

  if (item.type === "trick") {
    // When removing a trick, we need to clean up adjacent arrows
    // to avoid consecutive arrows

    const prevItem = updatedSequence[index - 1];
    const nextItem = updatedSequence[index];

    if (prevItem?.type === "arrow" && nextItem?.type === "arrow") {
      // Two arrows now adjacent - remove one (keep the first, remove the second)
      updatedSequence.splice(index, 1);
    } else if (prevItem?.type === "arrow" && !nextItem) {
      // Arrow at the end - remove it
      updatedSequence.splice(index - 1, 1);
    } else if (!prevItem && nextItem?.type === "arrow") {
      // Arrow at the start - remove it
      updatedSequence.splice(0, 1);
    }
  }

  return updatedSequence;
}

/**
 * Reorders a trick in the sequence by moving it to a new position.
 * Adjacent edges (transitions) connected to the moved trick are removed.
 *
 * @param sequence - The current sequence of items
 * @param fromIndex - The current index of the trick in the sequence
 * @param toTrickPosition - The target trick position (0 = first trick, 1 = second trick, etc.)
 * @returns The updated sequence with the trick moved and edges removed
 */
export function reorderSequenceItem(
  sequence: SequenceItem[],
  fromIndex: number,
  toTrickPosition: number
): SequenceItem[] {
  if (fromIndex < 0 || fromIndex >= sequence.length) {
    return sequence;
  }

  const item = sequence[fromIndex];
  if (item.type !== "trick") {
    return sequence;
  }

  // Extract just the tricks to determine positions
  const tricks = sequence
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "trick");

  const currentTrickPosition = tricks.findIndex(({ index }) => index === fromIndex);
  if (currentTrickPosition === -1 || currentTrickPosition === toTrickPosition) {
    return sequence;
  }

  // Remove the trick and its adjacent arrows
  let updatedSequence = removeSequenceItem(sequence, fromIndex);

  // Recalculate trick positions after removal
  const remainingTricks = updatedSequence
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "trick");

  // Determine where to insert the trick
  let insertIndex: number;
  if (toTrickPosition === 0) {
    // Insert at the beginning
    insertIndex = 0;
  } else if (toTrickPosition >= remainingTricks.length) {
    // Insert at the end
    insertIndex = updatedSequence.length;
  } else {
    // Insert before the trick at toTrickPosition
    insertIndex = remainingTricks[toTrickPosition].index;
  }

  // Insert the trick at the new position
  updatedSequence = [
    ...updatedSequence.slice(0, insertIndex),
    item,
    ...updatedSequence.slice(insertIndex),
  ];

  // Clean up: ensure no consecutive arrows and no arrows at start/end
  return cleanupSequence(updatedSequence);
}

/**
 * Moves a trick from one position to another, shifting other tricks.
 * Used during drag preview - doesn't clean up arrows.
 *
 * @param sequence - The current sequence of items
 * @param fromSequenceIndex - The current sequence index of the trick being moved
 * @param toTrickPosition - The target trick position (0 = first trick, 1 = second trick, etc.)
 * @returns Object with updated sequence and the new sequence index of the moved trick
 */
export function moveTrickToPosition(
  sequence: SequenceItem[],
  fromSequenceIndex: number,
  toTrickPosition: number
): { sequence: SequenceItem[]; newIndex: number } {
  if (fromSequenceIndex < 0 || fromSequenceIndex >= sequence.length) {
    return { sequence, newIndex: fromSequenceIndex };
  }

  const item = sequence[fromSequenceIndex];
  if (item.type !== "trick") {
    return { sequence, newIndex: fromSequenceIndex };
  }

  // Get all tricks with their indices
  const tricks = sequence
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "trick");

  const currentTrickPosition = tricks.findIndex(({ index }) => index === fromSequenceIndex);
  if (currentTrickPosition === -1 || currentTrickPosition === toTrickPosition) {
    return { sequence, newIndex: fromSequenceIndex };
  }

  // Clamp toTrickPosition to valid range
  const clampedPosition = Math.max(0, Math.min(toTrickPosition, tricks.length - 1));

  // Remove the trick from its current position
  const withoutItem = [
    ...sequence.slice(0, fromSequenceIndex),
    ...sequence.slice(fromSequenceIndex + 1),
  ];

  // Recalculate trick positions after removal
  const remainingTricks = withoutItem
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.type === "trick");

  // Find the insertion index in the sequence
  let insertIndex: number;
  if (clampedPosition === 0) {
    insertIndex = 0;
  } else if (clampedPosition >= remainingTricks.length) {
    // Insert after the last trick
    const lastTrick = remainingTricks[remainingTricks.length - 1];
    insertIndex = lastTrick.index + 1;
  } else {
    // Insert before the trick at clampedPosition
    insertIndex = remainingTricks[clampedPosition].index;
  }

  // Insert the trick at the new position
  const updatedSequence = [
    ...withoutItem.slice(0, insertIndex),
    item,
    ...withoutItem.slice(insertIndex),
  ];

  return { sequence: updatedSequence, newIndex: insertIndex };
}

/**
 * Cleans up a sequence to ensure valid structure:
 * - No consecutive arrows
 * - No arrows at the start or end
 */
function cleanupSequence(sequence: SequenceItem[]): SequenceItem[] {
  const result: SequenceItem[] = [];

  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    const prevItem = result[result.length - 1];

    if (item.type === "arrow") {
      // Skip arrow if it would be at the start
      if (result.length === 0) continue;
      // Skip arrow if previous item was also an arrow
      if (prevItem?.type === "arrow") continue;
    }

    result.push(item);
  }

  // Remove trailing arrow if present
  if (result.length > 0 && result[result.length - 1].type === "arrow") {
    result.pop();
  }

  return result;
}
