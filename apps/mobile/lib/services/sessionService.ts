import { supabase } from "@/lib/supabase/supabase";

/**
 * Session record from the database
 */
export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  location_name: string | null;
  notes: string | null;
  is_public: boolean;
}

/**
 * Session with aggregated stats
 */
export interface SessionWithStats extends Session {
  trickLogCount: number;
  comboLogCount: number;
  totalLands: number;
  totalAttempts: number;
}

/**
 * Parameters for starting a new session
 */
interface StartSessionParams {
  userId: string;
  locationName?: string;
  notes?: string;
}

/**
 * Parameters for updating a session
 */
interface UpdateSessionParams {
  locationName?: string;
  notes?: string;
  isPublic?: boolean;
}

/**
 * Start a new training session
 */
export async function startSession(params: StartSessionParams): Promise<Session> {
  const { userId, locationName, notes } = params;

  const { data, error } = await supabase
    .from("Sessions")
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      location_name: locationName || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error starting session:", error);
    throw error;
  }

  return data as Session;
}

/**
 * End an active session
 */
export async function endSession(sessionId: string): Promise<Session> {
  const { data, error } = await supabase
    .from("Sessions")
    .update({
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error ending session:", error);
    throw error;
  }

  return data as Session;
}

/**
 * Get the current active session for a user (if any)
 */
export async function getActiveSession(userId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("Sessions")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is not an error
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching active session:", error);
    throw error;
  }

  return data as Session;
}

/**
 * Get a single session by ID
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("Sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching session:", error);
    throw error;
  }

  return data as Session;
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  userId: string,
  options: { limit?: number; includeActive?: boolean } = {}
): Promise<Session[]> {
  const { limit = 50, includeActive = true } = options;

  let query = supabase
    .from("Sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (!includeActive) {
    query = query.not("ended_at", "is", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user sessions:", error);
    throw error;
  }

  return (data as Session[]) || [];
}

/**
 * Get session with stats (log counts, lands, attempts)
 */
export async function getSessionWithStats(sessionId: string): Promise<SessionWithStats | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  // Fetch trick logs for this session
  const { data: trickLogs, error: trickError } = await supabase
    .from("TrickLogs")
    .select("landed, reps")
    .eq("session_id", sessionId);

  if (trickError) {
    console.error("Error fetching trick logs:", trickError);
    throw trickError;
  }

  // Fetch combo logs for this session
  const { data: comboLogs, error: comboError } = await supabase
    .from("ComboLogs")
    .select("landed")
    .eq("session_id", sessionId);

  if (comboError) {
    console.error("Error fetching combo logs:", comboError);
    throw comboError;
  }

  // Calculate stats
  const trickLogCount = trickLogs?.length || 0;
  const comboLogCount = comboLogs?.length || 0;

  // Count lands and attempts from trick logs
  let trickLands = 0;
  let trickAttempts = 0;
  for (const log of trickLogs || []) {
    const reps = log.reps || 1;
    trickAttempts += reps;
    if (log.landed) {
      trickLands += reps;
    }
  }

  // Count lands and attempts from combo logs
  let comboLands = 0;
  const comboAttempts = comboLogCount;
  for (const log of comboLogs || []) {
    if (log.landed) {
      comboLands += 1;
    }
  }

  return {
    ...session,
    trickLogCount,
    comboLogCount,
    totalLands: trickLands + comboLands,
    totalAttempts: trickAttempts + comboAttempts,
  };
}

/**
 * Get all logs for a session
 */
export async function getSessionLogs(sessionId: string): Promise<{
  trickLogs: any[];
  comboLogs: any[];
}> {
  // Fetch trick logs with trick info and media (all fields for TrickVideo type)
  const { data: trickLogs, error: trickError } = await supabase
    .from("TrickLogs")
    .select(`
      *,
      user_trick:UserToTricks(
        *,
        trick:Tricks(*)
      ),
      media:TrickMedia(*)
    `)
    .eq("session_id", sessionId)
    .order("logged_at", { ascending: false });

  if (trickError) {
    console.error("Error fetching session trick logs:", trickError);
    throw trickError;
  }

  // Fetch combo logs with combo info
  const { data: comboLogs, error: comboError } = await supabase
    .from("ComboLogs")
    .select(`
      *,
      user_combo:UserCombos(*)
    `)
    .eq("session_id", sessionId)
    .order("logged_at", { ascending: false });

  if (comboError) {
    console.error("Error fetching session combo logs:", comboError);
    throw comboError;
  }

  return {
    trickLogs: trickLogs || [],
    comboLogs: comboLogs || [],
  };
}

/**
 * Update a session
 */
export async function updateSession(
  sessionId: string,
  updates: UpdateSessionParams
): Promise<Session> {
  const updateData: Record<string, unknown> = {};

  if (updates.locationName !== undefined) {
    updateData.location_name = updates.locationName;
  }
  if (updates.notes !== undefined) {
    updateData.notes = updates.notes;
  }
  if (updates.isPublic !== undefined) {
    updateData.is_public = updates.isPublic;
  }

  const { data, error } = await supabase
    .from("Sessions")
    .update(updateData)
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    console.error("Error updating session:", error);
    throw error;
  }

  return data as Session;
}

/**
 * Delete a session
 * Note: This will set session_id to null on associated logs (ON DELETE SET NULL)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from("Sessions").delete().eq("id", sessionId);

  if (error) {
    console.error("Error deleting session:", error);
    throw error;
  }
}

/**
 * Get duration of a session in minutes
 */
export function getSessionDuration(session: Session): number | null {
  if (!session.ended_at) {
    // Session is still active, calculate from now
    const start = new Date(session.started_at);
    const now = new Date();
    return Math.round((now.getTime() - start.getTime()) / (1000 * 60));
  }

  const start = new Date(session.started_at);
  const end = new Date(session.ended_at);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
