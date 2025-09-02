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

export interface VideoMetadata {
  id: string;
  trickId: string;
  userId: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
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
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  outputs?: {
    thumbnail?: string;
    preview?: string;
    transcoded?: string[];
  };
}