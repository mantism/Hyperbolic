import { File } from "expo-file-system";
import { supabase } from "../supabase/supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

interface VideoUploadRequest {
  trickId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number; // milliseconds
}

interface VideoUploadResponse {
  uploadUrl: string;
  videoId: string;
  expiresAt: string;
}

interface UploadProgress {
  totalBytesSent: number;
  totalBytesExpectedToSend: number;
}

/**
 * Request a presigned upload URL from the backend
 */
export async function requestVideoUpload(
  request: VideoUploadRequest
): Promise<VideoUploadResponse> {
  // Get user's auth token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  //const tokenInfo = decodeJWT(session.access_token);

  // TODO: Only log in debug mode
  //  console.log("Token header:", tokenInfo.header);
  //  console.log("Token alg:", tokenInfo.header?.alg, "kid:", tokenInfo.header?.kid);

  const response = await fetch(`${API_URL}/api/v1/videos/upload/request`, {
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
export async function uploadVideoToR2(
  fileUri: string,
  uploadUrl: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  // Create File object from URI
  const file = new File(fileUri);

  // Read file as binary
  const fileContent = await file.arrayBuffer();

  // Upload to R2 using fetch with presigned URL
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
 * Notify backend that upload is complete
 */
export async function completeVideoUpload(videoId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/v1/videos/upload/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ videoId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `Complete upload failed: ${response.status}`
    );
  }
}

/**
 * Full video upload flow: request URL, upload to R2, mark complete
 */
export async function uploadVideo(
  videoUri: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  trickId: string,
  userId: string,
  duration?: number,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Step 1: Request presigned upload URL
    onProgress?.(10);
    const uploadResponse = await requestVideoUpload({
      trickId,
      userId,
      fileName,
      fileSize,
      mimeType,
      duration,
    });

    // Step 2: Upload video to R2
    onProgress?.(20);
    await uploadVideoToR2(videoUri, uploadResponse.uploadUrl, mimeType, (p) => {
      // Map file upload progress (20-90%)
      onProgress?.(20 + p * 0.7);
    });

    // Step 3: Mark upload as complete
    onProgress?.(90);
    await completeVideoUpload(uploadResponse.videoId);

    onProgress?.(100);
    return uploadResponse.videoId;
  } catch (error) {
    console.error("Video upload failed:", error);
    throw error;
  }
}
