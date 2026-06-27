import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function RedirectPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "coach") {
    redirect("/dashboard");
  } else {
    redirect("/home");
  }
}
