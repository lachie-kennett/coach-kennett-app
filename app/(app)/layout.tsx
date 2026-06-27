import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CoachNav } from "@/components/nav/coach-nav";
import { ClientBottomNav } from "@/components/nav/client-bottom-nav";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isCoach = profile.role === "coach";

  return (
    <div className="flex h-full flex-col">
      {isCoach ? (
        <CoachNav profile={profile as Profile} />
      ) : null}

      <main className={`flex-1 overflow-y-auto ${!isCoach ? "pb-20" : ""}`}>
        {children}
      </main>

      {!isCoach ? (
        <ClientBottomNav />
      ) : null}
    </div>
  );
}
