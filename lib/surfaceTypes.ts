export enum SurfaceType {
  SPRING_FLOOR = "spring_floor",
  GRASS = "grass",
  CONCRETE = "concrete",
  PUZZLE_MAT = "puzzle_mat",
  SAND = "sand",
  TURF = "turf",
  OTHER = "other",
}

export const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
  [SurfaceType.SPRING_FLOOR]: "Spring Floor",
  [SurfaceType.GRASS]: "Grass",
  [SurfaceType.CONCRETE]: "Concrete",
  [SurfaceType.PUZZLE_MAT]: "Puzzle Mat",
  [SurfaceType.SAND]: "Sand",
  [SurfaceType.TURF]: "Turf",
  [SurfaceType.OTHER]: "Other",
};

export const SURFACE_TYPE_COLORS: Record<SurfaceType, string> = {
  [SurfaceType.SPRING_FLOOR]: "#FBBF24", // Yellow
  [SurfaceType.GRASS]: "#10B981", // Green
  [SurfaceType.CONCRETE]: "#6B7280", // Gray
  [SurfaceType.PUZZLE_MAT]: "#3B82F6", // Blue
  [SurfaceType.SAND]: "#F59E0B", // Amber
  [SurfaceType.TURF]: "#16A34A", // Darker Green
  [SurfaceType.OTHER]: "#9CA3AF", // Light Gray
};

/**
 * Get all surface types as an array
 */
export function getAllSurfaceTypes(): SurfaceType[] {
  return Object.values(SurfaceType);
}

/**
 * Get the display label for a surface type
 */
export function getSurfaceTypeLabel(type: SurfaceType): string {
  return SURFACE_TYPE_LABELS[type] || type;
}

/**
 * Get the color for a surface type
 */
export function getSurfaceTypeColor(type: SurfaceType): string {
  return SURFACE_TYPE_COLORS[type] || SURFACE_TYPE_COLORS[SurfaceType.OTHER];
}

/**
 * Check if a string is a valid surface type
 */
export function isValidSurfaceType(type: string): type is SurfaceType {
  return Object.values(SurfaceType).includes(type as SurfaceType);
}

/**
 * Convert a string to a SurfaceType safely
 */
export function toSurfaceType(
  type: string | null | undefined
): SurfaceType | null {
  if (!type) return null;
  if (isValidSurfaceType(type)) return type;
  return null;
}
