import type { createAdminClient } from "@/lib/supabase/admin";

export type HistSet = { setNumber: number; weight: number | null; reps: number | null };
export type HistSession = { date: string; sets: HistSet[] };
// Keyed by exercise_id, each list most-recent-first.
export type ExerciseHistory = Record<string, HistSession[]>;

type LogRow = {
  completed_at: string;
  set_logs: {
    set_number: number;
    weight_kg: number | null;
    reps_completed: number | null;
    workout_exercises: { exercise_id: string } | null;
    session_exercises: { exercise_id: string } | null;
  }[] | null;
};

// Builds a client's per-exercise weight history keyed by the underlying
// exercise_id (not the program's workout_exercise), so history carries across
// programs/blocks. Only the given exercise ids are included.
export async function buildExerciseHistory(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  exerciseIds: string[]
): Promise<ExerciseHistory> {
  if (exerciseIds.length === 0) return {};

  const { data } = await admin
    .from("workout_logs")
    .select(`
      completed_at,
      set_logs(set_number, weight_kg, reps_completed,
        workout_exercises(exercise_id),
        session_exercises(exercise_id)
      )
    `)
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(60);

  const wanted = new Set(exerciseIds);
  const map: ExerciseHistory = {};

  for (const log of (data ?? []) as unknown as LogRow[]) {
    const perEx = new Map<string, HistSet[]>();
    for (const s of log.set_logs ?? []) {
      const exId = s.workout_exercises?.exercise_id ?? s.session_exercises?.exercise_id;
      if (!exId || !wanted.has(exId)) continue;
      if (s.weight_kg == null && s.reps_completed == null) continue;
      const arr = perEx.get(exId) ?? [];
      arr.push({ setNumber: s.set_number, weight: s.weight_kg, reps: s.reps_completed });
      perEx.set(exId, arr);
    }
    for (const [exId, sets] of perEx) {
      sets.sort((a, b) => a.setNumber - b.setNumber);
      (map[exId] ??= []).push({ date: log.completed_at, sets });
    }
  }

  // Cap to the last 6 sessions per exercise.
  for (const k of Object.keys(map)) map[k] = map[k].slice(0, 6);
  return map;
}

export type ExerciseWithHistory = { id: string; name: string; sessions: HistSession[] };

type NamedLogRow = {
  completed_at: string;
  set_logs: {
    set_number: number;
    weight_kg: number | null;
    reps_completed: number | null;
    workout_exercises: { exercise_id: string; exercises: { name: string } | null } | null;
    session_exercises: { exercise_id: string; exercises: { name: string } | null } | null;
  }[] | null;
};

// Every exercise a client has logged, each with its recent weight history —
// for a browsable "tap an exercise to see its history" list.
export async function buildAllExerciseHistory(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string
): Promise<ExerciseWithHistory[]> {
  const { data } = await admin
    .from("workout_logs")
    .select(`
      completed_at,
      set_logs(set_number, weight_kg, reps_completed,
        workout_exercises(exercise_id, exercises(name)),
        session_exercises(exercise_id, exercises(name))
      )
    `)
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(120);

  const map = new Map<string, ExerciseWithHistory>();
  for (const log of (data ?? []) as unknown as NamedLogRow[]) {
    const perEx = new Map<string, { name: string; sets: HistSet[] }>();
    for (const s of log.set_logs ?? []) {
      const ex = s.workout_exercises ?? s.session_exercises;
      const exId = ex?.exercise_id;
      const name = ex?.exercises?.name;
      if (!exId || !name) continue;
      if (s.weight_kg == null && s.reps_completed == null) continue;
      const cur = perEx.get(exId) ?? { name, sets: [] };
      cur.sets.push({ setNumber: s.set_number, weight: s.weight_kg, reps: s.reps_completed });
      perEx.set(exId, cur);
    }
    for (const [exId, { name, sets }] of perEx) {
      sets.sort((a, b) => a.setNumber - b.setNumber);
      const e = map.get(exId) ?? { id: exId, name, sessions: [] };
      e.sessions.push({ date: log.completed_at, sets });
      map.set(exId, e);
    }
  }
  // Cap sessions per exercise; only include exercises with any history.
  const list = [...map.values()].map((e) => ({ ...e, sessions: e.sessions.slice(0, 12) }));
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}
