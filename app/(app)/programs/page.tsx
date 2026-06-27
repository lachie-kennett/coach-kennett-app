import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Program } from "@/lib/types";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role !== "coach") redirect("/home");

  const { data: programsData } = await supabase
    .from("programs")
    .select("id, name, description, created_at")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  const programs = programsData as Pick<Program, "id" | "name" | "description" | "created_at">[] | null;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-sm text-muted-foreground mt-1">{programs?.length ?? 0} total</p>
        </div>
        <Link href="/programs/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="mr-2 h-4 w-4" /> New program
        </Link>
      </div>

      {programs && programs.length > 0 ? (
        <div className="space-y-2">
          {programs.map((p) => (
            <Link key={p.id} href={`/programs/${p.id}`}>
              <Card className="hover:bg-secondary/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No programs yet. Create your first one.</p>
            <Link href="/programs/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="mr-2 h-4 w-4" /> New program
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
