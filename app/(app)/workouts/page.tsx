import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Play, Dumbbell } from "lucide-react";
import { SessionTypeCounts } from "@/components/programs/session-type-counts";
import { WorkoutDayList } from "@/components/workouts/workout-day-list";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type WeDetail = {
  id: string; block_type: string; sets: number; reps: string; weight_kg: number | null;
  rest_seconds: number; work_seconds: number | null; intensity: string | null;
  superset_group: string | null; order_index: number; is_warmup: boolean; exercises: { name: string } | null;
};
type WorkoutWithExercises = { id: string; name: string; day_order: number; session_type: string | null; workout_exercises: WeDetail[] };
type ProgramWithWorkouts = { id: string; name: string; program_workouts: WorkoutWithExercises[] };
type AssignmentRow = { id: string; is_active: boolean; start_date: string; programs: ProgramWithWorkouts | null };

export default async function WorkoutsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profileData } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role === "coach") redirect("/programs");

  const { data: assignmentsData } = await admin
    .from("client_programs")
    .select("id, is_active, start_date, programs(id, name, program_workouts(id, name, day_order, session_type, workout_exercises(id, block_type, sets, reps, weight_kg, rest_seconds, work_seconds, intensity, superset_group, order_index, is_warmup, exercises(name))))")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const assignments = assignmentsData as unknown as AssignmentRow[] | null;

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Workouts</h1>
        <Link href="/workouts/custom" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "gap-1.5")}>
          <Play className="h-3.5 w-3.5" /> Custom session
        </Link>
      </div>

      {assignments && assignments.length > 0 ? (
        <div className="space-y-4">
          {assignments.map((a) => {
            const program = a.programs;
            const workouts = program?.program_workouts
              ? [...program.program_workouts].sort((x, y) => x.day_order - y.day_order)
              : [];

            return (
              <Card key={a.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{program?.name}</CardTitle>
                    <Badge variant={a.is_active ? "default" : "secondary"} className="text-xs">
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(a.start_date).toLocaleDateString("en-AU")}
                  </p>
                  {workouts.some((w) => w.session_type) && (
                    <SessionTypeCounts types={workouts.map((w) => w.session_type)} className="pt-1" />
                  )}
                </CardHeader>
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
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No workouts assigned yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
