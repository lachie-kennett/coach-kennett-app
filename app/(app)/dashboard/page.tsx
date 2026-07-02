import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import type { Profile } from "@/lib/types";

type ClientRow = Pick<Profile, "id" | "full_name" | "email">;
type ActiveProgramRow = {
  client_id: string;
  start_date: string;
  end_date: string | null;
  programs: { name: string } | null;
};
type FeedRow = {
  id: string; client_id: string; completed_at: string; rpe: number | null;
  program_workouts: { name: string } | null;
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profileData } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role !== "coach") redirect("/home");

  const [
    { count: clientCount },
    { count: exerciseCount },
    { data: allClientsData },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    admin.from("exercises").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    admin.from("profiles").select("id, full_name, email").eq("coach_id", user.id).order("full_name"),
  ]);

  const allClients = (allClientsData ?? []) as ClientRow[];
  const clientIds = allClients.map(c => c.id);

  const [activeProgramsResult, feedResult] = await Promise.all([
    clientIds.length > 0
      ? admin
          .from("client_programs")
          .select("client_id, start_date, end_date, programs(name)")
          .in("client_id", clientIds)
          .eq("is_active", true)
          .order("start_date", { ascending: false })
      : Promise.resolve({ data: [] }),
    clientIds.length > 0
      ? admin
          .from("workout_logs")
          .select("id, client_id, completed_at, rpe, program_workouts(name)")
          .in("client_id", clientIds)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const activePrograms = (activeProgramsResult.data ?? []) as unknown as ActiveProgramRow[];
  const feedRaw = (feedResult.data ?? []) as unknown as FeedRow[];

  const activeProgramMap = new Map<string, ActiveProgramRow>();
  for (const ap of activePrograms) {
    if (!activeProgramMap.has(ap.client_id)) {
      activeProgramMap.set(ap.client_id, ap);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  type AttentionClient = ClientRow & {
    reason: "expired" | "expiring" | "no_program";
    programName?: string;
    daysLeft?: number;
    endDateStr?: string;
  };

  const attention: AttentionClient[] = [];
  for (const client of allClients) {
    const prog = activeProgramMap.get(client.id);
    if (!prog) {
      attention.push({ ...client, reason: "no_program" });
    } else if (prog.end_date) {
      const endDate = new Date(prog.end_date);
      if (endDate < today) {
        attention.push({
          ...client, reason: "expired",
          programName: prog.programs?.name,
          endDateStr: endDate.toLocaleDateString("en-AU"),
        });
      } else if (endDate <= in7Days) {
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
        attention.push({
          ...client, reason: "expiring",
          programName: prog.programs?.name,
          daysLeft,
          endDateStr: endDate.toLocaleDateString("en-AU"),
        });
      }
    }
  }

  const feed = feedRaw.map((f) => ({
    id: f.id,
    client_id: f.client_id,
    completed_at: f.completed_at,
    rpe: f.rpe,
    sessionName: f.program_workouts?.name ?? null,
  }));

  const clientNameMap = Object.fromEntries(
    allClients.map(c => [c.id, c.full_name ?? c.email])
  );

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {clientCount ?? 0} client{clientCount !== 1 ? "s" : ""} · {exerciseCount ?? 0} exercises
        </p>
      </div>
      <DashboardGrid
        clientCount={clientCount ?? 0}
        exerciseCount={exerciseCount ?? 0}
        feed={feed}
        attention={attention}
        recentClients={allClients.slice(0, 10)}
        clientNameMap={clientNameMap}
      />
    </div>
  );
}
