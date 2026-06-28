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
