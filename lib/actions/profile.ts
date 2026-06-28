"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateTimezone(timezone: string): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ timezone } as never)
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/settings");
  return {};
}
