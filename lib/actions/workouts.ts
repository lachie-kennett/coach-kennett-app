"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

export async function startWorkoutLog(workoutId: string, forClientId?: string): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  let clientId = user.id;

  if (forClientId) {
    const { data: clientProfile } = await admin
      .from("profiles")
      .select("id, coach_id")
      .eq("id", forClientId)
      .single();
    if (!clientProfile || (clientProfile as { coach_id: string }).coach_id !== user.id) {
      throw new Error("Not authorized to log for this client");
    }
    clientId = forClientId;
  }

  const { data, error } = await admin
    .from("workout_logs")
    .insert({ client_id: clientId, workout_id: workoutId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function logSet(params: {
  workoutLogId: string;
  workoutExerciseId: string | null;
  sessionExerciseId?: string | null;
  exerciseId: string;
  setNumber: number;
  repsCompleted: number | null;
  weightKg: number | null;
  forClientId?: string;
}): Promise<{ isPR: boolean }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const clientId = params.forClientId ?? user.id;

  let isPR = false;
  if (params.weightKg && params.repsCompleted) {
    const { data: existing } = await admin
      .from("personal_records")
      .select("weight_kg, reps")
      .eq("client_id", clientId)
      .eq("exercise_id", params.exerciseId)
      .single();

    isPR = !existing ||
      params.weightKg > (existing.weight_kg as number) ||
      (params.weightKg === (existing.weight_kg as number) && params.repsCompleted > (existing.reps as number));
  }

  const { data: setLog, error } = await admin
    .from("set_logs")
    .insert({
      workout_log_id: params.workoutLogId,
      workout_exercise_id: params.workoutExerciseId ?? null,
      session_exercise_id: params.sessionExerciseId ?? null,
      set_number: params.setNumber,
      reps_completed: params.repsCompleted,
      weight_kg: params.weightKg,
      is_pr: isPR,
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (isPR && setLog && params.weightKg && params.repsCompleted) {
    await admin.from("personal_records").upsert({
      client_id: clientId,
      exercise_id: params.exerciseId,
      weight_kg: params.weightKg,
      reps: params.repsCompleted,
      set_log_id: setLog.id,
    }, { onConflict: "client_id,exercise_id" });
  }

  return { isPR };
}

export async function saveExerciseLog(params: {
  workoutLogId: string;
  workoutExerciseId: string;
  notes?: string | null;
  rpe?: number | null;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("exercise_session_logs").upsert(
    {
      workout_log_id: params.workoutLogId,
      workout_exercise_id: params.workoutExerciseId,
      notes: params.notes ?? null,
      rpe: params.rpe ?? null,
    } as never,
    { onConflict: "workout_log_id,workout_exercise_id" }
  );
}

export async function finishWorkoutLog(
  workoutLogId: string,
  notes?: string | null,
  rpe?: number | null
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("workout_logs")
    .update({ completed_at: new Date().toISOString(), notes: notes ?? null, rpe: rpe ?? null })
    .eq("id", workoutLogId);
}

export async function cancelWorkoutLog(workoutLogId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("workout_logs").delete().eq("id", workoutLogId);
}

export async function startCustomSession(
  exercises: { exerciseId: string; sets: number }[]
): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  const admin = createAdminClient();

  const { data: log, error } = await admin
    .from("workout_logs")
    .insert({ client_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const logId = (log as { id: string }).id;

  if (exercises.length > 0) {
    await admin.from("session_exercises").insert(
      exercises.map((ex, idx) => ({
        workout_log_id: logId,
        exercise_id: ex.exerciseId,
        order_index: idx,
        sets: ex.sets,
      } as never))
    );
  }

  return logId;
}

export async function addSessionExercise(params: {
  workoutLogId: string;
  exerciseId: string;
}): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  const admin = createAdminClient();

  const { count } = await admin
    .from("session_exercises")
    .select("*", { count: "exact", head: true })
    .eq("workout_log_id", params.workoutLogId);

  const { data, error } = await admin
    .from("session_exercises")
    .insert({
      workout_log_id: params.workoutLogId,
      exercise_id: params.exerciseId,
      order_index: count ?? 0,
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function getCoachExercisesForLog(workoutLogId: string): Promise<{
  id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[];
}[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");
  const admin = createAdminClient();

  const { data: logData } = await admin
    .from("workout_logs")
    .select("client_id")
    .eq("id", workoutLogId)
    .single();

  if (!logData) return [];
  const clientId = (logData as { client_id: string }).client_id;

  const { data: profileData } = await admin
    .from("profiles")
    .select("coach_id")
    .eq("id", clientId)
    .single();

  const coachId = (profileData as { coach_id: string | null } | null)?.coach_id ?? user.id;

  const { data } = await admin
    .from("exercises")
    .select("id, name, description, youtube_url, muscle_groups")
    .eq("coach_id", coachId)
    .order("name");

  return (data ?? []) as { id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[] }[];
}
