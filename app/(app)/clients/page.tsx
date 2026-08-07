import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import { ClientList, type ClientRow } from "@/components/clients/client-list";
import { getCoachContext } from "@/lib/coach-context";
import type { Profile } from "@/lib/types";

export default async function ClientsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const ctx = await getCoachContext(admin, user.id);
  if (!ctx) redirect("/home");

  let clientsQuery = admin
    .from("profiles")
    .select("id, full_name, email, created_at, archived, avatar_url, last_active_at")
    .eq("coach_id", ctx.headCoachId)
    .eq("role", "client")
    .order("full_name");
  // Assistants only see the clients assigned to them.
  if (ctx.allowedClientIds !== null) {
    clientsQuery = clientsQuery.in("id", ctx.allowedClientIds.length > 0 ? ctx.allowedClientIds : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data: clientsData } = await clientsQuery;

  const allClients = clientsData as (Pick<Profile, "id" | "full_name" | "email" | "created_at" | "archived" | "avatar_url"> & { last_active_at: string | null })[] | null;
  const clients = allClients?.filter((c) => !c.archived) ?? [];
  const archivedClients = allClients?.filter((c) => c.archived) ?? [];

  // Fallback only: last_sign_in_at from auth.users, used when a client has no
  // last_active_at yet (hasn't opened the app since activity tracking shipped).
  const lastSeenMap = new Map<string, string | null>();
  if (allClients && allClients.length > 0) {
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

  const toRow = (
    c: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> & { last_active_at: string | null }
  ): ClientRow => ({
    id: c.id,
    name: c.full_name ?? "",
    email: c.email,
    avatarUrl: c.avatar_url ?? null,
    // Prefer real app activity; fall back to last sign-in for clients who
    // haven't opened the app since activity tracking was added.
    lastSeen: formatLastSeen(c.last_active_at ?? lastSeenMap.get(c.id)),
  });
  const clientRows = clients.map(toRow);
  const archivedRows = archivedClients.map(toRow);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clients.length} active{archivedClients.length > 0 ? ` · ${archivedClients.length} archived` : ""}
          </p>
        </div>
        {!ctx.isAssistant && <AddClientDialog />}
      </div>

      {clientRows.length === 0 && archivedRows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No clients yet. Add your first client to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <ClientList clients={clientRows} archived={archivedRows} />
      )}
    </div>
  );
}
