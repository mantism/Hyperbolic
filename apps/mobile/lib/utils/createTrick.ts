import { Trick } from "@hyperbolic/shared-types";

/**
 * Parameters required to create a Trick
 */
interface CreateTrickParams {
  id: string;
  name: string;
  aliases?: string[] | null;
  categories?: string[] | null;
  description?: string | null;
  featured_video_id?: string | null;
  prereqs?: string[] | null;
  progressions?: string[] | null;
  rating?: number | null;
}

/**
 * Creates a fully constructed Trick object with proper defaults
 * Ensures all required fields are initialized
 *
 * @param params - Minimal required parameters (id and name)
 * @returns Complete Trick object with all fields
 *
 * @example
 * // Create a minimal trick
 * const trick = createTrick({ id: "butterfly-twist", name: "Butterfly Twist" });
 *
 * @example
 * // Create a trick with aliases
 * const trick = createTrick({
 *   id: "butterfly-twist",
 *   name: "Butterfly Twist",
 *   aliases: ["btwist", "b-twist"]
 * });
 */
export function createTrick(params: CreateTrickParams): Trick {
  const now = new Date().toISOString();

  return {
    id: params.id,
    name: params.name,
    aliases: params.aliases ?? null,
    categories: params.categories ?? null,
    description: params.description ?? null,
    featured_video_id: params.featured_video_id ?? null,
    prereqs: params.prereqs ?? null,
    progressions: params.progressions ?? null,
    rating: params.rating ?? null,
    created_at: now,
    lastUpdated: now,
  };
}

