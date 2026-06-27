import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import type { Profile, PersonalRecord, Exercise } from "@/lib/types";

type PRRow = Pick<PersonalRecord, "id" | "weight_kg" | "reps" | "achieved_at"> & {
  exercises: Pick<Exercise, "name"> | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "id" | "full_name" | "email" | "role"> | null;
  if (profile?.role === "coach") redirect("/dashboard");

  const [
    { data: prsData },
    { count: totalWorkouts },
    { data: logIds },
  ] = await Promise.all([
    admin
      .from("personal_records")
      .select("id, weight_kg, reps, achieved_at, exercises(name)")
      .eq("client_id", user.id)
      .order("achieved_at", { ascending: false }),
    admin
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .eq("client_id", user.id)
      .not("completed_at", "is", null),
    admin
      .from("workout_logs")
      .select("id")
      .eq("client_id", user.id),
  ]);

  const prs = prsData as unknown as PRRow[] | null;
  const ids = (logIds ?? []).map((l: { id: string }) => l.id);
  const { count: totalSets } = ids.length > 0
    ? await admin
        .from("set_logs")
        .select("*", { count: "exact", head: true })
        .in("workout_log_id", ids)
    : { count: 0 };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
              {(profile?.full_name ?? profile?.email ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.full_name ?? "Athlete"}</h1>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Workouts</p>
            <p className="text-2xl font-bold mt-1">{totalWorkouts ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total sets</p>
            <p className="text-2xl font-bold mt-1">{totalSets ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">PRs</p>
            <p className="text-2xl font-bold mt-1">{prs?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordForm />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {prs && prs.length > 0 ? (
            <ul className="divide-y divide-border">
              {prs.map((pr) => (
                <li key={pr.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{pr.exercises?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pr.achieved_at).toLocaleDateString("en-AU", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-0 font-semibold">
                    {pr.weight_kg}kg × {pr.reps}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-6 text-sm text-muted-foreground text-center">
              No PRs yet. Complete some sets to start tracking!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
