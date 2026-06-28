import { cache } from "react";
import { getSessionUser } from "./server";
import { createAdminClient } from "./admin";

export const getUserTimezone = cache(async (): Promise<string> => {
  const user = await getSessionUser();
  if (!user) return "Australia/Melbourne";
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  return (data as { timezone?: string } | null)?.timezone ?? "Australia/Melbourne";
});
