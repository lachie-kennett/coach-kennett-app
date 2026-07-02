import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, UserPlus } from "lucide-react";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export default async function ClientsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profileData } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileData as Pick<Profile, "role"> | null;
  if (profile?.role !== "coach") redirect("/home");

  const { data: clientsData } = await admin
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("coach_id", user.id)
    .order("full_name");

  const clients = clientsData as Pick<Profile, "id" | "full_name" | "email" | "created_at">[] | null;

  // Fetch last_sign_in_at for each client from auth.users
  const lastSeenMap = new Map<string, string | null>();
  if (clients && clients.length > 0) {
    const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users) {
      lastSeenMap.set(u.id, u.last_sign_in_at ?? null);
    }
  }

  function formatLastSeen(isoString: string | null | undefined): string {
    if (!isoString) return "Never logged in";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">{clients?.length ?? 0} total</p>
        </div>
        <AddClientDialog />
      </div>

      {clients && clients.length > 0 ? (
        <div className="space-y-2">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:bg-secondary/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                      {(client.full_name ?? client.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{client.full_name ?? "Unnamed"}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatLastSeen(lastSeenMap.get(client.id))}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No clients yet. Add your first client to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
