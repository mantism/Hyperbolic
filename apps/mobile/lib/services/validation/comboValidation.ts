import { ComboGraph, ComboNode, ComboEdge } from "@hyperbolic/shared-types";

/**
 * Validation and marshalling utilities for combo graphs.
 * Handles conversion between ComboGraph and JSONB.
 */

/**
 * Validates that a combo graph is well-formed
 * @throws Error if validation fails
 */
export function validateComboGraph(graph: ComboGraph): void {
  if (!graph || typeof graph !== "object") {
    throw new Error("Combo graph must be an object");
  }

  if (!Array.isArray(graph.nodes)) {
    throw new Error("Combo graph nodes must be an array");
  }

  if (!Array.isArray(graph.edges)) {
    throw new Error("Combo graph edges must be an array");
  }

  if (graph.nodes.length === 0) {
    throw new Error("Combo graph must have at least one node");
  }

  // Validate nodes
  graph.nodes.forEach((node, index) => {
    validateComboNode(node, index);
  });

  // Validate edges
  graph.edges.forEach((edge, index) => {
    validateComboEdge(edge, index, graph.nodes.length);
  });
}

/**
 * Validates a single combo node
 */
function validateComboNode(node: ComboNode, index: number): void {
  if (!node.trick_id || typeof node.trick_id !== "string") {
    throw new Error(
      `Invalid trick_id at node ${index}: must be a non-empty string`
    );
  }

  if (
    node.landing_stance !== undefined &&
    typeof node.landing_stance !== "string"
  ) {
    throw new Error(
      `Invalid landing_stance at node ${index}: must be a string`
    );
  }
}

/**
 * Validates a single combo edge
 */
function validateComboEdge(
  edge: ComboEdge,
  index: number,
  nodeCount: number
): void {
  if (typeof edge.from_index !== "number" || edge.from_index < 0) {
    throw new Error(
      `Invalid from_index at edge ${index}: must be a non-negative number`
    );
  }

  if (typeof edge.to_index !== "number" || edge.to_index < 0) {
    throw new Error(
      `Invalid to_index at edge ${index}: must be a non-negative number`
    );
  }

  if (edge.from_index >= nodeCount) {
    throw new Error(
      `Invalid from_index at edge ${index}: references non-existent node ${edge.from_index}`
    );
  }

  if (edge.to_index >= nodeCount) {
    throw new Error(
      `Invalid to_index at edge ${index}: references non-existent node ${edge.to_index}`
    );
  }

  if (!edge.transition_id || typeof edge.transition_id !== "string") {
    throw new Error(
      `Invalid transition_id at edge ${index}: must be a non-empty string`
    );
  }
}

/**
 * Marshals ComboGraph to JSONB (for database insertion)
 * Validates before marshalling
 */
export function marshalComboGraph(graph: ComboGraph): ComboGraph {
  validateComboGraph(graph);
  return graph;
}

/**
 * Unmarshals JSONB to ComboGraph (from database)
 * Validates the unmarshalled data
 */
export function unmarshalComboGraph(jsonb: unknown): ComboGraph {
  if (!jsonb) {
    throw new Error("Cannot unmarshal null/undefined combo graph");
  }

  const graph = jsonb as ComboGraph;
  validateComboGraph(graph);
  return graph;
}

/**
 * Creates an empty combo graph
 */
export function createEmptyComboGraph(): ComboGraph {
  return {
    nodes: [],
    edges: [],
  };
}
