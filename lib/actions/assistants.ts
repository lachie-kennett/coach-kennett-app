"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Turns a full name into the standard password (each word capitalised, no
// spaces) — same rule used for clients.
function nameToPassword(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

async function requireHeadCoach(): Promise<{ id: string } | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", user.id).single();
  // Only a head coach (not an assistant) can manage the team.
  if ((data as { role: string } | null)?.role !== "coach") return { error: "Not authorized" };
  return { id: user.id };
}

// Creates an assistant-coach account under the signed-in head coach. Mirrors
// addClient: auto password from the name, returned so the coach can pass it on.
export async function addAssistant(
  name: string,
  email: string
): Promise<{ error?: string; success?: boolean; password?: string }> {
  const head = await requireHeadCoach();
  if ("error" in head) return { error: head.error };

  const admin = createAdminClient();
  const fullName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const password = nameToPassword(fullName);
  if (password.length < 6) {
    return { error: "Name is too short to make a password from — please use their full name." };
  }

  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "assistant" },
  });
  if (createError) return { error: createError.message };

  if (authData.user) {
    // role may be defaulted to 'client' by the signup trigger — force assistant,
    // and point coach_id at the head coach.
    await admin
      .from("profiles")
      .update({ role: "assistant", coach_id: head.id } as never)
      .eq("id", authData.user.id);
  }

  revalidatePath("/team");
  return { success: true, password };
}

export async function assignClientToAssistant(assistantId: string, clientId: string): Promise<{ error?: string }> {
  const head = await requireHeadCoach();
  if ("error" in head) return { error: head.error };
  const admin = createAdminClient();

  // Both the assistant and the client must belong to this head coach.
  const { data: rows } = await admin
    .from("profiles")
    .select("id, role, coach_id")
    .in("id", [assistantId, clientId]);
  const list = (rows ?? []) as { id: string; role: string; coach_id: string | null }[];
  const assistant = list.find((r) => r.id === assistantId);
  const client = list.find((r) => r.id === clientId);
  if (assistant?.role !== "assistant" || assistant.coach_id !== head.id) return { error: "Not your assistant" };
  if (client?.role !== "client" || client.coach_id !== head.id) return { error: "Not your client" };

  const { error } = await admin
    .from("assistant_clients")
    .upsert({ assistant_id: assistantId, client_id: clientId } as never, { onConflict: "assistant_id,client_id" });
  if (error) return { error: error.message };
  revalidatePath("/team");
  return {};
}

export async function unassignClientFromAssistant(assistantId: string, clientId: string): Promise<{ error?: string }> {
  const head = await requireHeadCoach();
  if ("error" in head) return { error: head.error };
  const admin = createAdminClient();

  // Verify the assistant belongs to this head coach before removing.
  const { data: a } = await admin.from("profiles").select("coach_id").eq("id", assistantId).single();
  if ((a as { coach_id: string | null } | null)?.coach_id !== head.id) return { error: "Not your assistant" };

  const { error } = await admin
    .from("assistant_clients")
    .delete()
    .eq("assistant_id", assistantId)
    .eq("client_id", clientId);
  if (error) return { error: error.message };
  revalidatePath("/team");
  return {};
}
