import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workoutData } = await supabase
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

  const { data: prevLogData } = await supabase
    .from("workout_logs")
    .select("id, set_logs(workout_exercise_id, set_number, weight_kg, reps_completed)")
    .eq("client_id", user.id)
    .eq("workout_id", id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  const prevLog = prevLogData as unknown as { set_logs: PrevSet[] } | null;

  return (
    <WorkoutPlayer
      workout={{ ...workout, workout_exercises: sorted }}
      userId={user.id}
      previousSets={prevLog?.set_logs ?? []}
    />
  );
}
