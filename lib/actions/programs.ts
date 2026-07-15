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

// Updates the start/end dates (i.e. the length) of a client's program assignment.
export async function updateAssignmentDates(params: {
  clientId: string;
  programId: string;
  startDate: string;
  endDate: string | null;
}): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  if (!(await ownsProgram(admin, params.programId, user.id))) return { error: "Not authorized" };
  if (params.endDate && params.endDate < params.startDate) {
    return { error: "End date must be after the start date" };
  }

  const { error } = await admin
    .from("client_programs")
    .update({ start_date: params.startDate, end_date: params.endDate } as never)
    .eq("client_id", params.clientId)
    .eq("program_id", params.programId);
  if (error) return { error: error.message };
  revalidatePath(`/clients/${params.clientId}/programs/${params.programId}`);
  revalidatePath(`/clients/${params.clientId}`);
  return {};
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
  sessionType?: string | null;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  if (!(await ownsProgram(admin, params.programId, user.id))) return { error: "Not authorized" };

  const { error } = await admin.from("program_workouts").insert({
    program_id: params.programId,
    name: params.name,
    day_order: params.dayOrder,
    session_type: params.sessionType ?? null,
  } as never);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${params.programId}`);
  return {};
}

export async function updateWorkout(params: {
  workoutId: string;
  name?: string;
  sessionType?: string | null;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, params.workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  const patch: Record<string, unknown> = {};
  if (params.name !== undefined) patch.name = params.name;
  if (params.sessionType !== undefined) patch.session_type = params.sessionType;
  if (Object.keys(patch).length === 0) return {};

  const { error } = await admin
    .from("program_workouts")
    .update(patch as never)
    .eq("id", params.workoutId);
  if (error) return { error: error.message };
  revalidatePath(`/programs/${programId}`);
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
    .select("name, day_order, session_type")
    .eq("id", workoutId)
    .single();
  const src = original as { name: string; day_order: number; session_type: string | null } | null;
  if (!src) return { error: "Workout not found" };

  const { data: created, error: createErr } = await admin
    .from("program_workouts")
    .insert({
      program_id: programId,
      name: `${src.name} (copy)`,
      day_order: src.day_order + 1,
      session_type: src.session_type,
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
  blockType?: "strength" | "conditioning";
  sets: number;
  reps: string;
  weightKg: number | null;
  restSeconds: number;
  workSeconds?: number | null;
  intensity?: string | null;
  notes: string | null;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, params.workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  // Compute the next order index from the DB so rapid successive adds (from the
  // persistent side panel) can't collide on the same position.
  const { data: last } = await admin
    .from("workout_exercises")
    .select("order_index")
    .eq("workout_id", params.workoutId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const orderIndex = ((last as { order_index: number } | null)?.order_index ?? -1) + 1;

  const { error } = await admin.from("workout_exercises").insert({
    workout_id: params.workoutId,
    exercise_id: params.exerciseId,
    block_type: params.blockType ?? "strength",
    sets: params.sets,
    reps: params.reps,
    weight_kg: params.weightKg,
    rest_seconds: params.restSeconds,
    work_seconds: params.workSeconds ?? null,
    intensity: params.intensity ?? null,
    order_index: orderIndex,
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

type WeGroupRow = { id: string; order_index: number; superset_group: string | null };

// Re-letters every superset in a workout A, B, C… by the top-to-bottom
// position of its first exercise, using the given grouping intent. `tokenOf`
// maps each exercise to an arbitrary group token (or null for no group);
// exercises sharing a token form one superset. Groups with fewer than two
// members are dropped. Only rows whose letter actually changes are written.
async function reletterSupersets(
  admin: ReturnType<typeof createAdminClient>,
  exercises: WeGroupRow[],
  tokenOf: (we: WeGroupRow) => string | null
): Promise<string | null> {
  const membersByToken = new Map<string, string[]>();
  for (const we of exercises) {
    const token = tokenOf(we);
    if (!token) continue;
    if (!membersByToken.has(token)) membersByToken.set(token, []);
    membersByToken.get(token)!.push(we.id);
  }

  const orderOf = new Map(exercises.map((we) => [we.id, we.order_index]));
  const groups = [...membersByToken.values()]
    .filter((ids) => ids.length >= 2)
    .map((ids) => ({ ids, top: Math.min(...ids.map((id) => orderOf.get(id) ?? 0)) }))
    .sort((a, b) => a.top - b.top);

  const finalGroup = new Map<string, string | null>();
  for (const we of exercises) finalGroup.set(we.id, null);
  groups.forEach((g, i) => {
    const letter = String.fromCharCode(65 + i); // A, B, C…
    for (const id of g.ids) finalGroup.set(id, letter);
  });

  for (const we of exercises) {
    const next = finalGroup.get(we.id) ?? null;
    if (next !== (we.superset_group ?? null)) {
      const { error } = await admin
        .from("workout_exercises")
        .update({ superset_group: next } as never)
        .eq("id", we.id);
      if (error) return error.message;
    }
  }
  return null;
}

// Groups the selected exercises into one superset, then re-letters the whole
// workout top-to-bottom. Letters are derived from the live DB state, so rapid
// successive calls never collide on the same letter.
export async function createSuperset(params: {
  workoutId: string;
  workoutExerciseIds: string[];
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, params.workoutId, user.id);
  if (!programId) return { error: "Not authorized" };
  if (params.workoutExerciseIds.length < 2) return { error: "Select at least two exercises" };

  const { data: rows } = await admin
    .from("workout_exercises")
    .select("id, order_index, superset_group")
    .eq("workout_id", params.workoutId);
  const exercises = (rows ?? []) as WeGroupRow[];

  const selected = new Set(params.workoutExerciseIds);
  const err = await reletterSupersets(admin, exercises, (we) =>
    selected.has(we.id) ? "__new__" : we.superset_group?.toUpperCase() ?? null
  );
  if (err) return { error: err };
  revalidatePath(`/programs/${programId}`);
  return {};
}

// Dissolves an entire superset (all exercises sharing the given letter become
// ungrouped), then re-letters any remaining supersets so labels stay ordered.
export async function dissolveSuperset(params: {
  workoutId: string;
  group: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, params.workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  const { data: rows } = await admin
    .from("workout_exercises")
    .select("id, order_index, superset_group")
    .eq("workout_id", params.workoutId);
  const exercises = (rows ?? []) as WeGroupRow[];

  const target = params.group.toUpperCase();
  const err = await reletterSupersets(admin, exercises, (we) => {
    const g = we.superset_group?.toUpperCase() ?? null;
    return g === target ? null : g;
  });
  if (err) return { error: err };
  revalidatePath(`/programs/${programId}`);
  return {};
}

// Persists a new exercise order for a workout (order_index = array position),
// then re-letters supersets so their labels stay ordered top-to-bottom.
export async function reorderWorkoutExercises(params: {
  workoutId: string;
  orderedIds: string[];
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const programId = await ownedProgramForWorkout(admin, params.workoutId, user.id);
  if (!programId) return { error: "Not authorized" };

  for (let i = 0; i < params.orderedIds.length; i++) {
    const { error } = await admin
      .from("workout_exercises")
      .update({ order_index: i } as never)
      .eq("id", params.orderedIds[i])
      .eq("workout_id", params.workoutId); // guard: only rows in this workout
    if (error) return { error: error.message };
  }

  const { data: rows } = await admin
    .from("workout_exercises")
    .select("id, order_index, superset_group")
    .eq("workout_id", params.workoutId);
  const exercises = (rows ?? []) as WeGroupRow[];
  const err = await reletterSupersets(admin, exercises, (we) => we.superset_group?.toUpperCase() ?? null);
  if (err) return { error: err };

  revalidatePath(`/programs/${programId}`);
  return {};
}
