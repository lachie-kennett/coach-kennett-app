import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Trophy } from "lucide-react";
import { LeaderboardView, type Board, type LeaderEntry } from "@/components/leaderboard/leaderboard-view";

type ClientRow = { id: string; full_name: string | null; email: string; avatar_url: string | null };

export default async function LeaderboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  const user = sessionUser;

  const admin = createAdminClient();

  const { data: profileData } = await admin
    .from("profiles")
    .select("role, coach_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string; coach_id: string | null } | null;
  if (!profile) redirect("/login");

  const coachId = profile.role === "coach" ? user.id : profile.coach_id;
  if (!coachId) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No coach assigned yet.</div>;
  }

  const { data: clientsData } = await admin
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("coach_id", coachId)
    .eq("archived", false)
    .order("full_name");

  const clients = (clientsData ?? []) as ClientRow[];
  const clientIds = clients.map((c) => c.id);

  if (clientIds.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">No clients yet.</div>;
  }

  const [{ data: logsData }, { data: prData }] = await Promise.all([
    admin
      .from("workout_logs")
      .select("client_id, completed_at")
      .in("client_id", clientIds)
      .not("completed_at", "is", null),
    admin
      .from("personal_records")
      .select("client_id")
      .in("client_id", clientIds),
  ]);

  const now = Date.now();
  const d7 = now - 7 * 86400000;
  const d28 = now - 28 * 86400000;

  const c7 = new Map<string, number>();
  const c28 = new Map<string, number>();
  const cAll = new Map<string, number>();
  for (const log of (logsData ?? []) as { client_id: string; completed_at: string }[]) {
    const t = new Date(log.completed_at).getTime();
    cAll.set(log.client_id, (cAll.get(log.client_id) ?? 0) + 1);
    if (t >= d28) c28.set(log.client_id, (c28.get(log.client_id) ?? 0) + 1);
    if (t >= d7) c7.set(log.client_id, (c7.get(log.client_id) ?? 0) + 1);
  }

  const prCount = new Map<string, number>();
  for (const pr of (prData ?? []) as { client_id: string }[]) {
    prCount.set(pr.client_id, (prCount.get(pr.client_id) ?? 0) + 1);
  }

  const build = (counts: Map<string, number>): LeaderEntry[] =>
    clients
      .map((c) => ({
        clientId: c.id,
        name: c.full_name ?? c.email,
        avatarUrl: c.avatar_url,
        score: counts.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const boards: Board[] = [
    { key: "sessions7", title: "Sessions · last 7 days", unit: "", entries: build(c7) },
    { key: "sessions28", title: "Sessions · last 28 days", unit: "", entries: build(c28) },
    { key: "sessionsAll", title: "Sessions · all time", unit: "", entries: build(cAll) },
    { key: "prs", title: "Total PRs", unit: "PRs", entries: build(prCount) },
  ];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="pt-2 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>
      <LeaderboardView boards={boards} viewerId={user.id} />
    </div>
  );
}
