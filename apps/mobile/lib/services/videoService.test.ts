/**
 * Unit tests for videoService.ts
 * Tests all video-related service functions with mocked dependencies
 */
import {
  mockFetch,
  createMockVideo,
  createMockVideos,
  createMockTrick,
  createMockFetchResponse,
  createMockErrorResponse,
  mockFetchResponse,
  mockFetchError,
  expectFetchCalledWith,
  createMockProgressCallback,
  supabase,
  mockAuthSession,
  mockNoAuthSession,
  resetSupabaseMocks,
} from "@/lib/testing";
import { VideoType } from "@hyperbolic/shared-types";
import {
  getTrickVideos,
  getComboVideos,
  getUserVideos,
  deleteVideo,
  uploadThumbnail,
  uploadTrickThumbnail,
  uploadComboThumbnail,
  uploadVideo,
} from "./videoService";

// Mock the Supabase client BEFORE importing the service
jest.mock("@/lib/supabase/supabase", () =>
  require("@/lib/testing/mocks/supabase")
);

// Type assertions for cleaner test code
const mockFrom = supabase.from as jest.Mock;

describe("videoService", () => {
  beforeEach(() => {
    resetSupabaseMocks();
    mockFetch.mockClear();
  });

  describe("getTrickVideos", () => {
    const trickId = "trick-123";
    const userId = "user-456";

    it("should fetch videos for a trick without user filter", async () => {
      // Setup mocks
      const mockUserTricks = [{ id: "user-trick-1" }, { id: "user-trick-2" }];
      const mockVideos = createMockVideos(2);

      // Mock UserToTricks query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockUserTricks,
            error: null,
          }),
        }),
      });

      // Mock TrickMedia query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockVideos,
              error: null,
            }),
          }),
        }),
      });

      // Execute
      const result = await getTrickVideos(trickId);

      // Assert
      expect(result).toEqual(mockVideos);
      expect(supabase.from).toHaveBeenCalledWith("UserToTricks");
      expect(supabase.from).toHaveBeenCalledWith("TrickMedia");
    });

    it("should fetch videos filtered by userId", async () => {
      const mockUserTricks = [{ id: "user-trick-1" }];
      const mockVideos = [createMockVideo()];

      // Mock UserToTricks query with user filter
      const eqMock = jest.fn().mockResolvedValue({
        data: mockUserTricks,
        error: null,
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: eqMock,
          }),
        }),
      });

      // Mock TrickMedia query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockVideos,
              error: null,
            }),
          }),
        }),
      });

      // Execute
      const result = await getTrickVideos(trickId, userId);

      // Assert
      expect(result).toEqual(mockVideos);
      expect(eqMock).toHaveBeenCalled();
    });

    it("should return empty array when no UserToTricks found", async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getTrickVideos(trickId);

      expect(result).toEqual([]);
    });

    it("should throw error when UserToTricks query fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      await expect(getTrickVideos(trickId)).rejects.toThrow(
        "Failed to fetch user tricks"
      );

      consoleErrorSpy.mockRestore();
    });

    it("should throw error when TrickMedia query fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: "user-trick-1" }],
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "Media fetch error" },
            }),
          }),
        }),
      });

      await expect(getTrickVideos(trickId)).rejects.toThrow(
        "Failed to fetch trick media"
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("getComboVideos", () => {
    const comboId = "combo-123";

    it("should fetch videos for a combo", async () => {
      const mockVideos = createMockVideos(2);

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockVideos,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await getComboVideos(comboId);

      expect(result).toEqual(mockVideos);
      expect(supabase.from).toHaveBeenCalledWith("ComboMedia");
    });

    it("should return empty array when no videos found", async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await getComboVideos(comboId);

      expect(result).toEqual([]);
    });

    it("should throw error when query fails", async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: "Database error" },
              }),
            }),
          }),
        }),
      });

      await expect(getComboVideos(comboId)).rejects.toThrow(
        "Failed to fetch combo media"
      );
    });
  });

  describe("getUserVideos", () => {
    const userId = "user-456";

    it("should fetch all videos for a user with trick names", async () => {
      const mockUserTricks = [
        { id: "user-trick-1", trickID: "trick-1" },
        { id: "user-trick-2", trickID: "trick-2" },
      ];

      const mockVideos = [
        createMockVideo({ user_trick_id: "user-trick-1" }),
        createMockVideo({ user_trick_id: "user-trick-2", id: "video-2" }),
      ];

      const mockTricks = [
        createMockTrick({ id: "trick-1", name: "Backside 1440" }),
        createMockTrick({ id: "trick-2", name: "Cork 720" }),
      ];

      // Mock UserToTricks query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockUserTricks,
            error: null,
          }),
        }),
      });

      // Mock TrickMedia query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockVideos,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Mock Tricks query
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: mockTricks,
            error: null,
          }),
        }),
      });

      // Execute
      const result = await getUserVideos(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].trick_name).toBe("Backside 1440");
      expect(result[1].trick_name).toBe("Cork 720");
    });

    it("should return empty array when user has no tricks", async () => {
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await getUserVideos(userId);

      expect(result).toEqual([]);
    });

    it("should handle missing trick names gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const mockUserTricks = [{ id: "user-trick-1", trickID: "trick-1" }];
      const mockVideos = [createMockVideo()];

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockUserTricks,
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockVideos,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Tricks query fails
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({
            data: null,
            error: { message: "Tricks query failed" },
          }),
        }),
      });

      const result = await getUserVideos(userId);

      // Should still return videos, just without trick names
      expect(result).toHaveLength(1);
      expect(result[0].trick_name).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("deleteVideo", () => {
    const videoId = "video-123";

    it("should delete trick video with correct endpoint", async () => {
      mockAuthSession({
        access_token: "valid-token",
      });
      mockFetchResponse(createMockFetchResponse({}));

      await deleteVideo(videoId, VideoType.Trick);

      expectFetchCalledWith(
        `http://localhost:8080/api/v1/videos/${videoId}?type=trick`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer valid-token",
          },
        }
      );
    });

    it("should delete combo video with correct endpoint", async () => {
      mockAuthSession({
        access_token: "valid-token",
      });
      mockFetchResponse(createMockFetchResponse({}));

      await deleteVideo(videoId, VideoType.Combo);

      expectFetchCalledWith(
        `http://localhost:8080/api/v1/videos/${videoId}?type=combo`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer valid-token",
          },
        }
      );
    });

    it("should throw error when not authenticated", async () => {
      mockNoAuthSession();

      await expect(deleteVideo(videoId, VideoType.Trick)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error when deletion fails", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(createMockErrorResponse("Video not found", 404));

      await expect(deleteVideo(videoId, VideoType.Trick)).rejects.toThrow(
        "Video not found"
      );
    });

    it("should handle network errors", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchError(new Error("Network error"));

      await expect(deleteVideo(videoId, VideoType.Trick)).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("uploadThumbnail", () => {
    const videoId = "video-123";
    const imageUri = "file:///path/to/image.jpg";

    it("should upload trick thumbnail with correct endpoint", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(
        createMockFetchResponse({
          thumbnailUrl: "https://test.r2.dev/thumbnail.jpg",
        })
      );

      const result = await uploadThumbnail(videoId, imageUri, VideoType.Trick);

      expect(result).toBe("https://test.r2.dev/thumbnail.jpg");
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/videos/${videoId}/thumbnail?type=trick`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer valid-token",
          }),
        })
      );
    });

    it("should upload combo thumbnail with correct endpoint", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(
        createMockFetchResponse({
          thumbnailUrl: "https://test.r2.dev/thumbnail.jpg",
        })
      );

      const result = await uploadThumbnail(videoId, imageUri, VideoType.Combo);

      expect(result).toBe("https://test.r2.dev/thumbnail.jpg");
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/videos/${videoId}/thumbnail?type=combo`,
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should throw error when not authenticated", async () => {
      mockNoAuthSession();

      await expect(
        uploadThumbnail(videoId, imageUri, VideoType.Trick)
      ).rejects.toThrow("Not authenticated");
    });

    it("should throw error when upload fails", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(createMockErrorResponse("Upload failed", 500));

      await expect(
        uploadThumbnail(videoId, imageUri, VideoType.Trick)
      ).rejects.toThrow("Upload failed");
    });
  });

  describe("uploadTrickThumbnail", () => {
    it("should call uploadThumbnail with VideoType.Trick", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(
        createMockFetchResponse({
          thumbnailUrl: "https://test.r2.dev/thumbnail.jpg",
        })
      );

      await uploadTrickThumbnail("video-123", "file:///image.jpg");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/videos/video-123/thumbnail?type=trick",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("uploadComboThumbnail", () => {
    it("should call uploadThumbnail with VideoType.Combo", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(
        createMockFetchResponse({
          thumbnailUrl: "https://test.r2.dev/thumbnail.jpg",
        })
      );

      await uploadComboThumbnail("video-123", "file:///image.jpg");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/videos/video-123/thumbnail?type=combo",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("uploadVideo", () => {
    const mockTrickRequest = {
      type: VideoType.Trick as const,
      trickId: "trick-123",
      userId: "user-456",
      fileName: "video.mp4",
      fileSize: 1024000,
      mimeType: "video/mp4",
      duration: 10000,
    };

    const mockComboRequest = {
      type: VideoType.Combo as const,
      comboId: "combo-123",
      userId: "user-456",
      fileName: "video.mp4",
      fileSize: 1024000,
      mimeType: "video/mp4",
      duration: 10000,
    };

    it("should complete full trick upload flow with progress callbacks", async () => {
      mockAuthSession({ access_token: "valid-token" });

      const { callback: onProgress, getProgressValues } =
        createMockProgressCallback();

      // Mock upload request response
      mockFetchResponse(
        createMockFetchResponse({
          uploadUrl: "https://r2.dev/presigned-url",
          videoId: "new-video-id",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        })
      );

      // Mock R2 upload response
      mockFetchResponse(createMockFetchResponse({}));

      // Mock complete response
      mockFetchResponse(createMockFetchResponse({}));

      // Execute
      const videoId = await uploadVideo(
        "file:///path/to/video.mp4",
        mockTrickRequest,
        onProgress
      );

      // Assert
      expect(videoId).toBe("new-video-id");

      // Should have called progress callback multiple times
      const progressValues = getProgressValues();
      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[0]).toBe(10); // Initial progress
      expect(progressValues[progressValues.length - 1]).toBe(100); // Final progress

      // Verify all three API calls were made
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify correct endpoints were called
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/videos/upload/request",
        expect.objectContaining({ method: "POST" })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/videos/upload/complete",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should complete full combo upload flow", async () => {
      mockAuthSession({ access_token: "valid-token" });

      // Mock upload request response
      mockFetchResponse(
        createMockFetchResponse({
          uploadUrl: "https://r2.dev/presigned-url",
          videoId: "new-video-id",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        })
      );

      // Mock R2 upload response
      mockFetchResponse(createMockFetchResponse({}));

      // Mock complete response
      mockFetchResponse(createMockFetchResponse({}));

      // Execute
      const videoId = await uploadVideo(
        "file:///path/to/video.mp4",
        mockComboRequest
      );

      // Assert
      expect(videoId).toBe("new-video-id");

      // Verify correct endpoints were called
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/videos/upload/request",
        expect.objectContaining({ method: "POST" })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/videos/upload/complete",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("should throw error if upload request fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(createMockErrorResponse("Invalid request", 400));

      await expect(
        uploadVideo("file:///path/to/video.mp4", mockTrickRequest)
      ).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it("should throw error if R2 upload fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockAuthSession({ access_token: "valid-token" });

      // First call succeeds (upload request)
      mockFetchResponse(
        createMockFetchResponse({
          uploadUrl: "https://r2.dev/presigned-url",
          videoId: "new-video-id",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        })
      );

      // Second call fails (R2 upload)
      mockFetchResponse(createMockErrorResponse("R2 error", 500));

      await expect(
        uploadVideo("file:///path/to/video.mp4", mockTrickRequest)
      ).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });

    it("should work without progress callback", async () => {
      mockAuthSession({ access_token: "valid-token" });

      mockFetchResponse(
        createMockFetchResponse({
          uploadUrl: "https://r2.dev/presigned-url",
          videoId: "new-video-id",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        })
      );

      mockFetchResponse(createMockFetchResponse({}));
      mockFetchResponse(createMockFetchResponse({}));

      // Should not throw even without progress callback
      const videoId = await uploadVideo(
        "file:///path/to/video.mp4",
        mockTrickRequest
      );

      expect(videoId).toBe("new-video-id");
    });
  });
});
