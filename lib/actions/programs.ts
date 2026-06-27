"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
