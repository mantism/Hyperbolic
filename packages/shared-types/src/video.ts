// Video upload related types
export interface VideoUploadRequest {
  trickId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
}

export interface VideoUploadResponse {
  uploadUrl: string;
  videoId: string;
  expiresAt: string;
}

export enum VideoUploadStatus {
  Pending = "pending",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}

interface BaseVideo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  media_type: "video" | "image";
  upload_status: VideoUploadStatus;
  created_at: string | null;
  updated_at: string | null;
}
export interface TrickVideo extends BaseVideo {
  user_trick_id: string;
  trick_id: string;
  trick_name?: string; // Optional - populated when fetching user videos
}

export interface ComboVideo extends BaseVideo {
  user_combo_id: string;
}

export type UserVideo = TrickVideo | ComboVideo;

export interface PresignedUrlRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  uploadId: string;
  fields?: Record<string, string>;
  expiresAt: string;
}

export interface VideoProcessingStatus {
  videoId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
  outputs?: {
    thumbnail?: string;
    preview?: string;
    transcoded?: string[];
  };
}
