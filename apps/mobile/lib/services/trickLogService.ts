import { supabase } from "@/lib/supabase/supabase";

/**
 * Centralized service for TrickLog CRUD operations.
 * Handles individual trick session logging.
 *
 * Note: Videos are linked via TrickMedia table, not directly on TrickLogs.
 * The video_urls field is for legacy/simple use cases.
 */

export interface TrickLog {
  id: string;
  user_trick_id: string;
  logged_at: string;
  landed: boolean | null;
  reps: number | null;
  rating: number | null;
  notes: string | null;
  location_name: string | null;
  surface_type: string | null;
  is_public: boolean | null;
  session_id: string | null;
  created_at: string | null;
}

interface CreateTrickLogParams {
  userTrickId: string;
  landed?: boolean;
  reps?: number;
  rating?: number;
  notes?: string;
  locationName?: string;
  surfaceType?: string;
  isPublic?: boolean;
  loggedAt?: string;
  sessionId?: string;
}

interface UpdateTrickLogParams {
  landed?: boolean;
  reps?: number;
  rating?: number;
  notes?: string;
  locationName?: string;
  surfaceType?: string;
  isPublic?: boolean;
}

/**
 * Create a new trick log
 */
export async function createTrickLog(
  params: CreateTrickLogParams,
): Promise<TrickLog> {
  const {
    userTrickId,
    landed = true,
    reps = 1,
    rating = null,
    notes = null,
    locationName = null,
    surfaceType = null,
    isPublic = false,
    loggedAt = new Date().toISOString(),
    sessionId = null,
  } = params;

  const { data, error } = await supabase
    .from("TrickLogs")
    .insert({
      user_trick_id: userTrickId,
      logged_at: loggedAt,
      landed,
      reps,
      rating,
      notes,
      location_name: locationName,
      surface_type: surfaceType,
      is_public: isPublic,
      session_id: sessionId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating TrickLog:", error);
    throw error;
  }

  return data;
}

/**
 * Update a trick log
 */
export async function updateTrickLog(
  logId: string,
  updates: UpdateTrickLogParams,
): Promise<TrickLog> {
  const updateData: Record<string, unknown> = {};

  if (updates.landed !== undefined) {
    updateData.landed = updates.landed;
  }
  if (updates.reps !== undefined) {
    updateData.reps = updates.reps;
  }
  if (updates.rating !== undefined) {
    updateData.rating = updates.rating;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }
  if (updates.locationName !== undefined) {
    updateData.location_name = updates.locationName;
  }
  if (updates.surfaceType !== undefined) {
    updateData.surface_type = updates.surfaceType;
  }
  if (updates.isPublic !== undefined) {
    updateData.is_public = updates.isPublic;
  }

  const { data, error } = await supabase
    .from("TrickLogs")
    .update(updateData)
    .eq("id", logId)
    .select()
    .single();

  if (error) {
    console.error("Error updating TrickLog:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a trick log
 */
export async function deleteTrickLog(logId: string): Promise<void> {
  const { error } = await supabase.from("TrickLogs").delete().eq("id", logId);

  if (error) {
    console.error("Error deleting TrickLog:", error);
    throw error;
  }
}

export interface TrickLogWithMedia extends TrickLog {
  user_trick?: {
    id: string;
    user_id: string;
    trick_id: string;
    trick?: {
      id: string;
      name: string;
    };
  };
  media?: Array<{
    id: string;
    url: string;
    thumbnail_url?: string | null;
    media_type?: string | null;
  }>;
}

/**
 * Get trick logs for a session with related media
 */
export async function getTrickLogsBySession(
  sessionId: string,
): Promise<TrickLogWithMedia[]> {
  const { data, error } = await supabase
    .from("TrickLogs")
    .select(
      `
      *,
      user_trick:UserToTricks(
        *,
        trick:Tricks(*)
      ),
      media:TrickMedia(id, url, thumbnail_url, media_type)
    `,
    )
    .eq("session_id", sessionId)
    .order("logged_at", { ascending: false });

  if (error) {
    console.error("Error fetching trick logs by session:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single trick log by ID
 */
export async function getTrickLog(logId: string): Promise<TrickLog | null> {
  const { data, error } = await supabase
    .from("TrickLogs")
    .select("*")
    .eq("id", logId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching TrickLog:", error);
    throw error;
  }

  return data;
}
