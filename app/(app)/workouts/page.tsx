import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Play, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type WorkoutWithExercises = { id: string; name: string; day_order: number; workout_exercises: { id: string }[] };
type ProgramWithWorkouts = { id: string; name: string; program_workouts: WorkoutWithExercises[] };
type AssignmentRow = { id: string; is_active: boolean; start_date: string; programs: ProgramWithWorkouts | null };

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role === "coach") redirect("/programs");

  const { data: assignmentsData } = await supabase
    .from("client_programs")
    .select("id, is_active, start_date, programs(id, name, program_workouts(id, name, day_order, workout_exercises(id)))")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const assignments = assignmentsData as unknown as AssignmentRow[] | null;

  return (
    <div className="p-4 space-y-5 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold pt-2">Workouts</h1>

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
                </CardHeader>
                <CardContent className="p-0">
                  {workouts.map((w) => (
                    <div key={w.id} className="flex items-center justify-between px-6 py-3 border-t border-border first:border-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                          <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{w.name}</p>
                          <p className="text-xs text-muted-foreground">{w.workout_exercises.length} exercises</p>
                        </div>
                      </div>
                      <Link href={`/workouts/${w.id}/start`} className={cn(buttonVariants({ size: "sm" }), "h-8 px-3 gap-1.5")}>
                        <Play className="h-3.5 w-3.5" /> Start
                      </Link>
                    </div>
                  ))}
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
