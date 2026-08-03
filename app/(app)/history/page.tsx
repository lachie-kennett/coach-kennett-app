import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserTimezone } from "@/lib/supabase/get-timezone";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { HistoryCard, type HistoryEntry } from "@/components/history/history-card";
import { ExerciseHistoryBrowser } from "@/components/exercises/exercise-history-browser";
import { buildAllExerciseHistory } from "@/lib/exercise-history";
import type { Profile } from "@/lib/types";

type SetLogRow = {
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  is_pr: boolean;
  workout_exercises: { exercises: { name: string } | null } | null;
  session_exercises: { exercises: { name: string } | null } | null;
};

type LogRow = {
  id: string;
  started_at: string;
  completed_at: string;
  rpe: number | null;
  notes: string | null;
  program_workouts: { name: string } | null;
  set_logs: SetLogRow[];
};

function formatDuration(start: string, end: string) {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  // Guard against resumed/abandoned sessions with an unreliable start time.
  if (mins < 0 || mins > 300) return "—";
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

  const timezone = await getUserTimezone();

  const { data: logsData } = await admin
    .from("workout_logs")
    .select(`
      id, started_at, completed_at, rpe, notes,
      program_workouts(name),
      set_logs(set_number, reps_completed, weight_kg, is_pr,
        workout_exercises(exercises(name)),
        session_exercises(exercises(name))
      )
    `)
    .eq("client_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  const logs = (logsData ?? []) as unknown as LogRow[];
  const exerciseHistories = await buildAllExerciseHistory(admin, user.id);

  const entries: HistoryEntry[] = logs.map((log) => {
    const setLogs = log.set_logs ?? [];
    // Group sets by exercise, keeping first-seen order. Names come from either a
    // program exercise or a session (custom/added/swapped) exercise.
    const order: string[] = [];
    const grouped: Record<string, SetLogRow[]> = {};
    for (const s of setLogs) {
      const name = s.workout_exercises?.exercises?.name ?? s.session_exercises?.exercises?.name ?? "Exercise";
      if (!grouped[name]) { grouped[name] = []; order.push(name); }
      grouped[name].push(s);
    }
    const exercises = order.map((name) => ({
      name,
      sets: grouped[name]
        .slice()
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ setNumber: s.set_number, reps: s.reps_completed, weight: s.weight_kg, isPR: s.is_pr })),
    }));

    return {
      id: log.id,
      title: log.program_workouts?.name ?? "Custom session",
      dateLabel: new Date(log.completed_at).toLocaleDateString("en-AU", {
        weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: timezone,
      }),
      duration: formatDuration(log.started_at, log.completed_at),
      totalSets: setLogs.length,
      prCount: setLogs.filter((s) => s.is_pr).length,
      rpe: log.rpe,
      notes: log.notes,
      exercises,
    };
  });

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-baseline justify-between pt-2">
        <h1 className="text-2xl font-bold">History</h1>
        {entries.length > 0 && (
          <span className="text-sm text-muted-foreground">{entries.length} session{entries.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {exerciseHistories.length > 0 && <ExerciseHistoryBrowser exercises={exerciseHistories} title="By exercise" />}

      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => (
            <HistoryCard key={entry.id} entry={entry} />
          ))}
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
