import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";

// Monday of a given date as YYYY-MM-DD string
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function calcStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const weeks = new Set(completedDates.map((d) => getMonday(new Date(d))));
  const thisWeek = getMonday(new Date());
  const lastWeek = getMonday(new Date(Date.now() - 7 * 86400000));
  // Start from current week if it has a workout, else last week (grace for mid-week)
  const startWeek = weeks.has(thisWeek) ? thisWeek : weeks.has(lastWeek) ? lastWeek : null;
  if (!startWeek) return 0;
  let streak = 0;
  let weekMs = new Date(startWeek).getTime();
  while (weeks.has(new Date(weekMs).toISOString().split("T")[0])) {
    streak++;
    weekMs -= 7 * 86400000;
  }
  return streak;
}

type ClientRow = { id: string; full_name: string | null; email: string; avatar_url: string | null };

function Avatar({ client }: { client: ClientRow }) {
  const initial = (client.full_name ?? client.email ?? "?")[0].toUpperCase();
  return (
    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
      {client.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={client.avatar_url} alt={client.full_name ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-primary">{initial}</span>
      )}
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardCard<T extends { clientId: string; score: number | null; label: string }>({
  title,
  icon: Icon,
  entries,
  viewerId,
  emptyText,
}: {
  title: string;
  icon: React.ElementType;
  entries: T[];
  viewerId: string;
  emptyText: string;
  clients: ClientRow[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry, idx) => {
              const isViewer = entry.clientId === viewerId;
              return (
                <li
                  key={entry.clientId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    isViewer && "bg-primary/5"
                  )}
                >
                  <span className="w-6 shrink-0 text-center text-sm">
                    {idx < 3 ? MEDALS[idx] : <span className="text-muted-foreground">{idx + 1}</span>}
                  </span>
                  {/* Avatar injected from parent via clientId */}
                  <span className="flex-1 text-sm font-medium truncate">
                    {entry.clientId}
                    {isViewer && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{entry.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function LeaderboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");
  const user = sessionUser;

  const admin = createAdminClient();

  // Determine coach ID (viewer may be coach or client)
  const { data: profileData } = await admin
    .from("profiles")
    .select("role, coach_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string; coach_id: string | null } | null;
  if (!profile) redirect("/login");

  const coachId = profile.role === "coach" ? user.id : profile.coach_id;
  if (!coachId) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No coach assigned yet.
      </div>
    );
  }

  // Fetch all clients of this coach
  const { data: clientsData } = await admin
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("coach_id", coachId)
    .order("full_name");

  const clients = (clientsData ?? []) as ClientRow[];
  const clientIds = clients.map((c) => c.id);

  if (clientIds.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No clients yet.
      </div>
    );
  }

  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString();
  const fiftyTwoWeeksAgo = new Date(Date.now() - 52 * 7 * 86400000).toISOString();

  // Parallel data fetch
  const [
    { data: activeProgramsData },
    { data: recentLogsData },
    { data: prData },
    { data: streakLogsData },
  ] = await Promise.all([
    // Active programs with workout count per client
    admin
      .from("client_programs")
      .select("client_id, program_id, programs(id, program_workouts(id))")
      .in("client_id", clientIds)
      .eq("is_active", true),
    // Completed workouts last 28 days (completion rate)
    admin
      .from("workout_logs")
      .select("client_id")
      .in("client_id", clientIds)
      .not("completed_at", "is", null)
      .gte("completed_at", fourWeeksAgo),
    // PR counts
    admin
      .from("personal_records")
      .select("client_id")
      .in("client_id", clientIds),
    // All completed workout timestamps last 52 weeks (streak)
    admin
      .from("workout_logs")
      .select("client_id, completed_at")
      .in("client_id", clientIds)
      .not("completed_at", "is", null)
      .gte("completed_at", fiftyTwoWeeksAgo),
  ]);

  type ProgramRow = {
    client_id: string;
    programs: { program_workouts: { id: string }[] } | null;
  };

  // Build maps
  const activeProgramMap = new Map<string, number>(); // clientId → workouts in program
  for (const ap of (activeProgramsData ?? []) as unknown as ProgramRow[]) {
    if (!activeProgramMap.has(ap.client_id)) {
      activeProgramMap.set(ap.client_id, ap.programs?.program_workouts?.length ?? 0);
    }
  }

  const recentLogCount = new Map<string, number>(); // clientId → completed in 4 weeks
  for (const log of (recentLogsData ?? []) as { client_id: string }[]) {
    recentLogCount.set(log.client_id, (recentLogCount.get(log.client_id) ?? 0) + 1);
  }

  const prCount = new Map<string, number>(); // clientId → total PRs
  for (const pr of (prData ?? []) as { client_id: string }[]) {
    prCount.set(pr.client_id, (prCount.get(pr.client_id) ?? 0) + 1);
  }

  const streakDates = new Map<string, string[]>(); // clientId → completed_at[]
  for (const log of (streakLogsData ?? []) as { client_id: string; completed_at: string }[]) {
    const arr = streakDates.get(log.client_id) ?? [];
    arr.push(log.completed_at);
    streakDates.set(log.client_id, arr);
  }

  // Build leaderboard entries
  const completionEntries = clients
    .filter((c) => activeProgramMap.has(c.id) && (activeProgramMap.get(c.id) ?? 0) > 0)
    .map((c) => {
      const workoutsInProgram = activeProgramMap.get(c.id) ?? 0;
      const completed = recentLogCount.get(c.id) ?? 0;
      const rate = Math.min(100, Math.round((completed / (workoutsInProgram * 4)) * 100));
      return { clientId: c.id, score: rate, label: `${rate}%`, client: c };
    })
    .sort((a, b) => b.score - a.score);

  const prEntries = clients
    .map((c) => {
      const count = prCount.get(c.id) ?? 0;
      return { clientId: c.id, score: count, label: `${count} PR${count !== 1 ? "s" : ""}`, client: c };
    })
    .sort((a, b) => b.score - a.score);

  const streakEntries = clients
    .map((c) => {
      const dates = streakDates.get(c.id) ?? [];
      const streak = calcStreak(dates);
      return { clientId: c.id, score: streak, label: streak === 0 ? "—" : `${streak} wk${streak !== 1 ? "s" : ""}`, client: c };
    })
    .sort((a, b) => b.score - a.score);

  const clientMap = new Map(clients.map((c) => [c.id, c]));

  function renderEntries(entries: { clientId: string; label: string }[]) {
    return entries.map((entry, idx) => {
      const c = clientMap.get(entry.clientId)!;
      const isViewer = entry.clientId === user.id;
      return (
        <li
          key={entry.clientId}
          className={cn("flex items-center gap-3 px-4 py-3", isViewer && "bg-primary/5")}
        >
          <span className="w-6 shrink-0 text-center text-sm">
            {idx < 3 ? MEDALS[idx] : <span className="text-muted-foreground font-medium">{idx + 1}</span>}
          </span>
          <Avatar client={c} />
          <span className="flex-1 text-sm font-medium truncate">
            {c.full_name ?? c.email}
            {isViewer && <span className="ml-1.5 text-xs text-primary font-normal">(you)</span>}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-right">{entry.label}</span>
        </li>
      );
    });
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="pt-2 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Leaderboard</h1>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Completion Rate
            <span className="ml-auto text-xs font-normal text-muted-foreground">Last 4 weeks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {completionEntries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No clients with active programs.</p>
          ) : (
            <ul className="divide-y divide-border">{renderEntries(completionEntries)}</ul>
          )}
        </CardContent>
      </Card>

      {/* PRs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Personal Records
            <span className="ml-auto text-xs font-normal text-muted-foreground">All time</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {prEntries.length === 0 ? (
            <p className="px-6 py-4 text-sm text-muted-foreground">No PRs logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">{renderEntries(prEntries)}</ul>
          )}
        </CardContent>
      </Card>

      {/* Streak */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            Current Streak
            <span className="ml-auto text-xs font-normal text-muted-foreground">Consecutive weeks</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">{renderEntries(streakEntries)}</ul>
        </CardContent>
      </Card>
    </div>
  );
}
