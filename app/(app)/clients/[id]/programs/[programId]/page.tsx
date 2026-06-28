import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, Pencil, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkoutExerciseRow = {
  id: string;
  sets: number;
  reps: string;
  weight_kg: number | null;
  rest_seconds: number;
  order_index: number;
  notes: string | null;
  superset_group: string | null;
  exercises: { id: string; name: string } | null;
};

type WorkoutRow = {
  id: string;
  name: string;
  day_order: number;
  workout_exercises: WorkoutExerciseRow[];
};

export default async function ClientProgramPage({
  params,
}: {
  params: Promise<{ id: string; programId: string }>;
}) {
  const { id: clientId, programId } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: coachData } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (coachData?.role !== "coach") redirect("/home");

  const [{ data: clientData }, { data: assignmentData }, { data: workoutsData }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", clientId)
        .eq("coach_id", user.id)
        .single(),
      admin
        .from("client_programs")
        .select("id, start_date, is_active, programs(id, name, description)")
        .eq("client_id", clientId)
        .eq("program_id", programId)
        .single(),
      admin
        .from("program_workouts")
        .select(`
          id, name, day_order,
          workout_exercises (
            id, sets, reps, weight_kg, rest_seconds, order_index, notes, superset_group,
            exercises (id, name)
          )
        `)
        .eq("program_id", programId)
        .order("day_order"),
    ]);

  if (!clientData || !assignmentData) notFound();

  type AssignmentData = {
    id: string;
    start_date: string;
    is_active: boolean;
    programs: { id: string; name: string; description: string | null } | null;
  };
  const assignment = assignmentData as unknown as AssignmentData;
  const workouts = (workoutsData ?? []) as unknown as WorkoutRow[];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${clientId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
          {clientData.full_name ?? clientData.email}
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{assignment.programs?.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Started {new Date(assignment.start_date).toLocaleDateString("en-AU")}
          </p>
          {assignment.programs?.description && (
            <p className="text-sm text-muted-foreground mt-1">{assignment.programs.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={assignment.is_active ? "default" : "secondary"}>
            {assignment.is_active ? "Active" : "Past"}
          </Badge>
          <Link
            href={`/programs/${programId}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Link>
        </div>
      </div>

      {workouts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No workouts in this program yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => {
            const exercises = [...workout.workout_exercises].sort(
              (a, b) => a.order_index - b.order_index
            );
            return (
              <Card key={workout.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      {workout.name}
                    </span>
                    <Link
                      href={`/workouts/${workout.id}/start?forClient=${clientId}`}
                      className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5 shrink-0")}
                    >
                      <Play className="h-3.5 w-3.5" /> Log
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {exercises.length === 0 ? (
                    <p className="px-6 py-3 text-sm text-muted-foreground">No exercises yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {exercises.map((ex) => (
                        <li key={ex.id} className="flex items-center justify-between gap-4 px-6 py-3">
                          <div>
                            <p className="text-sm font-medium">{ex.exercises?.name}</p>
                            {ex.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5">{ex.notes}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold">
                              {ex.sets} × {ex.reps}
                              {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ""}
                            </p>
                            {ex.rest_seconds > 0 && (
                              <p className="text-xs text-muted-foreground">{ex.rest_seconds}s rest</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
