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
