import { File } from "expo-file-system";

import { supabase } from "@/lib/supabase/supabase";

import {
  ComboVideo,
  TrickVideo,
  VideoType,
  VideoUploadRequest,
  VideoUploadResponse,
} from "@hyperbolic/shared-types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Fetch all videos for a trick, optionally filtered by user
 */
export async function getTrickVideos(
  trickId: string,
  userId?: string,
): Promise<TrickVideo[]> {
  // First, get the UserToTricks record for this trick
  let query = supabase.from("UserToTricks").select("id").eq("trickID", trickId);

  // If userId is provided, filter by user
  if (userId) {
    query = query.eq("userID", userId);
  }

  const { data: userTricks, error: userTricksError } = await query;

  if (userTricksError) {
    console.error("getTrickVideos - userTricksError:", userTricksError);
    throw new Error(`Failed to fetch user tricks: ${userTricksError.message}`);
  }

  if (!userTricks || userTricks.length === 0) {
    return [];
  }

  // Get all user_trick_ids
  const userTrickIds = userTricks.map((ut) => ut.id);

  // Fetch TrickMedia for these user_trick_ids
  const { data: trickMedia, error: mediaError } = await supabase
    .from("TrickMedia")
    .select("*")
    .in("user_trick_id", userTrickIds)
    .order("created_at", { ascending: false });

  if (mediaError) {
    throw new Error(`Failed to fetch trick media: ${mediaError.message}`);
  }

  return trickMedia || [];
}

/**
 * Fetch all videos for a user across all tricks
 */
export async function getUserVideos(userId: string): Promise<TrickVideo[]> {
  // First, get all UserToTricks for this user
  const { data: userTricks, error: userTricksError } = await supabase
    .from("UserToTricks")
    .select("id, trickID")
    .eq("userID", userId);

  if (userTricksError) {
    console.error("getUserVideos - userTricksError:", userTricksError);
    throw new Error(`Failed to fetch user tricks: ${userTricksError.message}`);
  }

  if (!userTricks || userTricks.length === 0) {
    return [];
  }

  // Get all user_trick_ids
  const userTrickIds = userTricks.map((ut) => ut.id);

  // Create a map of user_trick_id -> trick_id for later lookup
  const trickIdMap = new Map(userTricks.map((ut) => [ut.id, ut.trickID]));

  // Fetch TrickMedia for these user_trick_ids
  const { data: trickMedia, error: mediaError } = await supabase
    .from("TrickMedia")
    .select("*")
    .in("user_trick_id", userTrickIds)
    .eq("upload_status", "completed")
    .order("created_at", { ascending: false });

  if (mediaError) {
    throw new Error(`Failed to fetch trick media: ${mediaError.message}`);
  }

  if (!trickMedia || trickMedia.length === 0) {
    return [];
  }

  // Get unique trick IDs from the media
  const uniqueTrickIds = Array.from(
    new Set(trickMedia.map((media) => trickIdMap.get(media.user_trick_id))),
  ).filter((id): id is string => id !== undefined);

  // Fetch trick names
  const { data: tricks, error: tricksError } = await supabase
    .from("Tricks")
    .select("id, name")
    .in("id", uniqueTrickIds);

  if (tricksError) {
    console.error("getUserVideos - tricksError:", tricksError);
    // Don't throw - we can still return videos without trick names
  }

  const trickNameMap = new Map(
    tricks?.map((trick) => [trick.id, trick.name]) || [],
  );

  // Add trick names to videos
  return trickMedia.map((media) => ({
    ...media,
    trick_name: trickNameMap.get(trickIdMap.get(media.user_trick_id) || ""),
    trick_id: trickIdMap.get(media.user_trick_id) || "",
  }));
}

/**
 * Fetch all videos for a combo
 */
export async function getComboVideos(comboId: string): Promise<ComboVideo[]> {
  const { data: comboMedia, error: mediaError } = await supabase
    .from("ComboMedia")
    .select("*")
    .eq("user_combo_id", comboId)
    .eq("upload_status", "completed")
    .order("created_at", { ascending: false });

  if (mediaError) {
    throw new Error(`Failed to fetch combo media: ${mediaError.message}`);
  }

  return comboMedia || [];
}

/**
 * Link a TrickMedia record to a specific TrickLog
 */
export async function linkVideoToTrickLog(
  videoId: string,
  tricklogId: string,
): Promise<void> {
  const { error } = await supabase
    .from("TrickMedia")
    .update({ tricklog_id: tricklogId })
    .eq("id", videoId);

  if (error) {
    console.error("Error linking video to trick log:", error);
    throw new Error(`Failed to link video to log: ${error.message}`);
  }
}

export async function deleteVideo(videoId: string, type: VideoType) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const endpoint = `${API_URL}/api/v1/videos/${videoId}?type=${type}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Failed to delete video: ${response.status}`,
    );
  }
}

export async function uploadThumbnail(
  videoId: string,
  imageUri: string,
  type: VideoType,
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  // Create form data
  const formData = new FormData();

  // Extract filename from URI or use default
  const filename = imageUri.split("/").pop() || "thumbnail.jpg";

  // Append the file to form data
  // @ts-ignore - React Native FormData accepts uri/name/type object
  formData.append("thumbnail", {
    uri: imageUri,
    name: filename,
    type: "image/jpeg",
  });

  const response = await fetch(
    `${API_URL}/api/v1/videos/${videoId}/thumbnail?type=${type}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        // Don't set Content-Type - let fetch set it with boundary
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Failed to upload thumbnail: ${response.status}`,
    );
  }

  const result = await response.json();
  return result.thumbnailUrl;
}

/**
 * Upload a thumbnail image for a trick video
 */
export const uploadTrickThumbnail = (videoId: string, imageUri: string) =>
  uploadThumbnail(videoId, imageUri, VideoType.Trick);

export const uploadComboThumbnail = (videoId: string, imageUri: string) =>
  uploadThumbnail(videoId, imageUri, VideoType.Combo);

// ============================================================================
// Video Upload Functions
// ============================================================================

async function requestVideoUpload(
  request: VideoUploadRequest,
): Promise<VideoUploadResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const endpoint = `${API_URL}/api/v1/videos/upload/request`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Upload request error:", error);
    throw new Error(error.error || `Upload request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Upload video file to R2 using presigned URL
 */
async function uploadVideoToR2(
  fileUri: string,
  uploadUrl: string,
  mimeType: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const file = new File(fileUri);
  const fileContent = await file.arrayBuffer();

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: fileContent,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status: ${response.status}`);
  }
}

/**
 * Notify backend that video upload is complete
 */
async function completeVideoUpload(videoId: string, type: VideoType) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const endpoint = `${API_URL}/api/v1/videos/upload/complete`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ type, videoId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Complete video upload failed: ${response.status}`,
    );
  }
}

export async function uploadVideo(
  videoUri: string,
  request: VideoUploadRequest,
  onProgress?: (progress: number) => void,
): Promise<string> {
  try {
    // Step 1: Request presigned upload URL
    onProgress?.(10);
    const uploadResponse = await requestVideoUpload(request);

    // Step 2: Upload video to R2
    onProgress?.(20);
    await uploadVideoToR2(
      videoUri,
      uploadResponse.uploadUrl,
      request.mimeType,
      (p) => {
        // Map file upload progress (20-90%)
        onProgress?.(20 + p * 0.7);
      },
    );

    // Step 3: Mark upload as complete
    onProgress?.(90);
    await completeVideoUpload(uploadResponse.videoId, request.type);

    onProgress?.(100);
    return uploadResponse.videoId;
  } catch (error) {
    console.error("Video upload failed:", error);
    throw error;
  }
}
