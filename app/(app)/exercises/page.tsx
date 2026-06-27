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

  const coachId = profile?.role === "coach" ? user.id : profile?.coach_id;

  const { data: exercises } = await admin
    .from("exercises")
    .select("*")
    .eq("coach_id", coachId ?? "")
    .order("name");

  return (
    <ExerciseLibrary
      exercises={exercises ?? []}
      isCoach={profile?.role === "coach"}
      coachId={coachId ?? ""}
    />
  );
}
