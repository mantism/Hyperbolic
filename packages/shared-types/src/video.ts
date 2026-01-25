// Video upload related types

export enum VideoType {
  Trick = "trick",
  Combo = "combo",
}

export interface VideoUploadRequest {
  type: VideoType;
  parentId: string;
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

export function isTrickVideo(video: UserVideo): video is TrickVideo {
  return "user_trick_id" in video;
}

export function isComboVideo(video: UserVideo): video is ComboVideo {
  return "user_combo_id" in video;
}

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

/**
 * Represents a video selected for upload, either directly from the library
 * or after trimming.
 */
export interface SelectedVideo {
  /** The local file URI of the video */
  uri: string;
  /** Duration in seconds */
  duration: number;
  /** Original filename or generated name */
  filename: string;
  /** Whether this video was trimmed */
  isTrimmed: boolean;
}
