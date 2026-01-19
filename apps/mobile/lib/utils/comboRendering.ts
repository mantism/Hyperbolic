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
