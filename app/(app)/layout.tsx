import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CoachNav } from "@/components/nav/coach-nav";
import { ClientBottomNav } from "@/components/nav/client-bottom-nav";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Archived clients keep their account and all data, but lose access to the app
  // immediately — every request bounces them to the paused screen.
  if (profile.archived && profile.role === "client") {
    redirect("/paused");
  }

  // Stamp "last active" so the coach's client list reflects real app usage.
  // Sessions are long-lived, so auth's last_sign_in_at is unreliable. Throttled
  // to ~30 min to avoid a write on every navigation.
  const lastActive = (profile as unknown as { last_active_at: string | null }).last_active_at;
  if (!lastActive || Date.now() - new Date(lastActive).getTime() > 30 * 60 * 1000) {
    await admin
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() } as never)
      .eq("id", user.id);
  }

  // Head coaches and assistant coaches both use the coach-style nav.
  const isStaff = profile.role === "coach" || profile.role === "assistant";

  return (
    <div className="flex h-full flex-col">
      {isStaff ? (
        <CoachNav profile={profile as Profile} />
      ) : null}

      <main className={`flex-1 overflow-y-auto ${!isStaff ? "pb-20" : ""}`}>
        {children}
      </main>

      {!isStaff ? (
        <ClientBottomNav />
      ) : null}
    </div>
  );
}
