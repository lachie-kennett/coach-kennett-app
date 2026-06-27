import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, coach_id").eq("id", user.id).single();

  const coachId = profile?.role === "coach" ? user.id : profile?.coach_id;

  const { data: exercises } = await supabase
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
