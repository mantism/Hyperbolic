import { supabase } from "@/lib/supabase/supabase";
import { Trick } from "@hyperbolic/shared-types";

/**
 * Service for managing tricks in the Tricks table.
 */

/**
 * Check if a trick exists in the Tricks table
 */
export async function trickExists(trickId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("Tricks")
    .select("id")
    .eq("id", trickId)
    .single();

  if (error) {
    // PGRST116 = no rows returned
    if (error.code === "PGRST116") {
      return false;
    }
    console.error("Error checking trick existence:", error);
    throw error;
  }

  return !!data;
}

/**
 * Get a trick by ID
 */
export async function getTrick(trickId: string): Promise<Trick | null> {
  const { data, error } = await supabase
    .from("Tricks")
    .select("*")
    .eq("id", trickId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching trick:", error);
    throw error;
  }

  return data;
}

/**
 * Create an unverified trick (user-submitted)
 * These tricks are created when a user logs a combo with a custom trick name
 */
export async function createUnverifiedTrick(trickId: string): Promise<Trick> {
  // Format the name: convert kebab-case to Title Case
  const name = trickId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const { data, error } = await supabase
    .from("Tricks")
    .insert({
      id: trickId,
      name,
      verified: false,
      categories: ["user-created"],
    })
    .select()
    .single();

  if (error) {
    // If trick already exists (race condition), just fetch it
    if (error.code === "23505") {
      const existing = await getTrick(trickId);
      if (existing) return existing;
    }
    console.error("Error creating unverified trick:", error);
    throw error;
  }

  return data;
}

/**
 * Ensure a trick exists in the Tricks table.
 * If it doesn't exist, create it as an unverified trick.
 * Returns the trick (existing or newly created).
 */
export async function ensureTrickExists(trickId: string): Promise<Trick> {
  const existing = await getTrick(trickId);
  if (existing) {
    return existing;
  }

  return createUnverifiedTrick(trickId);
}
