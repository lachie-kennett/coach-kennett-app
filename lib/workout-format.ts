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
