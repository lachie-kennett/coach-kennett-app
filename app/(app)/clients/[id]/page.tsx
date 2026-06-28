import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTimezone } from "@/lib/supabase/get-timezone";
import { VolumeChart } from "@/components/charts/volume-chart";
import { buildWeeklyVolume } from "@/lib/volume";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AssignProgramDialog } from "@/components/clients/assign-program-dialog";
import { ArrowLeft, ArrowRight, Trophy, BookOpen, Clock, Plus, BarChart2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Profile, Program, PersonalRecord, WorkoutLog, Exercise, ClientProgram } from "@/lib/types";

function programProgress(startDate: string, endDate: string | null) {
  if (!endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const pct = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { pct, daysLeft };
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: coachData } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (coachData?.role !== "coach") redirect("/home");

  const { data: clientData } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("coach_id", user.id)
    .single();

  const client = clientData as Profile | null;
  if (!client) notFound();

  type AssignmentRow = Pick<ClientProgram, "id" | "program_id" | "start_date" | "end_date" | "is_active"> & {
    programs: Pick<Program, "id" | "name"> | null;
  };
  type PRRow = Pick<PersonalRecord, "id" | "weight_kg" | "reps" | "achieved_at"> & {
    exercises: Pick<Exercise, "name"> | null;
  };
  type LogRow = Pick<WorkoutLog, "id" | "started_at"> & {
    program_workouts: { name: string } | null;
  };

  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 86400000).toISOString();

  const [
    { data: assignmentsData },
    { data: programsData },
    { data: prsData },
    { data: recentLogsData },
    { data: volumeLogsData },
  ] = await Promise.all([
    admin
      .from("client_programs")
      .select("id, program_id, start_date, end_date, is_active, programs(id, name)")
      .eq("client_id", id)
      .order("is_active", { ascending: false })
      .order("start_date", { ascending: false }),
    admin.from("programs").select("id, name").eq("coach_id", user.id).is("client_id", null),
    admin
      .from("personal_records")
      .select("id, weight_kg, reps, achieved_at, exercises(name)")
      .eq("client_id", id)
      .order("achieved_at", { ascending: false })
      .limit(5),
    admin
      .from("workout_logs")
      .select("id, started_at, program_workouts(name)")
      .eq("client_id", id)
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5),
    admin
      .from("workout_logs")
      .select("id, completed_at, set_logs(workout_log_id, weight_kg, reps_completed)")
      .eq("client_id", id)
      .not("completed_at", "is", null)
      .gte("completed_at", twelveWeeksAgo),
  ]);

  const assignments = assignmentsData as AssignmentRow[] | null;
  const programs = programsData as Pick<Program, "id" | "name">[] | null;
  const prs = prsData as PRRow[] | null;
  const recentLogs = recentLogsData as LogRow[] | null;

  type VolumeLogRow = { id: string; completed_at: string; set_logs: { workout_log_id: string; weight_kg: number | null; reps_completed: number | null }[] };
  const volumeLogs = (volumeLogsData ?? []) as unknown as VolumeLogRow[];
  const volumeFlatLogs = volumeLogs.map((l) => ({ id: l.id, completed_at: l.completed_at }));
  const volumeFlatSets = volumeLogs.flatMap((l) => l.set_logs ?? []);
  const weeklyVolume = buildWeeklyVolume(volumeFlatLogs, volumeFlatSets, 12);

  const activePrograms = assignments?.filter(a => a.is_active) ?? [];
  const pastPrograms = assignments?.filter(a => !a.is_active) ?? [];
  const timezone = await getUserTimezone();

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{client.full_name ?? "Unnamed"}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
      </div>

      {/* Current Program */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Current Program
          </CardTitle>
          <div className="flex gap-2">
            <Link
              href={`/programs/new?clientId=${id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Plus className="mr-1 h-4 w-4" /> New
            </Link>
            <AssignProgramDialog clientId={id} coachId={user.id} programs={programs ?? []} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activePrograms.length > 0 ? (
            <ul className="divide-y divide-border">
              {activePrograms.map((a) => {
                const prog = programProgress(a.start_date, a.end_date);
                const isExpired = prog && prog.daysLeft < 0;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/clients/${id}/programs/${a.program_id}`}
                      className="block px-6 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{a.programs?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Started {new Date(a.start_date).toLocaleDateString("en-AU")}
                            {a.end_date && ` · Ends ${new Date(a.end_date).toLocaleDateString("en-AU")}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {prog && (
                            <span className={cn("text-xs font-medium", isExpired ? "text-destructive" : "text-muted-foreground")}>
                              {isExpired ? `Expired ${Math.abs(prog.daysLeft)}d ago` : `${prog.daysLeft}d left`}
                            </span>
                          )}
                          <Badge variant={isExpired ? "destructive" : "default"}>
                            {isExpired ? "Expired" : "Active"}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {prog && (
                        <Progress
                          value={prog.pct}
                          className="mt-2 h-1.5"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">No active program — assign one above.</p>
          )}
        </CardContent>
      </Card>

      {/* Past Programs */}
      {pastPrograms.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Past Programs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {pastPrograms.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/clients/${id}/programs/${a.program_id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{a.programs?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {new Date(a.start_date).toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Past</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Volume Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" /> Weekly Volume
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <VolumeChart data={weeklyVolume} />
        </CardContent>
      </Card>

      {/* Recent PRs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Recent PRs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {prs && prs.length > 0 ? (
            <ul className="divide-y divide-border">
              {prs.map((pr) => (
                <li key={pr.id} className="flex items-center justify-between px-6 py-3">
                  <p className="text-sm font-medium">{pr.exercises?.name}</p>
                  <p className="text-sm text-muted-foreground">{pr.weight_kg}kg × {pr.reps}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">No PRs logged yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs && recentLogs.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-6 py-3">
                  <p className="text-sm font-medium">{log.program_workouts?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.started_at).toLocaleDateString("en-AU", { timeZone: timezone })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">No sessions logged yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
