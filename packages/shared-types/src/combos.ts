import { Database } from "./database.types";

/**
 * Combo-related types
 *
 * ComboTrick defines the structure of JSONB data in trick_sequence fields.
 * For UserCombos and ComboLogs table types, use the Supabase-generated types:
 *   - Database["public"]["Tables"]["UserCombos"]["Row/Insert/Update"]
 *   - Database["public"]["Tables"]["ComboLogs"]["Row/Insert/Update"]
 */

/**
 * Represents a single trick within a combo sequence (stored in JSONB)
 */
export type ComboTrick = {
  trick_id: string;
  landing_stance?: string;
  transition?: string;
};

/**
 * UserCombo with properly typed trick_sequence (instead of generic Json type)
 */
export type UserCombo = Omit<
  Database["public"]["Tables"]["UserCombos"]["Row"],
  "trick_sequence"
> & {
  trick_sequence: ComboTrick[];
};

/**
 * ComboLog with properly typed trick_sequence (instead of generic Json type)
 */
export type ComboLog = Omit<
  Database["public"]["Tables"]["ComboLogs"]["Row"],
  "trick_sequence"
> & {
  trick_sequence: ComboTrick[];
};
