import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export default async function ExercisesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, coach_id")
    .eq("id", user.id)
    .single();

  // For a head coach it's their own library; assistants and clients see their
  // head coach's library (profile.coach_id points at the head coach).
  const coachId = profile?.role === "coach" ? user.id : profile?.coach_id;
  const isStaff = profile?.role === "coach" || profile?.role === "assistant";

  const { data: exercises } = await admin
    .from("exercises")
    .select("*")
    .eq("coach_id", coachId ?? "")
    .order("name");

  return (
    <ExerciseLibrary
      exercises={exercises ?? []}
      isCoach={isStaff}
      coachId={coachId ?? ""}
    />
  );
}
