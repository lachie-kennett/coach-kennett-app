import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { buttonVariants } from "@/components/ui/button";
import { UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
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
  notes: string | null;
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
  // The dashboard is head-coach only; assistants work from their clients list.
  if (profile?.role !== "coach") redirect(profile?.role === "assistant" ? "/clients" : "/home");

  const [
    { count: clientCount },
    { count: exerciseCount },
    { data: allClientsData },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("coach_id", user.id).eq("role", "client").eq("archived", false),
    admin.from("exercises").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    // Only clients — assistants share coach_id but must never appear as clients.
    // Archived clients are excluded so they never surface as "needing attention".
    admin.from("profiles").select("id, full_name, email").eq("coach_id", user.id).eq("role", "client").eq("archived", false).order("full_name"),
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
          .select("id, client_id, completed_at, rpe, notes, program_workouts(name)")
          .in("client_id", clientIds)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const activePrograms = (activeProgramsResult.data ?? []) as unknown as ActiveProgramRow[];
  const feedRaw = (feedResult.data ?? []) as unknown as FeedRow[];

  // Total completed sessions across all clients — this month and all time.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [{ count: sessionsAllTime }, { count: sessionsThisMonth }] = clientIds.length > 0
    ? await Promise.all([
        admin.from("workout_logs").select("*", { count: "exact", head: true }).in("client_id", clientIds).not("completed_at", "is", null),
        admin.from("workout_logs").select("*", { count: "exact", head: true }).in("client_id", clientIds).not("completed_at", "is", null).gte("completed_at", monthStart.toISOString()),
      ])
    : [{ count: 0 }, { count: 0 }];

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
    notes: f.notes,
    sessionName: f.program_workouts?.name ?? null,
  }));

  const clientNameMap = Object.fromEntries(
    allClients.map(c => [c.id, c.full_name ?? c.email])
  );

  // Two dedicated buckets: clients with no active program at all (or one that's
  // already ended → need a new one), and clients whose program ends within 7 days.
  const needsProgram = attention.filter(c => c.reason === "no_program" || c.reason === "expired");
  const endingSoon = attention.filter(c => c.reason === "expiring");

  return (
    <div className="mx-auto max-w-2xl p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientCount ?? 0} client{clientCount !== 1 ? "s" : ""} · {exerciseCount ?? 0} exercises
          </p>
        </div>
        <Link href="/team" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 shrink-0")}>
          <UserCog className="h-4 w-4" /> Team
        </Link>
      </div>

      {/* Total sessions logged across all clients */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card py-3 text-center">
          <p className="text-2xl font-bold tabular-nums">{sessionsThisMonth ?? 0}</p>
          <p className="text-xs text-muted-foreground">sessions this month</p>
        </div>
        <div className="rounded-xl border border-border bg-card py-3 text-center">
          <p className="text-2xl font-bold tabular-nums">{sessionsAllTime ?? 0}</p>
          <p className="text-xs text-muted-foreground">sessions all time</p>
        </div>
      </div>

      <DashboardGrid
        clientCount={clientCount ?? 0}
        exerciseCount={exerciseCount ?? 0}
        feed={feed}
        needsProgram={needsProgram}
        endingSoon={endingSoon}
        recentClients={allClients.slice(0, 10)}
        clientNameMap={clientNameMap}
      />
    </div>
  );
}
