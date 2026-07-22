// Formats a duration in seconds as m:ss (or "45s" under a minute). Empty when null.
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

type ConditioningLike = {
  sets: number;
  reps: string;
  work_seconds: number | null;
  rest_seconds: number;
  intensity: string | null;
};

// Estimated total time (seconds) of the conditioning blocks in a set of
// exercises: sets × (work + rest) per block. Distance/rep-based blocks with no
// work time contribute only their rest.
export function conditioningTotalSeconds(
  blocks: { block_type: string; sets: number; work_seconds: number | null; rest_seconds: number }[]
): number {
  return blocks
    .filter((b) => b.block_type === "conditioning")
    .reduce((sum, b) => sum + b.sets * ((b.work_seconds ?? 0) + b.rest_seconds), 0);
}

// Formats a session total, e.g. "24 min" or "45s".
export function formatSessionTime(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)} min`;
}

export type ConditioningWeek = {
  week_number: number;
  sets: number;
  reps: string;
  work_seconds: number | null;
  rest_seconds: number;
  intensity: string | null;
};

// The program week a client is currently in (1-based), from the assignment's
// start date. Before the start date (or with none) it's week 1.
export function currentProgramWeek(startDate: string | null | undefined): number {
  if (!startDate) return 1;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

// Picks the conditioning prescription for the given week: the defined week with
// the largest week_number ≤ currentWeek (so it holds the final week afterwards).
// Falls back to the base prescription when no weeks are defined.
export function resolveConditioningWeek(
  weeks: ConditioningWeek[] | null | undefined,
  base: ConditioningLike,
  currentWeek: number
): ConditioningLike {
  if (!weeks || weeks.length === 0) return base;
  const sorted = [...weeks].sort((a, b) => a.week_number - b.week_number);
  let chosen = sorted[0];
  for (const w of sorted) {
    if (w.week_number <= currentWeek) chosen = w;
  }
  return {
    sets: chosen.sets,
    reps: chosen.reps,
    work_seconds: chosen.work_seconds,
    rest_seconds: chosen.rest_seconds,
    intensity: chosen.intensity,
  };
}

// Builds the one-line prescription for a conditioning block, e.g.
// "3 × 400m · 3:00 work · 1:00 rest · Zone 2".
export function conditioningSummary(w: ConditioningLike): string {
  const parts: string[] = [];
  parts.push(`${w.sets}${w.reps ? ` × ${w.reps}` : " rounds"}`);
  const work = formatDuration(w.work_seconds);
  if (work) parts.push(`${work} work`);
  const rest = formatDuration(w.rest_seconds);
  if (rest) parts.push(`${rest} rest`);
  if (w.intensity) parts.push(w.intensity);
  return parts.join(" · ");
}
