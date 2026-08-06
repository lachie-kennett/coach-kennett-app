import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ProgramBuilder } from "@/components/programs/program-builder";
import { ProgramNameEditor } from "@/components/programs/program-name-editor";
import { ProgramLengthEditor } from "@/components/programs/program-length-editor";
import { cn } from "@/lib/utils";
import { getCoachContext, canAccessClient } from "@/lib/coach-context";
import type { Program } from "@/lib/types";

export default async function ProgramDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { id } = await params;
  const { clientId } = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const ctx = await getCoachContext(admin, user.id);
  if (!ctx) redirect("/home");

  // When editing in the context of a client, back returns to that client's
  // profile; otherwise to the programs list.
  let backHref = "/programs";
  let backLabel = "";
  if (clientId) {
    const { data: clientRow } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", clientId)
      .eq("coach_id", ctx.headCoachId)
      .single();
    if (clientRow) {
      backHref = `/clients/${clientId}`;
      backLabel = (clientRow as { full_name: string | null }).full_name ?? "Client";
    }
  }

  const { data: programData } = await admin
    .from("programs")
    .select("*")
    .eq("id", id)
    .eq("coach_id", ctx.headCoachId)
    .single();

  const program = programData as (Program & { client_id: string | null }) | null;
  if (!program) notFound();
  // Assistants may only open programs for their assigned clients (not templates).
  if (ctx.isAssistant && (!program.client_id || !canAccessClient(ctx, program.client_id))) {
    redirect("/clients");
  }

  const { data: workoutsData } = await admin
    .from("program_workouts")
    .select(`
      id, program_id, name, day_order, session_type,
      workout_exercises (
        id, workout_id, exercise_id, block_type, sets, reps, weight_kg, rest_seconds, work_seconds, intensity, order_index, superset_group, notes, is_warmup,
        exercises (id, name, youtube_url, muscle_groups),
        conditioning_weeks (week_number, sets, reps, work_seconds, rest_seconds, intensity)
      )
    `)
    .eq("program_id", id)
    .order("day_order");

  const { data: exercisesData } = await admin
    .from("exercises")
    .select("id, name, muscle_groups, youtube_url")
    .eq("coach_id", ctx.headCoachId)
    .order("name");

  const { data: sessionTemplatesData } = await admin
    .from("session_templates")
    .select("id, name, session_type")
    .eq("coach_id", ctx.headCoachId)
    .order("created_at", { ascending: false });
  const sessionTemplates = (sessionTemplatesData ?? []) as { id: string; name: string; session_type: string | null }[];

  // Client-specific programs carry a length (start/end dates) on their
  // assignment; templates (no client_id) do not, so the length editor is hidden.
  let assignment: { start_date: string; end_date: string | null } | null = null;
  if (program.client_id) {
    const { data: assignmentData } = await admin
      .from("client_programs")
      .select("start_date, end_date")
      .eq("client_id", program.client_id)
      .eq("program_id", id)
      .maybeSingle();
    assignment = (assignmentData as { start_date: string; end_date: string | null } | null) ?? null;
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href={backHref} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), backLabel && "gap-1.5")}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="min-w-0">
          <ProgramNameEditor programId={id} name={program.name} className="text-xl font-bold" />
          {program.description && (
            <p className="text-sm text-muted-foreground">{program.description}</p>
          )}
        </div>
      </div>

      {program.client_id && assignment && (
        <ProgramLengthEditor
          clientId={program.client_id}
          programId={id}
          startDate={assignment.start_date}
          endDate={assignment.end_date}
        />
      )}

      <ProgramBuilder
        programId={id}
        initialWorkouts={(workoutsData ?? []) as Parameters<typeof ProgramBuilder>[0]["initialWorkouts"]}
        exercises={(exercisesData ?? []) as Parameters<typeof ProgramBuilder>[0]["exercises"]}
        sessionTemplates={sessionTemplates}
      />
    </div>
  );
}
