import { searchTricks, hasExactTrickMatch } from "./trickSearch";
import { createTrick } from "./createTrick";
import { Trick } from "@hyperbolic/shared-types";

describe("trickSearch", () => {
  const mockTricks: Trick[] = [
    createTrick({
      id: "butterfly-twist",
      name: "Butterfly Twist",
      aliases: ["btwist", "b-twist"],
    }),
    createTrick({
      id: "butterfly-kick",
      name: "Butterfly Kick",
      aliases: ["b-kick"],
    }),
    createTrick({
      id: "cheat-900",
      name: "Cheat 900",
      aliases: ["c9"],
    }),
    createTrick({
      id: "cheat-1080",
      name: "Cheat 1080",
      aliases: ["cheat 900 double", "c10"],
    }),
    createTrick({
      id: "cheat-1080-shuriken",
      name: "Cheat 1080 Shuriken",
      aliases: ["cheat 900 shuriken"],
    }),
    createTrick({
      id: "aerial",
      name: "Aerial",
      aliases: [],
    }),
    createTrick({
      id: "corkscrew",
      name: "Corkscrew",
      aliases: ["cork"],
    }),
  ];

  describe("searchTricks", () => {
    it("returns empty array for search text shorter than 2 characters", () => {
      expect(searchTricks(mockTricks, "b")).toEqual([]);
      expect(searchTricks(mockTricks, "")).toEqual([]);
    });

    it("prioritizes exact name matches", () => {
      const results = searchTricks(mockTricks, "Cheat 900");
      expect(results[0].name).toBe("Cheat 900");
    });

    it("prioritizes exact alias matches over partial matches", () => {
      const results = searchTricks(mockTricks, "btwist");
      expect(results[0].name).toBe("Butterfly Twist");
    });

    it("ranks starts-with matches higher than contains matches", () => {
      const results = searchTricks(mockTricks, "butt");
      expect(results[0].name).toBe("Butterfly Twist");
      expect(results[1].name).toBe("Butterfly Kick");
    });

    it("matches tricks by name (case-insensitive)", () => {
      const results = searchTricks(mockTricks, "butterfly");
      expect(results).toHaveLength(2);
      expect(results[0].name).toContain("Butterfly");
      expect(results[1].name).toContain("Butterfly");
    });

    it("matches tricks by aliases", () => {
      const results = searchTricks(mockTricks, "cork");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Corkscrew");
    });

    it("handles partial matches in aliases", () => {
      const results = searchTricks(mockTricks, "cheat 900");
      expect(results.length).toBeGreaterThan(0);
      // Exact match should be first
      expect(results[0].name).toBe("Cheat 900");
    });

    it("respects maxResults parameter", () => {
      const results = searchTricks(mockTricks, "cheat", 2);
      expect(results).toHaveLength(2);
    });

    it("returns all results when maxResults is not specified", () => {
      const results = searchTricks(mockTricks, "cheat");
      expect(results.length).toBeGreaterThan(2);
    });

    it("trims whitespace from search text", () => {
      const results1 = searchTricks(mockTricks, "  aerial  ");
      const results2 = searchTricks(mockTricks, "aerial");
      expect(results1).toEqual(results2);
    });

    it("returns empty array when no matches found", () => {
      const results = searchTricks(mockTricks, "zzzzz");
      expect(results).toEqual([]);
    });

    it("handles tricks with no aliases", () => {
      const results = searchTricks(mockTricks, "aerial");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Aerial");
    });

    it("ranks name matches higher than alias matches", () => {
      const results = searchTricks(mockTricks, "cork");
      // "Corkscrew" (name starts with) should rank higher than any alias match
      expect(results[0].name).toBe("Corkscrew");
    });

    it("matches tricks by exact ID", () => {
      const results = searchTricks(mockTricks, "aerial");
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("aerial");
    });

    it("matches tricks by ID starting with search", () => {
      const results = searchTricks(mockTricks, "butterfly");
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Should match both butterfly-twist and butterfly-kick
      expect(results.some((t) => t.id === "butterfly-twist")).toBe(true);
      expect(results.some((t) => t.id === "butterfly-kick")).toBe(true);
    });

    it("matches tricks by ID containing search", () => {
      const results = searchTricks(mockTricks, "1080");
      expect(results.length).toBeGreaterThanOrEqual(2);
      // Should match cheat-1080 and cheat-1080-shuriken
      expect(results.some((t) => t.id === "cheat-1080")).toBe(true);
      expect(results.some((t) => t.id === "cheat-1080-shuriken")).toBe(true);
    });

    it("prioritizes exact ID match equally with exact name match", () => {
      const results = searchTricks(mockTricks, "corkscrew");
      expect(results[0].id).toBe("corkscrew");
    });

    it("matches tricks by ID with hyphens", () => {
      const results = searchTricks(mockTricks, "cheat-900");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe("cheat-900");
    });
  });

  describe("hasExactTrickMatch", () => {
    it("returns true for exact name match (case-insensitive)", () => {
      expect(hasExactTrickMatch(mockTricks, "Butterfly Twist")).toBe(true);
      expect(hasExactTrickMatch(mockTricks, "butterfly twist")).toBe(true);
      expect(hasExactTrickMatch(mockTricks, "BUTTERFLY TWIST")).toBe(true);
    });

    it("returns false for partial name match", () => {
      expect(hasExactTrickMatch(mockTricks, "Butterfly")).toBe(false);
      expect(hasExactTrickMatch(mockTricks, "butt")).toBe(false);
    });

    it("returns false for alias match", () => {
      expect(hasExactTrickMatch(mockTricks, "btwist")).toBe(false);
      expect(hasExactTrickMatch(mockTricks, "cork")).toBe(false);
    });

    it("returns false for non-existent trick", () => {
      expect(hasExactTrickMatch(mockTricks, "Nonexistent Trick")).toBe(false);
    });

    it("trims whitespace from search text", () => {
      expect(hasExactTrickMatch(mockTricks, "  Aerial  ")).toBe(true);
    });

    it("returns false for empty search text", () => {
      expect(hasExactTrickMatch(mockTricks, "")).toBe(false);
    });

    it("handles search text shorter than 2 characters", () => {
      expect(hasExactTrickMatch(mockTricks, "A")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty tricks array", () => {
      expect(searchTricks([], "butterfly")).toEqual([]);
      expect(hasExactTrickMatch([], "butterfly")).toBe(false);
    });

    it("handles tricks with empty aliases array", () => {
      const tricksWithEmptyAliases: Trick[] = [
        createTrick({
          id: "1",
          name: "Test Trick",
          aliases: [],
        }),
      ];
      const results = searchTricks(tricksWithEmptyAliases, "test");
      expect(results).toHaveLength(1);
    });

    it("handles special characters in search text", () => {
      const results = searchTricks(mockTricks, "b-twist");
      expect(results.length).toBeGreaterThan(0);
    });

    it("handles numbers in search text", () => {
      const results = searchTricks(mockTricks, "900");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Cheat 900");
    });
  });
});
