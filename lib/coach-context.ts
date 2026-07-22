import { createAdminClient } from "@/lib/supabase/admin";

// Resolves who a signed-in staff member is and what they can touch.
//
// - A head coach ("coach") owns their whole ecosystem: headCoachId is their own
//   id and allowedClientIds is null (meaning "all of my clients").
// - An assistant ("assistant") works inside a head coach's ecosystem
//   (headCoachId = the coach who created them) but may only touch the clients
//   explicitly assigned to them (allowedClientIds = that subset).
//
// Clients are owned by the head coach (profiles.coach_id = headCoachId) and the
// exercise library / programs live under the head coach, so assistants act
// within that same data — just limited to their assigned clients.
export type CoachContext = {
  userId: string;
  role: "coach" | "assistant";
  headCoachId: string;
  isAssistant: boolean;
  allowedClientIds: string[] | null; // null = every client of the head coach
};

export async function getCoachContext(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<CoachContext | null> {
  const { data } = await admin.from("profiles").select("role, coach_id").eq("id", userId).single();
  const p = data as { role: string; coach_id: string | null } | null;
  if (!p) return null;

  if (p.role === "coach") {
    return { userId, role: "coach", headCoachId: userId, isAssistant: false, allowedClientIds: null };
  }
  if (p.role === "assistant" && p.coach_id) {
    const { data: ac } = await admin
      .from("assistant_clients")
      .select("client_id")
      .eq("assistant_id", userId);
    const ids = ((ac ?? []) as { client_id: string }[]).map((x) => x.client_id);
    return { userId, role: "assistant", headCoachId: p.coach_id, isAssistant: true, allowedClientIds: ids };
  }
  return null; // clients aren't staff
}

// True if this staff member may act on the given client.
export function canAccessClient(ctx: CoachContext, clientId: string): boolean {
  return ctx.allowedClientIds === null || ctx.allowedClientIds.includes(clientId);
}
