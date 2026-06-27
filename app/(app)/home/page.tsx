import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Trophy, ChevronRight, Dumbbell, CalendarDays } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile, PersonalRecord, WorkoutLog, Exercise } from "@/lib/types";

type WorkoutWithExercises = { id: string; name: string; day_order: number; workout_exercises: { id: string }[] };
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "role" | "full_name"> | null;
  if (profile?.role === "coach") redirect("/dashboard");

  const [
    { data: assignmentData },
    { data: recentPRsData },
    { data: recentLogsData },
  ] = await Promise.all([
    admin
      .from("client_programs")
      .select("start_date, end_date, programs(id, name, program_workouts(id, name, day_order, workout_exercises(id)))")
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
  ]);

  const assignment = assignmentData as unknown as AssignmentRow | null;
  const recentPRs = recentPRsData as unknown as PRRow[] | null;
  const recentLogs = recentLogsData as unknown as LogRow[] | null;

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

          <CardContent className="p-0">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between px-6 py-3 border-t border-border hover:bg-secondary/50 transition-colors"
              >
                <Link href={`/workouts/${w.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.workout_exercises.length} exercises</p>
                  </div>
                </Link>
                <Link
                  href={`/workouts/${w.id}/start`}
                  className={cn(buttonVariants({ size: "sm" }), "ml-3 h-8 shrink-0 gap-1.5")}
                >
                  <Play className="h-3.5 w-3.5" /> Start
                </Link>
              </div>
            ))}
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
                  {new Date(log.completed_at!).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
