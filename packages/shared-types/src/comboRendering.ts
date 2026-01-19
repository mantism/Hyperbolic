import { ComboNode } from "./combos";

/**
 * UI types for rendering combo sequences in the composer
 * These include `id` fields for React keys, unlike the database types
 */

export type TrickItem = {
  id: string;
  type: "trick";
  data: ComboNode;
};

export type ArrowItem = {
  id: string;
  type: "arrow";
  transition_id?: string;
};

export type SequenceItem = TrickItem | ArrowItem;
