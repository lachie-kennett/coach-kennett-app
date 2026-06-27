import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Dumbbell } from "lucide-react";
import type { Profile } from "@/lib/types";

type SetLogRow = {
  id: string;
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  is_pr: boolean;
  workout_exercises: { exercises: { name: string } | null } | null;
};

type LogRow = {
  id: string;
  started_at: string;
  completed_at: string;
  program_workouts: { name: string } | null;
  set_logs: SetLogRow[];
};

function formatDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profileData } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role === "coach") redirect("/dashboard");

  const { data: logsData } = await admin
    .from("workout_logs")
    .select(`
      id, started_at, completed_at,
      program_workouts(name),
      set_logs(id, set_number, reps_completed, weight_kg, is_pr, workout_exercises(exercises(name)))
    `)
    .eq("client_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  const logs = logsData as unknown as LogRow[] | null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold pt-2">History</h1>

      {logs && logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map((log) => {
            const setLogs = log.set_logs ?? [];
            const prCount = setLogs.filter((s) => s.is_pr).length;
            const totalSets = setLogs.length;

            const byExercise = setLogs.reduce<Record<string, SetLogRow[]>>((acc, s) => {
              const exName = s.workout_exercises?.exercises?.name ?? "Unknown";
              if (!acc[exName]) acc[exName] = [];
              acc[exName].push(s);
              return acc;
            }, {});

            return (
              <Card key={log.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {log.program_workouts?.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(log.completed_at).toLocaleDateString("en-AU", {
                          weekday: "short", day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(log.started_at, log.completed_at)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5" /> {totalSets} sets
                    </span>
                    {prCount > 0 && (
                      <Badge className="text-xs bg-primary/20 text-primary border-0">
                        🏆 {prCount} PR{prCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {Object.entries(byExercise).length > 0 && (
                    <div className="mt-3 space-y-1">
                      {Object.entries(byExercise).map(([exName, exSets]) => (
                        <div key={exName} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{exName}</span>
                          <span className="font-medium tabular-nums">
                            {exSets.length} sets
                            {exSets[0]?.weight_kg ? ` @ ${exSets[0].weight_kg}kg` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No completed workouts yet. Start your first session!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
