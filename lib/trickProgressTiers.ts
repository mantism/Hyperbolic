export enum TrickTier {
  NONE = "none",
  BASIC = "basic",
  ADVANCED = "advanced",
  EXPERT = "expert",
  MASTER = "master",
  LEGENDARY = "legendary",
}

export const TIER_THRESHOLDS = {
  [TrickTier.NONE]: 0,
  [TrickTier.BASIC]: 1,
  [TrickTier.ADVANCED]: 10,
  [TrickTier.EXPERT]: 100,
  [TrickTier.MASTER]: 1000,
  [TrickTier.LEGENDARY]: 10000,
} as const;

export const TIER_COLORS = {
  [TrickTier.NONE]: "#6B7280", // Gray
  [TrickTier.BASIC]: "#10B981", // Green
  [TrickTier.ADVANCED]: "#3B82F6", // Blue
  [TrickTier.EXPERT]: "#8B5CF6", // Purple
  [TrickTier.MASTER]: "#F59E0B", // Gold/Amber
  [TrickTier.LEGENDARY]: "#EF4444", // Red/Crimson
} as const;

export const TIER_NAMES = {
  [TrickTier.NONE]: "Unlearned",
  [TrickTier.BASIC]: "Basic",
  [TrickTier.ADVANCED]: "Advanced",
  [TrickTier.EXPERT]: "Expert",
  [TrickTier.MASTER]: "Master",
  [TrickTier.LEGENDARY]: "Legendary",
} as const;

export const TIER_DESCRIPTIONS = {
  [TrickTier.NONE]: "Not yet landed",
  [TrickTier.BASIC]: "1+ landings",
  [TrickTier.ADVANCED]: "10+ landings",
  [TrickTier.EXPERT]: "100+ landings",
  [TrickTier.MASTER]: "1,000+ landings",
  [TrickTier.LEGENDARY]: "10,000+ landings",
} as const;

/**
 * Get the tier based on the number of stomps/landings
 */
export function getTrickTier(stomps: number): TrickTier {
  if (stomps === 0) return TrickTier.NONE;

  if (stomps >= TIER_THRESHOLDS[TrickTier.LEGENDARY]) {
    return TrickTier.LEGENDARY;
  }
  if (stomps >= TIER_THRESHOLDS[TrickTier.MASTER]) {
    return TrickTier.MASTER;
  }
  if (stomps >= TIER_THRESHOLDS[TrickTier.EXPERT]) {
    return TrickTier.EXPERT;
  }
  if (stomps >= TIER_THRESHOLDS[TrickTier.ADVANCED]) {
    return TrickTier.ADVANCED;
  }
  if (stomps >= TIER_THRESHOLDS[TrickTier.BASIC]) {
    return TrickTier.BASIC;
  }

  return TrickTier.NONE;
}

/**
 * Get the color for a given tier
 */
export function getTierColor(tier: TrickTier): string {
  return TIER_COLORS[tier];
}

/**
 * Get the display name for a given tier
 */
export function getTierName(tier: TrickTier): string {
  return TIER_NAMES[tier];
}

/**
 * Get the description for a given tier
 */
export function getTierDescription(tier: TrickTier): string {
  return TIER_DESCRIPTIONS[tier];
}

/**
 * Calculate progress to the next tier
 */
export function getProgressToNextTier(
  stomps: number,
  currentTier: TrickTier
): {
  nextTier: TrickTier | null;
  progress: number;
  remaining: number;
} {
  const tierOrder = [
    TrickTier.NONE,
    TrickTier.BASIC,
    TrickTier.ADVANCED,
    TrickTier.EXPERT,
    TrickTier.MASTER,
    TrickTier.LEGENDARY,
  ];

  const currentIndex = tierOrder.indexOf(currentTier);

  // Already at max tier
  if (currentTier === TrickTier.LEGENDARY || currentIndex === -1) {
    return { nextTier: null, progress: 100, remaining: 0 };
  }

  const nextTier = tierOrder[currentIndex + 1];
  const nextThreshold = TIER_THRESHOLDS[nextTier];
  const currentThreshold = TIER_THRESHOLDS[currentTier];

  const progress =
    ((stomps - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  const remaining = nextThreshold - stomps;

  return {
    nextTier,
    progress: Math.min(100, Math.max(0, progress)),
    remaining: Math.max(0, remaining),
  };
}

/**
 * Get border style properties for a tier (for React Native)
 */
export function getTierBorderStyle(tier: TrickTier) {
  switch (tier) {
    case TrickTier.BASIC:
      return {
        borderWidth: 3,
        borderColor: TIER_COLORS[tier],
      };
    case TrickTier.ADVANCED:
      return {
        borderWidth: 4,
        borderColor: TIER_COLORS[tier],
      };
    case TrickTier.EXPERT:
      return {
        borderWidth: 4,
        borderColor: TIER_COLORS[tier],
      };
    case TrickTier.MASTER:
      return {
        borderWidth: 5,
        borderColor: TIER_COLORS[tier],
        shadowColor: TIER_COLORS[tier],
        shadowOpacity: 0.4,
        shadowRadius: 8,
      };
    case TrickTier.LEGENDARY:
      return {
        borderWidth: 5,
        borderColor: TIER_COLORS[tier],
        shadowColor: TIER_COLORS[tier],
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
      };
    default:
      return {};
  }
}
