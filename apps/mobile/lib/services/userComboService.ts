import { supabase } from "@/lib/supabase/supabase";
import { ComboGraph, UserCombo } from "@hyperbolic/shared-types";
import { Database } from "@hyperbolic/shared-types";
import {
  marshalComboGraph,
  unmarshalComboGraph,
} from "./validation/comboValidation";
import {
  getUserTrick,
  upsertUserTrick,
  addLandedSurface as addTrickLandedSurface,
} from "./userTrickService";
import { ensureTrickExists } from "./trickService";
import { checkAndUpdateComboGoals } from "./goalService";

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

  const updatedCombo = await updateUserComboStats(comboId, updates);

  // Check and update any related goals
  try {
    await checkAndUpdateComboGoals(combo.user_id, comboId, {
      stomps: updatedCombo.stomps ?? 0,
      attempts: updatedCombo.attempts ?? 0,
    });
  } catch (goalError) {
    // Don't fail the stat update if goal update fails
    console.error("Error updating combo goals:", goalError);
  }

  return updatedCombo;
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

/**
 * Increment combo stats AND propagate to individual tricks (only when landed)
 * This is the main function to use when logging a combo attempt/stomp
 *
 * NOTE: Individual trick stats are only updated when the combo is landed.
 * For failed attempts, we can't determine which tricks were landed vs failed.
 * TODO: In the future, add more granular tracking to allow users to specify
 * which tricks in a combo were landed during a failed attempt.
 */
export async function incrementComboAndTrickStats(
  userId: string,
  comboId: string,
  { landed, surfaceType }: { landed: boolean; surfaceType?: string }
): Promise<UserCombo> {
  // 1. Fetch the combo to get the comboGraph
  const combo = await getUserCombo(comboId);
  if (!combo) {
    throw new Error(`Combo ${comboId} not found`);
  }

  // 2. Update combo stats
  const updatedCombo = await incrementComboStats(comboId, { landed });

  // 3. Add surface to combo if provided and landed
  let finalCombo = updatedCombo;
  if (surfaceType && landed) {
    finalCombo = await addLandedSurface(comboId, surfaceType);
  }

  // 4. Only update individual trick stats if combo was landed
  if (landed) {
    const trickIds = combo.comboGraph.tricks.map((node) => node.trick_id);
    // Use Set to deduplicate trick_ids (same trick might appear multiple times in combo)
    const uniqueTrickIds = [...new Set(trickIds)];

    // Process all tricks in parallel for better performance
    await Promise.all(
      uniqueTrickIds.map(async (trickId) => {
        try {
          // Ensure trick exists in Tricks table (creates unverified if needed)
          await ensureTrickExists(trickId);

          // Get existing UserTrick stats (or use defaults if doesn't exist)
          const existingTrick = await getUserTrick(userId, trickId);
          const currentAttempts = existingTrick?.attempts ?? 0;
          const currentStomps = existingTrick?.stomps ?? 0;

          // Increment stats
          const updatedTrick = await upsertUserTrick(userId, trickId, {
            attempts: currentAttempts + 1,
            stomps: currentStomps + 1,
            landed: true,
          });

          // Add surface to trick if provided
          if (surfaceType) {
            try {
              await addTrickLandedSurface(updatedTrick.id, surfaceType);
            } catch (error) {
              console.error(`Error adding surface to trick ${trickId}:`, error);
            }
          }
        } catch (error) {
          // Log error but continue with other tricks
          console.error(`Error updating stats for trick ${trickId}:`, error);
        }
      })
    );
  }

  return finalCombo;
}
