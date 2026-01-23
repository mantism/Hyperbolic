import { supabase } from "@/lib/supabase/supabase";
import { ComboGraph, ComboLog } from "@hyperbolic/shared-types";
import { Database } from "@hyperbolic/shared-types";
import {
  marshalComboGraph,
  unmarshalComboGraph,
} from "./validation/comboValidation";
import {
  incrementComboStats,
  createUserCombo,
  getUserCombos,
} from "./userComboService";

/**
 * Centralized service for ComboLog CRUD operations.
 * Handles individual combo session logging.
 */

interface CreateComboLogParams {
  userId: string;
  userComboId?: string; // If provided, use this combo; otherwise auto-create
  comboName?: string; // Name for auto-created combo
  comboGraph: ComboGraph;
  landed?: boolean;
  rating?: number;
  notes?: string;
  locationName?: string;
  surfaceType?: string;
  videoUrls?: string[];
  thumbnailUrl?: string;
  weatherConditions?: string;
  isPublic?: boolean;
  loggedAt?: string; // ISO timestamp
}

/**
 * Log a combo session
 * Auto-creates UserCombo if it doesn't exist, then logs the session
 */
export async function createComboLog(
  params: CreateComboLogParams
): Promise<ComboLog> {
  const {
    userId,
    userComboId,
    comboName,
    comboGraph,
    landed = false,
    rating = null,
    notes = null,
    locationName = null,
    surfaceType = null,
    videoUrls = null,
    thumbnailUrl = null,
    weatherConditions = null,
    isPublic = false,
    loggedAt = new Date().toISOString(),
  } = params;

  // Validate and marshal the combo graph
  const marshaledGraph = marshalComboGraph(comboGraph);

  // Find or create UserCombo
  let comboId = userComboId;
  if (!comboId) {
    // Auto-create combo: Try to find existing combo with same graph
    const existingCombos = await getUserCombos(userId);
    const matchingCombo = existingCombos.find((combo) =>
      areGraphsEqual(combo.comboGraph, comboGraph)
    );

    if (matchingCombo) {
      comboId = matchingCombo.id;
    } else {
      // Create new combo
      const generatedName = comboName || generateComboName(comboGraph);
      const newCombo = await createUserCombo({
        userId,
        name: generatedName,
        comboGraph,
      });
      comboId = newCombo.id;
    }
  }

  const { data, error } = await supabase
    .from("ComboLogs")
    .insert({
      user_combo_id: comboId,
      logged_at: loggedAt,
      landed,
      rating,
      notes,
      location_name: locationName,
      surface_type: surfaceType,
      video_urls: videoUrls,
      thumbnail_url: thumbnailUrl,
      is_public: isPublic,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating ComboLog:", error);
    throw error;
  }

  // Update combo stats
  await incrementComboStats(comboId, { landed });

  return {
    ...data,
    comboGraph: unmarshalComboGraph(data.combo_graph),
  };
}

/**
 * Helper: Check if two combo graphs are equal
 */
function areGraphsEqual(graph1: ComboGraph, graph2: ComboGraph): boolean {
  // Compare nodes
  if (graph1.tricks.length !== graph2.tricks.length) return false;
  const nodesEqual = graph1.tricks.every(
    (node, i) =>
      node.trick_id === graph2.tricks[i].trick_id &&
      node.landing_stance === graph2.tricks[i].landing_stance
  );
  if (!nodesEqual) {
    return false;
  }

  // Compare edges
  if (graph1.transitions.length !== graph2.transitions.length) return false;
  return graph1.transitions.every(
    (edge, i) =>
      edge.from_index === graph2.transitions[i].from_index &&
      edge.to_index === graph2.transitions[i].to_index &&
      edge.transition_id === graph2.transitions[i].transition_id
  );
}

/**
 * Helper: Generate combo name from combo graph
 */
function generateComboName(graph: ComboGraph): string {
  const nodes = graph.tricks;
  if (nodes.length === 0) {
    return "Empty Combo";
  }
  if (nodes.length === 1) {
    return `${nodes[0].trick_id} Combo`;
  }

  return `${nodes[0].trick_id} to ${nodes[nodes.length - 1].trick_id}`;
}

/**
 * Get combo logs for a user (via UserCombos join)
 */
export async function getComboLogs(
  userId: string,
  limit = 20
): Promise<ComboLog[]> {
  const { data, error } = await supabase
    .from("ComboLogs")
    .select(
      `
      *,
      user_combo:UserCombos!inner(user_id)
    `
    )
    .eq("user_combo.user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching ComboLogs:", error);
    throw error;
  }

  return (
    data?.map((log) => ({
      ...log,
      combo_graph: unmarshalComboGraph(log.combo_graph),
    })) || []
  );
}

/**
 * Get combo logs for a specific saved combo
 */
export async function getComboLogsByComboId(
  comboId: string,
  limit = 20
): Promise<ComboLog[]> {
  const { data, error } = await supabase
    .from("ComboLogs")
    .select("*")
    .eq("user_combo_id", comboId)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching ComboLogs:", error);
    throw error;
  }

  return (
    data?.map((log) => ({
      ...log,
      combo_graph: unmarshalComboGraph(log.combo_graph),
    })) || []
  );
}

/**
 * Get a specific combo log by ID
 */
export async function getComboLog(logId: string): Promise<ComboLog | null> {
  const { data, error } = await supabase
    .from("ComboLogs")
    .select("*")
    .eq("id", logId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is not an error
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error fetching ComboLog:", error);
    throw error;
  }

  return {
    ...data,
    comboGraph: unmarshalComboGraph(data.combo_graph),
  };
}

interface UpdateComboLogParams {
  landed?: boolean;
  rating?: number;
  notes?: string;
  locationName?: string;
  surfaceType?: string;
  videoUrls?: string[];
  thumbnailUrl?: string;
  isPublic?: boolean;
}

/**
 * Update a combo log
 */
export async function updateComboLog(
  logId: string,
  updates: UpdateComboLogParams
): Promise<ComboLog> {
  const updateData: Database["public"]["Tables"]["ComboLogs"]["Update"] = {};

  if (updates.landed !== undefined) {
    updateData.landed = updates.landed;
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
  if (updates.videoUrls !== undefined) {
    updateData.video_urls = updates.videoUrls;
  }
  if (updates.thumbnailUrl !== undefined) {
    updateData.thumbnail_url = updates.thumbnailUrl;
  }
  if (updates.isPublic !== undefined) {
    updateData.is_public = updates.isPublic;
  }

  const { data, error } = await supabase
    .from("ComboLogs")
    .update(updateData)
    .eq("id", logId)
    .select()
    .single();

  if (error) {
    console.error("Error updating ComboLog:", error);
    throw error;
  }

  return {
    ...data,
    comboGraph: unmarshalComboGraph(data.combo_graph),
  };
}

/**
 * Delete a combo log
 */
export async function deleteComboLog(logId: string): Promise<void> {
  const { error } = await supabase.from("ComboLogs").delete().eq("id", logId);

  if (error) {
    console.error("Error deleting ComboLog:", error);
    throw error;
  }
}

/**
 * Get public combo logs (for social feed)
 */
export async function getPublicComboLogs(limit = 50): Promise<ComboLog[]> {
  const { data, error } = await supabase
    .from("ComboLogs")
    .select("*")
    .eq("is_public", true)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching public ComboLogs:", error);
    throw error;
  }

  return (
    data?.map((log) => ({
      ...log,
      combo_graph: unmarshalComboGraph(log.combo_graph),
    })) || []
  );
}
