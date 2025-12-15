import { supabase } from "@/lib/supabase/supabase";
import { UserTrick } from "@hyperbolic/shared-types";

/**
 * Centralized service for all UserTrick CRUD operations.
 * Ensures consistent data handling and single source of truth.
 */

interface CreateUserTrickParams {
  userId: string;
  trickId: string;
  attempts?: number;
  stomps?: number;
  landed?: boolean;
  rating?: number | null;
  isGoal?: boolean;
  landedSurfaces?: string[];
}

interface UpdateUserTrickStatsParams {
  attempts?: number;
  stomps?: number;
  rating?: number | null;
  isGoal?: boolean;
  landed?: boolean;
}

/**
 * Create a new UserTrick record
 */
export async function createUserTrick(
  params: CreateUserTrickParams
): Promise<UserTrick> {
  const {
    userId,
    trickId,
    attempts = 0,
    stomps = 0,
    landed = false,
    rating = null,
    isGoal = false,
    landedSurfaces = [],
  } = params;

  const { data, error } = await supabase
    .from("UserToTricks")
    .insert({
      userID: userId,
      trickID: trickId,
      attempts,
      stomps,
      landed,
      rating,
      isGoal,
      landedSurfaces,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating UserTrick:", error);
    throw error;
  }

  return data;
}

/**
 * Update UserTrick stats (attempts, stomps, rating, isGoal)
 */
export async function updateUserTrickStats(
  userTrickId: string,
  updates: UpdateUserTrickStatsParams
): Promise<UserTrick> {
  const { data, error } = await supabase
    .from("UserToTricks")
    .update(updates)
    .eq("id", userTrickId)
    .select()
    .single();

  if (error) {
    console.error("Error updating UserTrick stats:", error);
    throw error;
  }

  return data;
}

/**
 * Add a surface type to the landedSurfaces array
 * Only adds if not already present
 */
export async function addLandedSurface(
  userTrickId: string,
  surfaceType: string
): Promise<UserTrick> {
  // First, fetch current landedSurfaces
  const { data: currentData, error: fetchError } = await supabase
    .from("UserToTricks")
    .select("landedSurfaces")
    .eq("id", userTrickId)
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
    .from("UserToTricks")
    .update({ landedSurfaces: Array.from(surfaces) })
    .eq("id", userTrickId)
    .select()
    .single();

  if (error) {
    console.error("Error updating landedSurfaces:", error);
    throw error;
  }

  return data;
}

/**
 * Get a specific UserTrick by userId and trickId
 */
export async function getUserTrick(
  userId: string,
  trickId: string
): Promise<UserTrick | null> {
  const { data, error } = await supabase
    .from("UserToTricks")
    .select("*")
    .eq("userID", userId)
    .eq("trickID", trickId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is not an error
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching UserTrick:", error);
    throw error;
  }

  return data;
}

/**
 * Get all UserTricks for a user
 */
export async function getUserTricks(userId: string): Promise<UserTrick[]> {
  const { data, error } = await supabase
    .from("UserToTricks")
    .select(`
      *,
      trick:Tricks(*)
    `)
    .eq("userID", userId);

  if (error) {
    console.error("Error fetching UserTricks:", error);
    throw error;
  }

  return data || [];
}

/**
 * Delete a UserTrick record
 */
export async function deleteUserTrick(userTrickId: string): Promise<void> {
  const { error } = await supabase
    .from("UserToTricks")
    .delete()
    .eq("id", userTrickId);

  if (error) {
    console.error("Error deleting UserTrick:", error);
    throw error;
  }
}

/**
 * Create or update a UserTrick in a single operation
 * Useful for incrementing stats when the record may or may not exist
 */
export async function upsertUserTrick(
  userId: string,
  trickId: string,
  updates: UpdateUserTrickStatsParams
): Promise<UserTrick> {
  // Try to get existing record
  const existing = await getUserTrick(userId, trickId);

  if (existing) {
    // Update existing record
    return updateUserTrickStats(existing.id, updates);
  } else {
    // Create new record with the updates
    return createUserTrick({
      userId,
      trickId,
      ...updates,
    });
  }
}
