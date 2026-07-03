"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProgram(params: {
  name: string;
  description: string | null;
  clientId?: string;
}): Promise<{ id: string }> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("programs")
    .insert({
      coach_id: user.id,
      name: params.name,
      description: params.description,
      client_id: params.clientId ?? null,
    } as never)
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create program");
  const { id } = data as { id: string };

  if (params.clientId) {
    await admin.from("client_programs").insert({
      client_id: params.clientId,
      program_id: id,
      start_date: new Date().toISOString().split("T")[0],
      end_date: null,
      assigned_by: user.id,
      is_active: true,
    } as never);
    revalidatePath(`/clients/${params.clientId}`);
  }

  return { id };
}

export async function assignProgram(params: {
  clientId: string;
  programId: string;
  startDate: string;
  endDate: string | null;
}): Promise<void> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { error } = await admin.from("client_programs").insert({
    client_id: params.clientId,
    program_id: params.programId,
    start_date: params.startDate,
    end_date: params.endDate,
    assigned_by: user.id,
    is_active: true,
  } as never);

  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${params.clientId}`);
}

// ── Program builder mutations ──────────────────────────────────────────────
// These verify the current coach owns the target program, then use the admin
// client to bypass RLS (same pattern as exercises). Returns { error } strings
// so the client can toast them.

type ActionResult = { error?: string };

// Confirms the signed-in coach owns the program that a given workout belongs to.
// Returns the program_id on success, or null if not owned / not found.
async function ownedProgramForWorkout(
  admin: ReturnType<typeof createAdminClient>,
  workoutId: string,
  userId: string
): Promise<string | null> {
  const { data } = await admin
    .from("program_workouts")
    .select("program_id, programs(coach_id)")
    .eq("id", workoutId)
    .single();
  const row = data as { program_id: string; programs: { coach_id: string } | null } | null;
  if (!row || row.programs?.coach_id !== userId) return null;
  return row.program_id;
}

async function ownsProgram(
  admin: ReturnType<typeof createAdminClient>,
  programId: string,
  userId: string
): Promise<boolean> {
  const { data } = await admin
    .from("programs")
    .select("coach_id")
    .eq("id", programId)
    .single();
  return (data as { coach_id: string } | null)?.coach_id === userId;
}

export async function addWorkout(params: {
  programId: string;
  name: string;
  dayOrder: number;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  if (!(await ownsProgram(admin, params.programId, user.id))) return { error: "Not authorized" };

  const { error } = await admin.from("program_workouts").insert({
    program_id: params.programId,
    name: params.name,
    day_order: params.dayOrder,
  } as never);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${params.programId}`);
  return {};
}

export async function deleteWorkout(workoutId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  const { error } = await admin.from("program_workouts").delete().eq("id", workoutId);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  return {};
}

export async function duplicateWorkout(workoutId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  const { data: original } = await admin
    .from("program_workouts")
    .select("name, day_order")
    .eq("id", workoutId)
    .single();
  const src = original as { name: string; day_order: number } | null;
  if (!src) return { error: "Workout not found" };

  const { data: created, error: createErr } = await admin
    .from("program_workouts")
    .insert({
      program_id: programId,
      name: `${src.name} (copy)`,
      day_order: src.day_order + 1,
    } as never)
    .select("id")
    .single();
  if (createErr || !created) return { error: createErr?.message ?? "Failed to duplicate" };
  const newId = (created as { id: string }).id;

  const { data: exRows } = await admin
    .from("workout_exercises")
    .select("exercise_id, sets, reps, weight_kg, rest_seconds, order_index, superset_group, notes")
    .eq("workout_id", workoutId);
  const exercises = (exRows ?? []) as Array<Record<string, unknown>>;

  if (exercises.length > 0) {
    const { error: copyErr } = await admin.from("workout_exercises").insert(
      exercises.map((we) => ({ ...we, workout_id: newId })) as never
    );
    if (copyErr) return { error: copyErr.message };
  }

  revalidatePath(`/programs/${programId}`);
  return {};
}

export async function addWorkoutExercise(params: {
  workoutId: string;
  exerciseId: string;
  sets: number;
  reps: string;
  weightKg: number | null;
  restSeconds: number;
  orderIndex: number;
  notes: string | null;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, params.workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  const { error } = await admin.from("workout_exercises").insert({
    workout_id: params.workoutId,
    exercise_id: params.exerciseId,
    sets: params.sets,
    reps: params.reps,
    weight_kg: params.weightKg,
    rest_seconds: params.restSeconds,
    order_index: params.orderIndex,
    superset_group: null,
    notes: params.notes,
  } as never);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  return {};
}

// For a workout_exercise id, confirm ownership and return { programId, workoutId }.
async function ownedWorkoutExercise(
  admin: ReturnType<typeof createAdminClient>,
  workoutExerciseId: string,
  userId: string
): Promise<string | null> {
  const { data } = await admin
    .from("workout_exercises")
    .select("workout_id")
    .eq("id", workoutExerciseId)
    .single();
  const workoutId = (data as { workout_id: string } | null)?.workout_id;
  if (!workoutId) return null;
  return ownedProgramForWorkout(admin, workoutId, userId);
}

export async function deleteWorkoutExercise(workoutExerciseId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedWorkoutExercise(admin, workoutExerciseId, user.id);
  if (!programId) return { error: "Not authorized" };

  const { error } = await admin.from("workout_exercises").delete().eq("id", workoutExerciseId);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
  return {};
}

export async function setSupersetGroup(params: {
  workoutExerciseIds: string[];
  group: string | null;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();

  // Verify ownership of every targeted row before mutating any.
  let programId: string | null = null;
  for (const id of params.workoutExerciseIds) {
    const owned = await ownedWorkoutExercise(admin, id, user.id);
    if (!owned) return { error: "Not authorized" };
    programId = owned;
  }

  const { error } = await admin
    .from("workout_exercises")
    .update({ superset_group: params.group } as never)
    .in("id", params.workoutExerciseIds);
  if (error) return { error: error.message };
  if (programId) revalidatePath(`/programs/${programId}`);
  return {};
}
