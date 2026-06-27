import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProgramBuilder } from "@/components/programs/program-builder";
import { cn } from "@/lib/utils";
import type { Profile, Program } from "@/lib/types";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role !== "coach") redirect("/home");

  const { data: programData } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .eq("coach_id", user.id)
    .single();

  const program = programData as Program | null;
  if (!program) notFound();

  const { data: workoutsData } = await supabase
    .from("program_workouts")
    .select(`
      id, program_id, name, day_order,
      workout_exercises (
        id, workout_id, exercise_id, sets, reps, weight_kg, rest_seconds, order_index, superset_group, notes,
        exercises (id, name, youtube_url, muscle_groups)
      )
    `)
    .eq("program_id", id)
    .order("day_order");

  const { data: exercisesData } = await supabase
    .from("exercises")
    .select("id, name, muscle_groups, youtube_url")
    .eq("coach_id", user.id)
    .order("name");

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/programs" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{program.name}</h1>
          {program.description && (
            <p className="text-sm text-muted-foreground">{program.description}</p>
          )}
        </div>
      </div>

      <ProgramBuilder
        programId={id}
        initialWorkouts={(workoutsData ?? []) as Parameters<typeof ProgramBuilder>[0]["initialWorkouts"]}
        exercises={(exercisesData ?? []) as Parameters<typeof ProgramBuilder>[0]["exercises"]}
      />
    </div>
  );
}
