import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewProgramForm } from "@/components/programs/new-program-form";

export default async function NewProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/home");

  const { clientId } = await searchParams;

  let clientName: string | null = null;
  if (clientId) {
    const { data } = await admin.from("profiles").select("full_name").eq("id", clientId).single();
    clientName = (data as { full_name: string | null } | null)?.full_name ?? null;
  }

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-1">New program</h1>
      {clientName && (
        <p className="text-sm text-muted-foreground mb-6">For {clientName}</p>
      )}
      {!clientName && <div className="mb-6" />}
      <NewProgramForm clientId={clientId} />
    </div>
  );
}
