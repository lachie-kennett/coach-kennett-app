import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTimezone } from "@/lib/supabase/get-timezone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Trophy, ChevronRight, Dumbbell, CalendarDays, MessageCircle, ExternalLink } from "lucide-react";
import { SessionTypeBadge } from "@/components/programs/session-type-badge";
import { SessionTypeCounts } from "@/components/programs/session-type-counts";
import { VolumeChart } from "@/components/home/progress-chart";
import { WorkoutDayList } from "@/components/workouts/workout-day-list";
import { AddPhotoPrompt } from "@/components/home/add-photo-prompt";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile, PersonalRecord, WorkoutLog, Exercise } from "@/lib/types";

type WeDetail = {
  id: string; block_type: string; sets: number; reps: string; weight_kg: number | null;
  rest_seconds: number; work_seconds: number | null; intensity: string | null;
  superset_group: string | null; order_index: number; is_warmup: boolean; exercises: { name: string } | null;
};
type WorkoutWithExercises = { id: string; name: string; day_order: number; session_type: string | null; workout_exercises: WeDetail[] };
type ProgramWithWorkouts = { id: string; name: string; program_workouts: WorkoutWithExercises[] };
type AssignmentRow = { start_date: string; end_date: string | null; programs: ProgramWithWorkouts | null };
type PRRow = Pick<PersonalRecord, "id" | "weight_kg" | "reps"> & { exercises: Pick<Exercise, "name"> | null };
type LogRow = Pick<WorkoutLog, "id" | "completed_at"> & { program_workouts: { name: string } | null };

function programProgress(startDate: string, endDate: string | null) {
  if (!endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.ceil((end - now) / 86400000);
  const totalWeeks = Math.round((end - start) / (7 * 86400000));
  const currentWeek = Math.min(Math.ceil((now - start) / (7 * 86400000)), totalWeeks);
  return { pct, daysLeft, totalWeeks, currentWeek };
}

export default async function ClientHomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profileData } = await admin
    .from("profiles")
    .select("role, full_name, coach_id, habit_tracker_url, avatar_url")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "role" | "full_name" | "coach_id" | "habit_tracker_url" | "avatar_url"> | null;
  if (profile?.role === "coach") redirect("/dashboard");

  const [
    { data: assignmentData },
    { data: recentPRsData },
    { data: recentLogsData },
    { data: progressLogsData },
  ] = await Promise.all([
    admin
      .from("client_programs")
      .select("start_date, end_date, programs(id, name, program_workouts(id, name, day_order, session_type, workout_exercises(id, block_type, sets, reps, weight_kg, rest_seconds, work_seconds, intensity, superset_group, order_index, is_warmup, exercises(name))))")
      .eq("client_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    admin
      .from("personal_records")
      .select("id, weight_kg, reps, exercises(name)")
      .eq("client_id", user.id)
      .order("achieved_at", { ascending: false })
      .limit(3),
    admin
      .from("workout_logs")
      .select("id, completed_at, program_workouts(name)")
      .eq("client_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(3),
    // Every completed session's weighted sets, to chart total volume over time.
    admin
      .from("workout_logs")
      .select("completed_at, set_logs(weight_kg, reps_completed)")
      .eq("client_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true }),
  ]);

  const assignment = assignmentData as unknown as AssignmentRow | null;
  const recentPRs = recentPRsData as unknown as PRRow[] | null;
  const recentLogs = recentLogsData as unknown as LogRow[] | null;

  const timezone = await getUserTimezone();

  // Total training volume (Σ weight × reps) per completed session, over time.
  type ProgressLog = {
    completed_at: string;
    set_logs: { weight_kg: number | null; reps_completed: number | null }[] | null;
  };
  const volumePoints: { label: string; value: number }[] = [];
  for (const log of (progressLogsData ?? []) as unknown as ProgressLog[]) {
    let vol = 0;
    for (const s of log.set_logs ?? []) {
      if (s.weight_kg != null && s.reps_completed != null && s.reps_completed > 0) {
        vol += s.weight_kg * s.reps_completed;
      }
    }
    if (vol > 0) {
      const label = new Date(log.completed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: timezone });
      volumePoints.push({ label, value: Math.round(vol) });
    }
  }

  // Mini leaderboard — sessions in last 28 days among coach's clients
  type PeerRow = { id: string; full_name: string | null; avatar_url: string | null };
  type MiniEntry = PeerRow & { count: number };
  let miniLeaderboard: MiniEntry[] = [];
  let userRank = 0;

  if (profile?.coach_id) {
    const since = new Date(Date.now() - 28 * 86400000).toISOString();
    const { data: peersData } = await admin
      .from("profiles").select("id, full_name, avatar_url").eq("coach_id", profile.coach_id).eq("role", "client").eq("archived", false);
    const peers = (peersData ?? []) as PeerRow[];
    const peerIds = peers.map(p => p.id);
    const countMap = new Map<string, number>();
    if (peerIds.length > 0) {
      const { data: logData } = await admin
        .from("workout_logs").select("client_id")
        .in("client_id", peerIds)
        .not("completed_at", "is", null)
        .gte("completed_at", since);
      for (const log of logData ?? []) {
        const l = log as { client_id: string };
        countMap.set(l.client_id, (countMap.get(l.client_id) ?? 0) + 1);
      }
    }
    miniLeaderboard = peers
      .map(p => ({ ...p, count: countMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
    userRank = miniLeaderboard.findIndex(p => p.id === user.id) + 1;
  }

  const program = assignment?.programs ?? null;
  const workouts = program?.program_workouts
    ? [...program.program_workouts].sort((a, b) => a.day_order - b.day_order)
    : [];

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const prog = assignment ? programProgress(assignment.start_date, assignment.end_date) : null;

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <div className="pt-2">
        <p className="text-muted-foreground text-sm">Good training,</p>
        <h1 className="text-2xl font-bold">{firstName}</h1>
      </div>

      <a
        href="https://wa.me/61439816501"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-md bg-[#25D366] text-white font-medium py-3 text-sm hover:bg-[#1ebe5c] transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        Message coach
      </a>

      {!profile?.avatar_url && <AddPhotoPrompt />}

      {program ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{program.name}</CardTitle>
              <Badge variant="secondary" className="text-xs">{workouts.length} days</Badge>
            </div>
          </CardHeader>

          {prog && (
            <div className="px-6 pb-4 space-y-2">
              <Progress value={prog.pct} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {prog.daysLeft > 0
                    ? `${prog.daysLeft} days remaining`
                    : "Program complete"}
                </span>
                <span className="text-xs font-semibold text-primary">{prog.pct}%</span>
              </div>
            </div>
          )}

          {workouts.some((w) => w.session_type) && (
            <div className="px-6 pb-4">
              <p className="text-xs text-muted-foreground mb-2">This week</p>
              <SessionTypeCounts types={workouts.map((w) => w.session_type)} />
            </div>
          )}

          <CardContent className="p-0">
            <WorkoutDayList
              days={workouts.map((w) => ({
                id: w.id,
                name: w.name,
                session_type: w.session_type,
                exercises: (w.workout_exercises ?? []).map((e) => ({
                  id: e.id, name: e.exercises?.name ?? "Exercise", block_type: e.block_type,
                  sets: e.sets, reps: e.reps, weight_kg: e.weight_kg, rest_seconds: e.rest_seconds,
                  work_seconds: e.work_seconds, intensity: e.intensity, superset_group: e.superset_group,
                  order_index: e.order_index, is_warmup: e.is_warmup,
                })),
              }))}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No program assigned yet. Your coach will assign one soon.</p>
          </CardContent>
        </Card>
      )}

      {volumePoints.length >= 2 && <VolumeChart points={volumePoints} />}

      {recentPRs && recentPRs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Recent PRs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPRs.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between px-6 py-3 border-t border-border first:border-0">
                <p className="text-sm font-medium">{pr.exercises?.name}</p>
                <Badge className="text-xs bg-primary/20 text-primary border-0">
                  {pr.weight_kg}kg × {pr.reps}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {recentLogs && recentLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent sessions</CardTitle>
            <Link href="/history" className="text-xs text-primary hover:underline flex items-center gap-1">
              All <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3 border-t border-border first:border-0">
                <p className="text-sm font-medium">{log.program_workouts?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(log.completed_at!).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: timezone })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {miniLeaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Leaderboard
            </CardTitle>
            <Link href="/leaderboard" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <p className="px-6 pb-2 text-xs text-muted-foreground">Sessions — last 28 days</p>
            <ul className="divide-y divide-border">
              {miniLeaderboard.slice(0, 3).map((entry, idx) => {
                const isMe = entry.id === user.id;
                return (
                  <li key={entry.id} className={cn("flex items-center gap-3 px-6 py-3", isMe && "bg-primary/5")}>
                    <span className="text-sm font-bold w-5 text-center text-muted-foreground shrink-0">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                    </span>
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center ring-2 ring-border">
                      {entry.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={entry.avatar_url} alt={entry.full_name ?? ""} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-primary">{(entry.full_name ?? "?")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <p className={cn("flex-1 text-sm", isMe ? "font-semibold" : "font-medium")}>
                      {entry.full_name ?? "Athlete"}{isMe && " (you)"}
                    </p>
                    <span className="text-sm font-semibold tabular-nums">{entry.count}</span>
                  </li>
                );
              })}
              {userRank > 3 && (
                <>
                  <li className="px-6 py-1 text-center text-xs text-muted-foreground">···</li>
                  <li className="flex items-center gap-3 px-6 py-3 bg-primary/5">
                    <span className="text-sm font-bold w-5 text-center text-muted-foreground">{userRank}</span>
                    <p className="flex-1 text-sm font-semibold">
                      {profile?.full_name ?? "You"} (you)
                    </p>
                    <span className="text-sm font-semibold tabular-nums">
                      {miniLeaderboard[userRank - 1]?.count ?? 0}
                    </span>
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {profile?.habit_tracker_url && (
        <a
          href={profile.habit_tracker_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-md border border-border bg-card font-medium py-3 text-sm hover:bg-muted/50 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Habit tracker
        </a>
      )}
    </div>
  );
}
