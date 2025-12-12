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
import {
  getTrickVideos,
  getUserVideos,
  deleteVideo,
  uploadThumbnail,
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

    it("should delete video successfully", async () => {
      mockAuthSession({
        access_token: "valid-token",
      });
      mockFetchResponse(createMockFetchResponse({}));

      await deleteVideo(videoId);

      expectFetchCalledWith(`http://localhost:8080/api/v1/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          Authorization: "Bearer valid-token",
        },
      });
    });

    it("should throw error when not authenticated", async () => {
      mockNoAuthSession();

      await expect(deleteVideo(videoId)).rejects.toThrow("Not authenticated");
    });

    it("should throw error when deletion fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(createMockErrorResponse("Video not found", 404));

      await expect(deleteVideo(videoId)).rejects.toThrow("Video not found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle network errors", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchError(new Error("Network error"));

      await expect(deleteVideo(videoId)).rejects.toThrow("Network error");
    });
  });

  describe("uploadThumbnail", () => {
    const videoId = "video-123";
    const imageUri = "file:///path/to/image.jpg";

    it("should upload thumbnail successfully", async () => {
      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(
        createMockFetchResponse({
          thumbnailUrl: "https://test.r2.dev/thumbnail.jpg",
        })
      );

      const result = await uploadThumbnail(videoId, imageUri);

      expect(result).toBe("https://test.r2.dev/thumbnail.jpg");
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:8080/api/v1/videos/${videoId}/thumbnail`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer valid-token",
          }),
        })
      );
    });

    it("should throw error when not authenticated", async () => {
      mockNoAuthSession();

      await expect(uploadThumbnail(videoId, imageUri)).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("should throw error when upload fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(createMockErrorResponse("Upload failed", 500));

      await expect(uploadThumbnail(videoId, imageUri)).rejects.toThrow(
        "Upload failed"
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("uploadVideo", () => {
    const mockParams = {
      videoUri: "file:///path/to/video.mp4",
      fileName: "video.mp4",
      fileSize: 1024000,
      mimeType: "video/mp4",
      trickId: "trick-123",
      userId: "user-456",
      duration: 10000,
    };

    it("should complete full upload flow with progress callbacks", async () => {
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
        mockParams.videoUri,
        mockParams.fileName,
        mockParams.fileSize,
        mockParams.mimeType,
        mockParams.trickId,
        mockParams.userId,
        mockParams.duration,
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
    });

    it("should throw error if upload request fails", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockAuthSession({ access_token: "valid-token" });
      mockFetchResponse(createMockErrorResponse("Invalid request", 400));

      await expect(
        uploadVideo(
          mockParams.videoUri,
          mockParams.fileName,
          mockParams.fileSize,
          mockParams.mimeType,
          mockParams.trickId,
          mockParams.userId
        )
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
        uploadVideo(
          mockParams.videoUri,
          mockParams.fileName,
          mockParams.fileSize,
          mockParams.mimeType,
          mockParams.trickId,
          mockParams.userId
        )
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
        mockParams.videoUri,
        mockParams.fileName,
        mockParams.fileSize,
        mockParams.mimeType,
        mockParams.trickId,
        mockParams.userId
      );

      expect(videoId).toBe("new-video-id");
    });
  });
});
