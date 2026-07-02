import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTimezone } from "@/lib/supabase/get-timezone";
import { WorkoutPlayer } from "@/components/workouts/workout-player";

type SessionEx = {
  id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  exercises: {
    id: string; name: string; description: string | null;
    youtube_url: string | null; muscle_groups: string[];
  };
};

export default async function CustomSessionPlayerPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: logData } = await admin
    .from("workout_logs")
    .select("id, client_id, completed_at")
    .eq("id", logId)
    .single();

  if (!logData) notFound();
  const log = logData as { id: string; client_id: string; completed_at: string | null };
  if (log.client_id !== user.id) notFound();
  if (log.completed_at) redirect("/history");

  const { data: sessionExData } = await admin
    .from("session_exercises")
    .select("id, exercise_id, order_index, sets, exercises(id, name, description, youtube_url, muscle_groups)")
    .eq("workout_log_id", logId)
    .order("order_index");

  const sessionExercises = (sessionExData ?? []) as unknown as SessionEx[];
  const timezone = await getUserTimezone();

  const initialAdHocExercises = sessionExercises.map((se) => ({
    sessionExId: se.id,
    exercise: se.exercises,
    sets: se.sets,
  }));

  return (
    <WorkoutPlayer
      workout={{ id: "", name: "Custom session", workout_exercises: [] }}
      previousSessions={[]}
      timezone={timezone}
      freeSessionLogId={logId}
      initialAdHocExercises={initialAdHocExercises}
    />
  );
}
