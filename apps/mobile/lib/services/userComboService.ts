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
      combo_graph:
        marshaledGraph as unknown as Database["public"]["Tables"]["UserCombos"]["Insert"]["combo_graph"],
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
    comboGraph: unmarshalComboGraph(data.combo_graph),
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
      comboGraph: unmarshalComboGraph(combo.combo_graph),
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
    comboGraph: unmarshalComboGraph(data.combo_graph),
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
    comboGraph: unmarshalComboGraph(data.combo_graph),
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
      combo_graph:
        marshaledGraph as unknown as Database["public"]["Tables"]["UserCombos"]["Update"]["combo_graph"],
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
    comboGraph: unmarshalComboGraph(data.combo_graph),
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
    comboGraph: unmarshalComboGraph(data.combo_graph),
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

/**
 * Add a surface type to the landedSurfaces array
 * Only adds if not already present
 */
export async function addLandedSurface(
  comboId: string,
  surfaceType: string
): Promise<UserCombo> {
  // First, fetch current landedSurfaces
  const { data: currentData, error: fetchError } = await supabase
    .from("UserCombos")
    .select("landedSurfaces")
    .eq("id", comboId)
    .single();

  if (fetchError) {
    console.error("Error fetching landedSurfaces:", fetchError);
    throw fetchError;
  }

  // Add the new surface to the set (prevents duplicates)
  const surfaces = new Set(currentData.landedSurfaces || []);
  surfaces.add(surfaceType);

  // Update the record
  const { data, error } = await supabase
    .from("UserCombos")
    .update({ landedSurfaces: Array.from(surfaces) })
    .eq("id", comboId)
    .select()
    .single();

  if (error) {
    console.error("Error updating landedSurfaces:", error);
    throw error;
  }

  return {
    ...data,
    comboGraph: unmarshalComboGraph(data.combo_graph),
  };
}
