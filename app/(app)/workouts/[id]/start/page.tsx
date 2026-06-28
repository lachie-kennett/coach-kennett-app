import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTimezone } from "@/lib/supabase/get-timezone";
import { WorkoutPlayer } from "@/components/workouts/workout-player";

type Exercise = { id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[] };
type WorkoutExercise = {
  id: string; sets: number; reps: string; weight_kg: number | null;
  rest_seconds: number; superset_group: string | null; notes: string | null;
  order_index: number; exercises: Exercise;
};
type WorkoutRow = { id: string; name: string; workout_exercises: WorkoutExercise[] };

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
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("id, full_name, email, coach_id")
      .eq("id", forClientId)
      .single();
    const cp = clientProfile as { id: string; full_name: string | null; email: string; coach_id: string } | null;
    if (!cp || cp.coach_id !== user.id) redirect("/dashboard");
    forClient = { id: cp.id, name: cp.full_name ?? cp.email };
    historyClientId = cp.id;
  }

  const { data: workoutData } = await admin
    .from("program_workouts")
    .select(`
      id, name,
      workout_exercises (
        id, sets, reps, weight_kg, rest_seconds, superset_group, notes, order_index,
        exercises (id, name, description, youtube_url, muscle_groups)
      )
    `)
    .eq("id", id)
    .single();

  if (!workoutData) notFound();

  const workout = workoutData as unknown as WorkoutRow;
  const sorted = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);

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
      workout={{ ...workout, workout_exercises: sorted }}
      previousSessions={previousSessions}
      timezone={timezone}
      forClient={forClient}
    />
  );
}
