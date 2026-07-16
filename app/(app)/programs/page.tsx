import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, BookOpen, Plus } from "lucide-react";
import { AssignTemplateDialog } from "@/components/programs/assign-template-dialog";
import { SessionTemplatesManager } from "@/components/programs/session-templates-manager";
import { ProgramNameEditor } from "@/components/programs/program-name-editor";
import { cn } from "@/lib/utils";
import type { Profile, Program } from "@/lib/types";

export default async function ProgramsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profileData } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role !== "coach") redirect("/home");

  const [{ data: programsData }, { data: clientsData }, { data: sessionTemplatesData }] = await Promise.all([
    admin
      .from("programs")
      .select("id, name, description, created_at")
      .eq("coach_id", user.id)
      .is("client_id", null)
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name, email")
      .eq("coach_id", user.id)
      .eq("role", "client")
      .order("full_name"),
    admin
      .from("session_templates")
      .select("id, name, session_type")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const programs = programsData as Pick<Program, "id" | "name" | "description" | "created_at">[] | null;
  const clients = ((clientsData ?? []) as { id: string; full_name: string | null; email: string }[])
    .map((c) => ({ id: c.id, name: c.full_name ?? c.email }));
  const sessionTemplates = (sessionTemplatesData ?? []) as { id: string; name: string; session_type: string | null }[];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">{programs?.length ?? 0} reusable programs</p>
        </div>
        <Link href="/programs/new" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="mr-2 h-4 w-4" /> New template
        </Link>
      </div>

      {programs && programs.length > 0 ? (
        <div className="space-y-2">
          {programs.map((p) => (
            <Card key={p.id} className="hover:bg-secondary/30 transition-colors">
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <ProgramNameEditor programId={p.id} name={p.name} className="font-medium" />
                    {p.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/programs/${p.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                    Open <ArrowRight className="h-4 w-4" />
                  </Link>
                  <AssignTemplateDialog templateId={p.id} templateName={p.name} clients={clients} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No templates yet. Build a reusable program you can assign to any client.</p>
            <Link href="/programs/new" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="mr-2 h-4 w-4" /> New template
            </Link>
          </CardContent>
        </Card>
      )}

      <SessionTemplatesManager templates={sessionTemplates} />
    </div>
  );
}
