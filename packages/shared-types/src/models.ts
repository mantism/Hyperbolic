import { Database } from "./database.types";

/**
 * Trick model from the database
 */
export type Trick = Database["public"]["Tables"]["Tricks"]["Row"];

/**
 * UserTrick model with augmented data
 * Extends the database row with computed/fetched fields
 */
export type UserTrick = Database["public"]["Tables"]["UserToTricks"]["Row"] & {
  trick: Trick;
  landedSurfaces?: string[];
};
