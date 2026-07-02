import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft, Clock, Play } from "lucide-react";
import { VideoPreviewButton } from "@/components/workouts/video-preview-button";
import { cn } from "@/lib/utils";

export default async function WorkoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: workoutData } = await admin
    .from("program_workouts")
    .select(`
      id, name,
      workout_exercises (
        id, sets, reps, weight_kg, rest_seconds, superset_group, notes, order_index,
        exercises (id, name, description, youtube_url, muscle_groups)
      )
    `)
    .eq("id", id)
    .single();

  if (!workoutData) notFound();

  type WeRow = {
    id: string; sets: number; reps: string; weight_kg: number | null;
    rest_seconds: number; superset_group: string | null; notes: string | null;
    order_index: number;
    exercises: { id: string; name: string; description: string | null; youtube_url: string | null; muscle_groups: string[] } | null;
  };

  const workout = workoutData as { id: string; name: string; workout_exercises: WeRow[] };
  const sorted = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);

  const totalSets = sorted.reduce((sum, we) => sum + we.sets, 0);
  const estimatedMinutes = sorted.reduce((sum, we) => sum + (we.sets * (30 + we.rest_seconds)), 0) / 60;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <Link href="/workouts" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold flex-1">{workout.name}</h1>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{sorted.length}</span> exercises
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalSets}</span> sets
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          ~{Math.round(estimatedMinutes)} min
        </div>
      </div>

      <Link href={`/workouts/${id}/start`} className={cn(buttonVariants({ size: "lg" }), "w-full h-12 flex items-center justify-center")}>
        <Play className="mr-2 h-5 w-5" /> Start workout
      </Link>

      <div className="space-y-2">
        {sorted.map((we, i) => {
          const ex = we.exercises;
          return (
            <Card key={we.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">
                    {we.superset_group ?? i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{ex?.name}</p>
                      {ex && <VideoPreviewButton exercise={ex} />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {we.sets} sets × {we.reps}
                      {we.weight_kg ? ` @ ${we.weight_kg}kg` : ""}
                      {" · "}{we.rest_seconds}s rest
                    </p>
                    {we.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{we.notes}</p>
                    )}
                    {ex?.muscle_groups && ex.muscle_groups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {ex.muscle_groups.map((m: string) => (
                          <span key={m} className="text-xs text-muted-foreground/70">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
