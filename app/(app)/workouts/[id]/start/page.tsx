import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkoutPlayer } from "@/components/workouts/workout-player";

type Exercise = { id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[] };
type WorkoutExercise = {
  id: string; sets: number; reps: string; weight_kg: number | null;
  rest_seconds: number; superset_group: string | null; notes: string | null;
  order_index: number; exercises: Exercise;
};
type WorkoutRow = { id: string; name: string; workout_exercises: WorkoutExercise[] };
type PrevSet = { workout_exercise_id: string; set_number: number; weight_kg: number | null; reps_completed: number | null };

export default async function StartWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // getSession() decodes JWT locally — no network call, no Headers.append risk
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;

  const admin = createAdminClient();

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

  const { data: prevLogData } = await admin
    .from("workout_logs")
    .select("id, set_logs(workout_exercise_id, set_number, weight_kg, reps_completed)")
    .eq("client_id", userId)
    .eq("workout_id", id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const prevLog = prevLogData as unknown as { set_logs: PrevSet[] } | null;

  return (
    <WorkoutPlayer
      workout={{ ...workout, workout_exercises: sorted }}
      previousSets={prevLog?.set_logs ?? []}
    />
  );
}
