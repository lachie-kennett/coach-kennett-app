"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MuscleGroup = string;

export async function createExercise(data: {
  name: string;
  description: string | null;
  youtube_url: string | null;
  muscle_groups: MuscleGroup[];
}): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach") return { error: "Not authorized" };

  const { error } = await admin.from("exercises").insert({
    coach_id: user.id,
    name: data.name,
    description: data.description,
    youtube_url: data.youtube_url,
    muscle_groups: data.muscle_groups,
  });

  if (error) return { error: error.message };
  revalidatePath("/exercises");
  return {};
}

export async function updateExercise(
  id: string,
  data: {
    name: string;
    description: string | null;
    youtube_url: string | null;
    muscle_groups: MuscleGroup[];
  }
): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("exercises")
    .select("coach_id")
    .eq("id", id)
    .single();

  if (existing?.coach_id !== user.id) return { error: "Not authorized" };

  const { error } = await admin.from("exercises").update({
    name: data.name,
    description: data.description,
    youtube_url: data.youtube_url,
    muscle_groups: data.muscle_groups,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/exercises");
  return {};
}

export async function deleteExercise(id: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("exercises")
    .select("coach_id")
    .eq("id", id)
    .single();

  if (existing?.coach_id !== user.id) return { error: "Not authorized" };

  const { error } = await admin.from("exercises").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/exercises");
  return {};
}
