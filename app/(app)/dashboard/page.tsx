import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Users, Dumbbell, ArrowRight, AlertTriangle, Clock, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type ClientRow = Pick<Profile, "id" | "full_name" | "email">;
type ActiveProgramRow = {
  client_id: string;
  program_id: string;
  start_date: string;
  end_date: string | null;
  programs: { name: string } | null;
};
type NeedsAttentionClient = ClientRow & {
  reason: "expired" | "expiring" | "no_program";
  programName?: string;
  daysLeft?: number;
  endDate?: Date;
};

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profileData } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role !== "coach") redirect("/home");

  const [
    { count: clientCount },
    { count: exerciseCount },
    { data: allClientsData },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    admin.from("exercises").select("*", { count: "exact", head: true }).eq("coach_id", user.id),
    admin.from("profiles").select("id, full_name, email").eq("coach_id", user.id).order("full_name"),
  ]);

  const allClients = (allClientsData ?? []) as ClientRow[];
  const clientIds = allClients.map(c => c.id);

  const { data: activeProgramsData } = clientIds.length > 0
    ? await admin
        .from("client_programs")
        .select("client_id, program_id, start_date, end_date, programs(name)")
        .in("client_id", clientIds)
        .eq("is_active", true)
        .order("start_date", { ascending: false })
    : { data: [] };

  const activePrograms = (activeProgramsData ?? []) as unknown as ActiveProgramRow[];

  // Build map: clientId -> most recent active program
  const activeProgramMap = new Map<string, ActiveProgramRow>();
  for (const ap of activePrograms) {
    if (!activeProgramMap.has(ap.client_id)) {
      activeProgramMap.set(ap.client_id, ap);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const needsAttention: NeedsAttentionClient[] = [];
  const recentClients = allClients.slice(0, 5);

  for (const client of allClients) {
    const prog = activeProgramMap.get(client.id);
    if (!prog) {
      needsAttention.push({ ...client, reason: "no_program" });
    } else if (prog.end_date) {
      const endDate = new Date(prog.end_date);
      if (endDate < today) {
        needsAttention.push({ ...client, reason: "expired", programName: prog.programs?.name ?? undefined, endDate });
      } else if (endDate <= in7Days) {
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
        needsAttention.push({ ...client, reason: "expiring", programName: prog.programs?.name ?? undefined, daysLeft, endDate });
      }
    }
  }

  const expired = needsAttention.filter(c => c.reason === "expired");
  const expiringSoon = needsAttention.filter(c => c.reason === "expiring");
  const noProgram = needsAttention.filter(c => c.reason === "no_program");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your coaching business</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Clients</span>
            </div>
            <p className="text-2xl font-bold mt-1">{clientCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Exercises</span>
            </div>
            <p className="text-2xl font-bold mt-1">{exerciseCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Needs Programming
              <Badge variant="destructive" className="ml-auto">{needsAttention.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {expired.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{client.full_name ?? client.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.programName} — expired {client.endDate?.toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Expired</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
              {expiringSoon.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{client.full_name ?? client.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.programName} — {client.daysLeft === 0 ? "expires today" : `${client.daysLeft}d left`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-amber-600 border-amber-400/40 bg-amber-400/10">
                        <Clock className="h-3 w-3 mr-1" />
                        {client.daysLeft}d left
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
              {noProgram.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{client.full_name ?? client.email}</p>
                      <p className="text-xs text-muted-foreground">No active program</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-muted-foreground" />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recent Clients */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Clients</CardTitle>
          <Link href="/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentClients.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentClients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{client.full_name ?? "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              No clients yet.{" "}
              <Link href="/clients" className="text-primary hover:underline">
                Add your first client
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/programs/new" className={cn(buttonVariants({ size: "lg" }), "h-12")}>
          <BookOpen className="mr-2 h-4 w-4" /> New program
        </Link>
        <Link href="/exercises" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-12")}>
          <Dumbbell className="mr-2 h-4 w-4" /> Exercise library
        </Link>
      </div>
    </div>
  );
}
