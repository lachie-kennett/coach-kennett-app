"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";

export async function startWorkoutLog(workoutId: string): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workout_logs")
    .insert({ client_id: user.id, workout_id: workoutId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function logSet(params: {
  workoutLogId: string;
  workoutExerciseId: string;
  exerciseId: string;
  setNumber: number;
  repsCompleted: number | null;
  weightKg: number | null;
}): Promise<{ isPR: boolean }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  let isPR = false;
  if (params.weightKg && params.repsCompleted) {
    const { data: existing } = await admin
      .from("personal_records")
      .select("weight_kg, reps")
      .eq("client_id", user.id)
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
      workout_exercise_id: params.workoutExerciseId,
      set_number: params.setNumber,
      reps_completed: params.repsCompleted,
      weight_kg: params.weightKg,
      is_pr: isPR,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (isPR && setLog && params.weightKg && params.repsCompleted) {
    await admin.from("personal_records").upsert({
      client_id: user.id,
      exercise_id: params.exerciseId,
      weight_kg: params.weightKg,
      reps: params.repsCompleted,
      set_log_id: setLog.id,
    }, { onConflict: "client_id,exercise_id" });
  }

  return { isPR };
}

export async function finishWorkoutLog(workoutLogId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("workout_logs")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", workoutLogId);
}

export async function cancelWorkoutLog(workoutLogId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("workout_logs").delete().eq("id", workoutLogId);
}
