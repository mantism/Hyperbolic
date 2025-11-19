import { supabase } from "../supabase/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

export interface TrickVideo {
  id: string;
  user_trick_id: string;
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  media_type: "video" | "image";
  upload_status: "pending" | "processing" | "completed" | "failed";
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Fetch all videos for a trick, optionally filtered by user
 */
export async function getTrickVideos(
  trickId: string,
  userId?: string
): Promise<TrickVideo[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const queryParams = userId ? `?userId=${userId}` : "";
  const response = await fetch(
    `${API_URL}/api/v1/videos/trick/${trickId}${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch videos: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a video
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/v1/videos/${videoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to delete video: ${response.status}`);
  }
}

/**
 * Upload a thumbnail image for a video
 */
export async function uploadThumbnail(
  videoId: string,
  imageUri: string
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
    `${API_URL}/api/v1/videos/${videoId}/thumbnail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        // Don't set Content-Type - let fetch set it with boundary
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Failed to upload thumbnail: ${response.status}`
    );
  }

  const result = await response.json();
  return result.thumbnailUrl;
}
