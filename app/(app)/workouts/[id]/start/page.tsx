import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTimezone } from "@/lib/supabase/get-timezone";
import { WorkoutPlayer } from "@/components/workouts/workout-player";
import { currentProgramWeek, resolveConditioningWeek, type ConditioningWeek } from "@/lib/workout-format";
import { getCoachContext, canAccessClient } from "@/lib/coach-context";

type Exercise = { id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[] };
type WorkoutExercise = {
  id: string; block_type: string; sets: number; reps: string; weight_kg: number | null;
  rest_seconds: number; work_seconds: number | null; intensity: string | null;
  superset_group: string | null; notes: string | null;
  order_index: number; is_warmup: boolean; exercises: Exercise;
  conditioning_weeks?: ConditioningWeek[];
};
type WorkoutRow = { id: string; name: string; program_id: string; workout_exercises: WorkoutExercise[] };

type SetLog = { workout_exercise_id: string; set_number: number; weight_kg: number | null; reps_completed: number | null };
type ExerciseLog = { workout_exercise_id: string; notes: string | null; rpe: number | null };
type PreviousSession = { id: string; started_at: string; set_logs: SetLog[]; exercise_session_logs: ExerciseLog[] };

export default async function StartWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ forClient?: string }>;
}) {
  const { id } = await params;
  const { forClient: forClientId } = await searchParams;

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // If logging on behalf of a client, validate coach owns that client
  let forClient: { id: string; name: string } | undefined;
  let historyClientId = user.id;

  if (forClientId) {
    const ctx = await getCoachContext(admin, user.id);
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("id, full_name, email, coach_id")
      .eq("id", forClientId)
      .single();
    const cp = clientProfile as { id: string; full_name: string | null; email: string; coach_id: string } | null;
    if (!ctx || !cp || cp.coach_id !== ctx.headCoachId || !canAccessClient(ctx, forClientId)) redirect("/clients");
    forClient = { id: cp.id, name: cp.full_name ?? cp.email };
    historyClientId = cp.id;
  }

  const { data: workoutData } = await admin
    .from("program_workouts")
    .select(`
      id, name, program_id,
      workout_exercises (
        id, block_type, sets, reps, weight_kg, rest_seconds, work_seconds, intensity, superset_group, notes, order_index, is_warmup,
        exercises (id, name, description, youtube_url, muscle_groups),
        conditioning_weeks (week_number, sets, reps, work_seconds, rest_seconds, intensity)
      )
    `)
    .eq("id", id)
    .single();

  if (!workoutData) notFound();

  const workout = workoutData as unknown as WorkoutRow;
  const sorted = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);

  // Resolve conditioning prescriptions to the athlete's current program week.
  const { data: assignData } = await admin
    .from("client_programs")
    .select("start_date, is_active")
    .eq("client_id", historyClientId)
    .eq("program_id", workout.program_id)
    .order("is_active", { ascending: false })
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const week = currentProgramWeek((assignData as { start_date: string } | null)?.start_date ?? null);

  const resolved = sorted.map((we) => {
    if (we.block_type === "conditioning" && we.conditioning_weeks && we.conditioning_weeks.length > 0) {
      const r = resolveConditioningWeek(we.conditioning_weeks, we, week);
      return { ...we, sets: r.sets, reps: r.reps, work_seconds: r.work_seconds, rest_seconds: r.rest_seconds, intensity: r.intensity };
    }
    return we;
  });

  const { data: prevLogsData } = await admin
    .from("workout_logs")
    .select(`
      id, started_at,
      set_logs (workout_exercise_id, set_number, weight_kg, reps_completed),
      exercise_session_logs (workout_exercise_id, notes, rpe)
    `)
    .eq("client_id", historyClientId)
    .eq("workout_id", id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5);

  const previousSessions = (prevLogsData ?? []) as unknown as PreviousSession[];
  const timezone = await getUserTimezone();

  return (
    <WorkoutPlayer
      workout={{ ...workout, workout_exercises: resolved }}
      previousSessions={previousSessions}
      timezone={timezone}
      forClient={forClient}
    />
  );
}
