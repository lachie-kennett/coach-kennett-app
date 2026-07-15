export const FOCUS_AREAS = [
  "lower push", "lower pull", "upper push", "upper pull",
  "arms", "mobility", "core", "power", "plyo",
  "resilience", "conditioning", "speed", "agility", "other",
] as const;

export type FocusArea = (typeof FOCUS_AREAS)[number];
