import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CustomSessionBuilder } from "@/components/workouts/custom-session-builder";
import type { Profile } from "@/lib/types";

export default async function CustomSessionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profileData } = await admin.from("profiles").select("role, coach_id").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role" | "coach_id"> | null;
  if (profile?.role === "coach") redirect("/dashboard");

  const coachId = profile?.coach_id;
  if (!coachId) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No coach assigned yet.
      </div>
    );
  }

  const { data: exercisesData } = await admin
    .from("exercises")
    .select("id, name, description, youtube_url, muscle_groups")
    .eq("coach_id", coachId)
    .order("name");

  const exercises = (exercisesData ?? []) as {
    id: string; name: string; description: string | null;
    youtube_url: string | null; muscle_groups: string[];
  }[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2 border-b border-border">
        <h1 className="text-xl font-bold">Custom session</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pick your exercises, then start</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <CustomSessionBuilder exercises={exercises} />
      </div>
    </div>
  );
}
