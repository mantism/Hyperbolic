import { TrickVideo, VideoUploadStatus } from "@hyperbolic/shared-types";

/**
 * Create a mock TrickVideo object with default values
 */
export const createMockVideo = (
  overrides?: Partial<TrickVideo>
): TrickVideo => ({
  id: "video-123",
  user_trick_id: "user-trick-456",
  trick_id: "trick-789",
  url: "https://test.r2.dev/video.mp4",
  thumbnail_url: "https://test.r2.dev/thumbnail.jpg",
  duration_seconds: 10,
  file_size_bytes: 1024000,
  mime_type: "video/mp4",
  media_type: "video",
  upload_status: VideoUploadStatus.Completed,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create multiple mock videos
 */
export const createMockVideos = (count: number): TrickVideo[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockVideo({
      id: `video-${index + 1}`,
      created_at: new Date(Date.now() - index * 86400000).toISOString(), // Each day older
    })
  );
};

/**
 * Create a mock UserToTricks record
 */
export const createMockUserTrick = (overrides?: any) => ({
  id: "user-trick-123",
  userID: "user-456",
  trickID: "trick-789",
  attempts: 10,
  stomps: 5,
  landed: true,
  rating: null,
  isGoal: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock Trick record
 */
export const createMockTrick = (overrides?: any) => ({
  id: "trick-123",
  name: "Backside 1440",
  description: "A test trick",
  difficulty: 8,
  categories: ["KICKS"],
  aliases: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});
