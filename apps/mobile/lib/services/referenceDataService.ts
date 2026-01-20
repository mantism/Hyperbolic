import { supabase } from "@/lib/supabase/supabase";
import {
  LandingStance,
  Transition,
  LandingStanceTransition,
} from "@hyperbolic/shared-types";

/**
 * Service for fetching reference data (landing stances, transitions)
 * from the database.
 */

/**
 * Get all landing stances
 */
export async function getLandingStances(): Promise<LandingStance[]> {
  const { data, error } = await supabase
    .from("LandingStances")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching LandingStances:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific landing stance by ID
 */
export async function getLandingStance(
  id: string
): Promise<LandingStance | null> {
  const { data, error } = await supabase
    .from("LandingStances")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching LandingStance:", error);
    throw error;
  }

  return data;
}

/**
 * Get all transitions
 */
export async function getTransitions(): Promise<Transition[]> {
  const { data, error } = await supabase
    .from("Transitions")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching Transitions:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific transition by ID
 */
export async function getTransition(id: string): Promise<Transition | null> {
  const { data, error } = await supabase
    .from("Transitions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching Transition:", error);
    throw error;
  }

  return data;
}

/**
 * Get valid transitions for a specific landing stance
 */
export async function getValidTransitions(
  landingStanceId: string
): Promise<Transition[]> {
  const { data, error } = await supabase
    .from("LandingStanceTransitions")
    .select(
      `
      transition_id,
      transition:Transitions(*)
    `
    )
    .eq("landing_stance_id", landingStanceId);

  if (error) {
    console.error("Error fetching valid transitions:", error);
    throw error;
  }

  // Extract the transition objects from the join result
  return (
    data
      ?.map((item) => item.transition as unknown as Transition)
      .filter(Boolean) || []
  );
}

/**
 * Check if a transition is valid for a given landing stance
 */
export async function isValidTransition(
  landingStanceId: string,
  transitionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("LandingStanceTransitions")
    .select("id")
    .eq("landing_stance_id", landingStanceId)
    .eq("transition_id", transitionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return false;
    }
    console.error("Error checking transition validity:", error);
    throw error;
  }

  return !!data;
}

/**
 * Get all landing stance to transition mappings
 */
export async function getLandingStanceTransitions(): Promise<
  LandingStanceTransition[]
> {
  const { data, error } = await supabase
    .from("LandingStanceTransitions")
    .select("*");

  if (error) {
    console.error("Error fetching LandingStanceTransitions:", error);
    throw error;
  }

  return data || [];
}
