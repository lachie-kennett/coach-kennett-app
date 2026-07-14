export const SESSION_TYPES = [
  "strength",
  "speed",
  "agility",
  "mobility",
  "conditioning",
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

// Tailwind classes per session type. Falls back to a neutral style for any
// unknown / legacy value so display never breaks.
const BADGE_CLASS: Record<SessionType, string> = {
  strength: "bg-primary/15 text-primary",
  speed: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  agility: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  mobility: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  conditioning: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

export function sessionTypeClass(type: string | null | undefined): string {
  return (type && BADGE_CLASS[type as SessionType]) || "bg-secondary text-muted-foreground";
}
