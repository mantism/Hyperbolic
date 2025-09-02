// Category color mappings for trick cards
const CATEGORY_COLORS = {
  // Kicks & Basics
  'kick': '#FF6B6B',
  'basic': '#4ECDC4',
  'stance': '#45B7D1',
  
  // Flips & Twists
  'flip': '#96CEB4',
  'twist': '#FFEAA7',
  'aerial': '#DDA0DD',
  'butterfly': '#FF8A80',
  
  // Advanced movements
  'tornado': '#81C784',
  'corkscrew': '#FFB74D',
  'raiz': '#F06292',
  'webster': '#BA68C8',
  
  // Transitions & Combos
  'transition': '#64B5F6',
  'combo': '#A1C4FD',
  'flow': '#C5E1A5',
  
  // Power & Gymnastics
  'power': '#FF5722',
  'gymnastics': '#9C27B0',
  'breakdancing': '#FF9800',
  'martial arts': '#795548',
  
  // Specialized
  'vert': '#00ACC1',
  'hyperhook': '#8BC34A',
  'inverted': '#673AB7',
  'ground': '#8D6E63',
  'wallrun': '#607D8B',
} as const;

// Default colors for categories not in the map
const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
  '#DDA0DD', '#FF8A80', '#81C784', '#FFB74D', '#F06292',
  '#BA68C8', '#64B5F6', '#A1C4FD', '#C5E1A5', '#FF5722'
];

/**
 * Get the color for a given category
 */
export function getCategoryColor(category: string | null | undefined): string {
  if (!category) return DEFAULT_COLORS[0];
  
  const normalizedCategory = category.toLowerCase().trim();
  
  // Check if we have a specific color for this category
  if (normalizedCategory in CATEGORY_COLORS) {
    return CATEGORY_COLORS[normalizedCategory as keyof typeof CATEGORY_COLORS];
  }
  
  // Fall back to a deterministic default color based on category name
  const hash = normalizedCategory.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DEFAULT_COLORS[hash % DEFAULT_COLORS.length];
}

/**
 * Get a lighter version of the category color for backgrounds
 */
export function getCategoryColorLight(category: string | null | undefined): string {
  const baseColor = getCategoryColor(category);
  
  // Convert hex to rgba with reduced opacity for lighter background
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, 0.2)`;
}

/**
 * Get all available category colors (for debugging or UI purposes)
 */
export function getAllCategoryColors(): Record<string, string> {
  return { ...CATEGORY_COLORS };
}