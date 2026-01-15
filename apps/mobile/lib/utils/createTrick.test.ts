import { createTrick } from "./createTrick";

describe("createTrick", () => {
  beforeEach(() => {
    // Mock Date to get consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("createTrick", () => {
    it("creates a trick with only required fields", () => {
      const trick = createTrick({
        id: "butterfly-twist",
        name: "Butterfly Twist",
      });

      expect(trick).toEqual({
        id: "butterfly-twist",
        name: "Butterfly Twist",
        aliases: null,
        categories: null,
        description: null,
        featured_video_id: null,
        prereqs: null,
        progressions: null,
        rating: null,
        created_at: "2024-01-15T12:00:00.000Z",
        lastUpdated: "2024-01-15T12:00:00.000Z",
      });
    });

    it("creates a trick with all optional fields", () => {
      const trick = createTrick({
        id: "butterfly-twist",
        name: "Butterfly Twist",
        aliases: ["btwist", "b-twist"],
        categories: ["kicks", "twists"],
        description: "A spinning kick combination",
        featured_video_id: "video123",
        prereqs: ["butterfly-kick"],
        progressions: ["butterfly-twist-double"],
        rating: 4.5,
      });

      expect(trick).toEqual({
        id: "butterfly-twist",
        name: "Butterfly Twist",
        aliases: ["btwist", "b-twist"],
        categories: ["kicks", "twists"],
        description: "A spinning kick combination",
        featured_video_id: "video123",
        prereqs: ["butterfly-kick"],
        progressions: ["butterfly-twist-double"],
        rating: 4.5,
        created_at: "2024-01-15T12:00:00.000Z",
        lastUpdated: "2024-01-15T12:00:00.000Z",
      });
    });

    it("handles empty arrays for optional array fields", () => {
      const trick = createTrick({
        id: "test-trick",
        name: "Test Trick",
        aliases: [],
        categories: [],
        prereqs: [],
        progressions: [],
      });

      expect(trick.aliases).toEqual([]);
      expect(trick.categories).toEqual([]);
      expect(trick.prereqs).toEqual([]);
      expect(trick.progressions).toEqual([]);
    });

    it("sets timestamps to current date", () => {
      const trick = createTrick({
        id: "test-trick",
        name: "Test Trick",
      });

      expect(trick.created_at).toBe("2024-01-15T12:00:00.000Z");
      expect(trick.lastUpdated).toBe("2024-01-15T12:00:00.000Z");
    });

    it("handles null values explicitly passed", () => {
      const trick = createTrick({
        id: "test-trick",
        name: "Test Trick",
        aliases: null,
        categories: null,
        description: null,
      });

      expect(trick.aliases).toBeNull();
      expect(trick.categories).toBeNull();
      expect(trick.description).toBeNull();
    });

    it("handles zero rating", () => {
      const trick = createTrick({
        id: "test-trick",
        name: "Test Trick",
        rating: 0,
      });

      expect(trick.rating).toBe(0);
    });

    it("preserves special characters in id and name", () => {
      const trick = createTrick({
        id: "540-kick",
        name: "540° Kick",
      });

      expect(trick.id).toBe("540-kick");
      expect(trick.name).toBe("540° Kick");
    });
  });
});
