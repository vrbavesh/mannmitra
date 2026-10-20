import "server-only";

// Provisional spec mapping and cutoffs: replace after clinical review before launch (G1), bump version to 2.
export const SCORING_VERSION = 1;
export const POSITIVE_ITEMS = [1, 3, 5, 7, 8, 10, 13, 15] as const;
export const AREAS = {
  anxiety_pct: [4, 6, 7, 10, 11, 18],
  depression_pct: [1, 2, 3, 9, 13, 14, 15, 16, 17],
  negmood_pct: [5, 8, 9, 12, 14, 16],
} as const;
export const SEVERITY_BANDS = [
  { below: 30, severity: "minimal" },
  { below: 50, severity: "mild" },
  { below: 70, severity: "moderate" },
  { below: Infinity, severity: "severe" },
] as const;
