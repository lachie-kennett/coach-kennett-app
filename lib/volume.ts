export type WeeklyVolume = { week: string; label: string; volume: number };

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function weekLabel(isoMonday: string): string {
  return new Date(isoMonday + "T12:00:00Z").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}

export function buildWeeklyVolume(
  logs: { id: string; completed_at: string }[],
  sets: { workout_log_id: string; weight_kg: number | null; reps_completed: number | null }[],
  weeks = 12
): WeeklyVolume[] {
  const logDateMap = new Map(logs.map((l) => [l.id, l.completed_at]));

  const volumeMap = new Map<string, number>();
  for (const set of sets) {
    const completedAt = logDateMap.get(set.workout_log_id);
    if (!completedAt || !set.weight_kg || !set.reps_completed) continue;
    const week = getMonday(new Date(completedAt));
    volumeMap.set(week, (volumeMap.get(week) ?? 0) + set.weight_kg * set.reps_completed);
  }

  // Build the last `weeks` Mondays including current week
  const result: WeeklyVolume[] = [];
  const now = new Date();
  const thisMonday = new Date(now);
  const day = thisMonday.getDay();
  thisMonday.setDate(thisMonday.getDate() + (day === 0 ? -6 : 1 - day));
  thisMonday.setHours(0, 0, 0, 0);

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday.getTime() - i * 7 * 86400000);
    const key = d.toISOString().split("T")[0];
    result.push({ week: key, label: weekLabel(key), volume: Math.round(volumeMap.get(key) ?? 0) });
  }

  return result;
}
