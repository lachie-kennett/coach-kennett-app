import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamManager } from "@/components/team/team-manager";

export default async function TeamPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as { role: string } | null)?.role;
  // Only head coaches manage the team.
  if (role !== "coach") redirect(role === "assistant" ? "/clients" : "/home");

  const [{ data: assistantsData }, { data: clientsData }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("coach_id", user.id)
      .eq("role", "assistant")
      .order("full_name"),
    admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("coach_id", user.id)
      .eq("role", "client")
      .eq("archived", false)
      .order("full_name"),
  ]);

  const assistantRows = (assistantsData ?? []) as { id: string; full_name: string | null; email: string }[];
  const assistantIds = assistantRows.map((a) => a.id);

  const assignMap = new Map<string, string[]>();
  if (assistantIds.length > 0) {
    const { data: acData } = await admin
      .from("assistant_clients")
      .select("assistant_id, client_id")
      .in("assistant_id", assistantIds);
    for (const row of (acData ?? []) as { assistant_id: string; client_id: string }[]) {
      const list = assignMap.get(row.assistant_id) ?? [];
      list.push(row.client_id);
      assignMap.set(row.assistant_id, list);
    }
  }

  const assistants = assistantRows.map((a) => ({
    id: a.id,
    name: a.full_name ?? a.email,
    email: a.email,
    clientIds: assignMap.get(a.id) ?? [],
  }));
  const clients = ((clientsData ?? []) as { id: string; full_name: string | null; email: string }[])
    .map((c) => ({ id: c.id, name: c.full_name ?? c.email }));

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <TeamManager assistants={assistants} clients={clients} />
    </div>
  );
}
