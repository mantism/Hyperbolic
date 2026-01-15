import { Trick } from "@hyperbolic/shared-types";

/**
 * Scores and ranks tricks based on search query
 * Higher scores = better matches
 */
function scoreTrick(trick: Trick, searchLower: string): number {
  const nameLower = trick.name.toLowerCase();
  const idLower = trick.id.toLowerCase();
  let score = 0;

  // Exact match to name or id - highest priority
  if (nameLower === searchLower || idLower === searchLower) {
    score = 1000;
  }
  // Starts with search - high priority
  else if (
    nameLower.startsWith(searchLower) ||
    idLower.startsWith(searchLower)
  ) {
    score = 500;
  }
  // Contains search in name
  else if (nameLower.includes(searchLower) || idLower.includes(searchLower)) {
    score = 100;
  }
  // Check aliases
  else if (trick.aliases) {
    const exactAliasMatch = trick.aliases.some(
      (alias) => alias.toLowerCase() === searchLower
    );
    if (exactAliasMatch) {
      score = 900; // Just below exact name match
    } else {
      const startsWithAlias = trick.aliases.some((alias) =>
        alias.toLowerCase().startsWith(searchLower)
      );
      if (startsWithAlias) {
        score = 400;
      } else {
        const containsAlias = trick.aliases.some((alias) =>
          alias.toLowerCase().includes(searchLower)
        );
        if (containsAlias) {
          score = 50;
        }
      }
    }
  }

  return score;
}

/**
 * Search and filter tricks with intelligent ranking
 * @param tricks - Array of tricks to search through
 * @param searchText - Search query
 * @param maxResults - Maximum number of results to return (default: no limit)
 * @returns Sorted array of matching tricks
 */
export function searchTricks(
  tricks: Trick[],
  searchText: string,
  maxResults?: number
): Trick[] {
  if (!searchText || searchText.length < 2) {
    return [];
  }

  const searchLower = searchText.toLowerCase().trim();

  // Score each trick for ranking
  const scoredMatches = tricks
    .map((trick) => ({
      trick,
      score: scoreTrick(trick, searchLower),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.trick);

  return maxResults ? scoredMatches.slice(0, maxResults) : scoredMatches;
}

/**
 * Check if search text exactly matches a trick name
 * @param tricks - Array of tricks to search through
 * @param searchText - Search query
 * @returns True if exact match exists
 */
export function hasExactTrickMatch(
  tricks: Trick[],
  searchText: string
): boolean {
  const searchLower = searchText.toLowerCase().trim();
  return tricks.some((trick) => trick.name.toLowerCase() === searchLower);
}
