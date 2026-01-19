import { supabase } from "@/lib/supabase/supabase";
import { ComboGraph, UserCombo } from "@hyperbolic/shared-types";
import { Database } from "@hyperbolic/shared-types";
import {
  marshalComboGraph,
  unmarshalComboGraph,
} from "./validation/comboValidation";

/**
 * Centralized service for UserCombo CRUD operations.
 * Handles saved combos that users track progress on.
 */

interface CreateUserComboParams {
  userId: string;
  name: string;
  comboGraph: ComboGraph;
}

interface UpdateUserComboStatsParams {
  attempts?: number;
  stomps?: number;
  landed?: boolean;
}

/**
 * Create a new saved combo for a user
 */
export async function createUserCombo(
  params: CreateUserComboParams
): Promise<UserCombo> {
  const { userId, name, comboGraph } = params;

  // Validate and marshal the combo graph
  const marshaledGraph = marshalComboGraph(comboGraph);

  const { data, error } = await supabase
    .from("UserCombos")
    .insert({
      user_id: userId,
      name,
      trick_sequence:
        marshaledGraph as unknown as Database["public"]["Tables"]["UserCombos"]["Insert"]["trick_sequence"],
    })
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation (duplicate combo name)
    if (error.code === "23505") {
      throw new Error(
        `A combo named "${name}" already exists. Please choose a different name.`
      );
    }
    console.error("Error creating UserCombo:", error);
    throw error;
  }

  return {
    ...data,
    trick_sequence: unmarshalComboGraph(data.trick_sequence),
  };
}

/**
 * Get all saved combos for a user
 */
export async function getUserCombos(userId: string): Promise<UserCombo[]> {
  const { data, error } = await supabase
    .from("UserCombos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching UserCombos:", error);
    throw error;
  }

  return (
    data?.map((combo) => ({
      ...combo,
      trick_sequence: unmarshalComboGraph(combo.trick_sequence),
    })) || []
  );
}

/**
 * Get a specific saved combo by ID
 */
export async function getUserCombo(comboId: string): Promise<UserCombo | null> {
  const { data, error } = await supabase
    .from("UserCombos")
    .select("*")
    .eq("id", comboId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is not an error
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching UserCombo:", error);
    throw error;
  }

  return {
    ...data,
    trick_sequence: unmarshalComboGraph(data.trick_sequence),
  };
}

/**
 * Update combo stats (attempts, stomps, landed)
 */
export async function updateUserComboStats(
  comboId: string,
  updates: UpdateUserComboStatsParams
): Promise<UserCombo> {
  const { data, error } = await supabase
    .from("UserCombos")
    .update(updates)
    .eq("id", comboId)
    .select()
    .single();

  if (error) {
    console.error("Error updating UserCombo stats:", error);
    throw error;
  }

  return {
    ...data,
    trick_sequence: unmarshalComboGraph(data.trick_sequence),
  };
}

/**
 * Increment combo stats (typically called after logging a session)
 */
export async function incrementComboStats(
  comboId: string,
  { landed }: { landed: boolean }
): Promise<UserCombo> {
  // Fetch current stats
  const combo = await getUserCombo(comboId);
  if (!combo) {
    throw new Error(`Combo ${comboId} not found`);
  }

  // Increment attempts, and stomps if landed
  const updates: UpdateUserComboStatsParams = {
    attempts: (combo.attempts ?? 0) + 1,
    stomps: landed ? (combo.stomps ?? 0) + 1 : (combo.stomps ?? 0),
    landed: (landed || combo.landed) ?? false,
  };

  return updateUserComboStats(comboId, updates);
}

/**
 * Update a combo's graph (trick sequence)
 */
export async function updateUserComboGraph(
  comboId: string,
  comboGraph: ComboGraph
): Promise<UserCombo> {
  const marshaledGraph = marshalComboGraph(comboGraph);

  const { data, error } = await supabase
    .from("UserCombos")
    .update({
      trick_sequence:
        marshaledGraph as unknown as Database["public"]["Tables"]["UserCombos"]["Update"]["trick_sequence"],
    })
    .eq("id", comboId)
    .select()
    .single();

  if (error) {
    console.error("Error updating UserCombo graph:", error);
    throw error;
  }

  return {
    ...data,
    trick_sequence: unmarshalComboGraph(data.trick_sequence),
  };
}

/**
 * Rename a saved combo
 */
export async function renameUserCombo(
  comboId: string,
  newName: string
): Promise<UserCombo> {
  const { data, error } = await supabase
    .from("UserCombos")
    .update({ name: newName })
    .eq("id", comboId)
    .select()
    .single();

  if (error) {
    // Check for unique constraint violation (duplicate combo name)
    if (error.code === "23505") {
      throw new Error(
        `A combo named "${newName}" already exists. Please choose a different name.`
      );
    }
    console.error("Error renaming UserCombo:", error);
    throw error;
  }

  return {
    ...data,
    trick_sequence: unmarshalComboGraph(data.trick_sequence),
  };
}

/**
 * Delete a saved combo
 */
export async function deleteUserCombo(comboId: string): Promise<void> {
  const { error } = await supabase
    .from("UserCombos")
    .delete()
    .eq("id", comboId);

  if (error) {
    console.error("Error deleting UserCombo:", error);
    throw error;
  }
}
