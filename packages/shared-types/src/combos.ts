import { Database } from "./database.types";

/**
 * Combo-related types
 *
 * ComboGraph defines the graph structure of a combo stored in trick_sequence JSONB.
 * Nodes are tricks, edges are transitions between tricks.
 *
 * For UserCombos and ComboLogs table types, use the Supabase-generated types:
 *   - Database["public"]["Tables"]["UserCombos"]["Row/Insert/Update"]
 *   - Database["public"]["Tables"]["ComboLogs"]["Row/Insert/Update"]
 */

/**
 * A node in the combo graph representing a single trick
 */
export type ComboNode = {
  trick_id: string;
  landing_stance?: string;
};

/**
 * An edge in the combo graph representing a transition between tricks
 */
export type ComboEdge = {
  from_index: number;
  to_index: number;
  transition_id: string;
};

/**
 * Graph representation of a combo (stored in trick_sequence JSONB)
 * Nodes are tricks, edges are transitions between tricks
 */
export type ComboGraph = {
  tricks: ComboNode[];
  transitions: ComboEdge[];
};

/**
 * Landing stance from database
 */
export type LandingStance =
  Database["public"]["Tables"]["LandingStances"]["Row"];

/**
 * Transition from database
 */
export type Transition = Database["public"]["Tables"]["Transitions"]["Row"];

/**
 * Valid landing stance -> transition mapping from database
 */
export type LandingStanceTransition =
  Database["public"]["Tables"]["LandingStanceTransitions"]["Row"];

/**
 * UserCombo with properly typed combo_graph
 */
export type UserCombo = Omit<
  Database["public"]["Tables"]["UserCombos"]["Row"],
  "combo_graph"
> & {
  comboGraph: ComboGraph;
};

export type ComboLog = Database["public"]["Tables"]["ComboLogs"]["Row"];
