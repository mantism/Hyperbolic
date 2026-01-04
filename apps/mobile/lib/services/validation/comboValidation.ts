import { ComboTrick } from "@hyperbolic/shared-types";

/**
 * Validation and marshalling utilities for combo trick sequences.
 * Handles conversion between ComboTrick[] and JSONB.
 */

/**
 * Validates that a trick sequence is well-formed
 * @throws Error if validation fails
 */
export function validateTrickSequence(sequence: ComboTrick[]): void {
  if (!Array.isArray(sequence)) {
    throw new Error("Trick sequence must be an array");
  }

  if (sequence.length === 0) {
    throw new Error("Trick sequence cannot be empty");
  }

  sequence.forEach((trick, index) => {
    if (!trick.trick_id || typeof trick.trick_id !== "string") {
      throw new Error(
        `Invalid trick_id at position ${index}: must be a non-empty string`
      );
    }

    if (
      trick.landing_stance !== undefined &&
      typeof trick.landing_stance !== "string"
    ) {
      throw new Error(
        `Invalid landing_stance at position ${index}: must be a string`
      );
    }

    if (
      trick.transition !== undefined &&
      typeof trick.transition !== "string"
    ) {
      throw new Error(
        `Invalid transition at position ${index}: must be a string`
      );
    }
  });
}

/**
 * Marshals ComboTrick[] to JSONB (for database insertion)
 * Validates before marshalling
 */
export function marshalTrickSequence(sequence: ComboTrick[]): ComboTrick[] {
  validateTrickSequence(sequence);
  return sequence;
}

/**
 * Unmarshals JSONB to ComboTrick[] (from database)
 * Validates the unmarshalled data
 */
export function unmarshalTrickSequence(jsonb: unknown): ComboTrick[] {
  if (!jsonb) {
    throw new Error("Cannot unmarshal null/undefined trick sequence");
  }

  // Type assertion after validation
  const sequence = jsonb as ComboTrick[];
  validateTrickSequence(sequence);
  return sequence;
}
