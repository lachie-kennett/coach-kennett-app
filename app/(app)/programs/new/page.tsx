import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewProgramForm } from "@/components/programs/new-program-form";

export default async function NewProgramPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/home");

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-6">New program</h1>
      <NewProgramForm coachId={user.id} />
    </div>
  );
}
