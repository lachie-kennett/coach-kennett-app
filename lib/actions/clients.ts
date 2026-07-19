"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/supabase/server";
import { sendOnboardingEmail } from "@/lib/email";

// Turns a full name into the standard password: each word capitalised, no
// spaces (e.g. "Ollie Langford" -> "OllieLangford").
function nameToPassword(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export type ImportRow = {
  name: string;
  email: string;
  phone?: string;
};

export type ImportResult = {
  name: string;
  email: string;
  phone?: string;
  status: "created" | "skipped" | "error";
  tempPassword?: string;
  error?: string;
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "Ck_";
  for (let i = 0; i < 8; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}

export async function addClient(
  name: string,
  email: string
): Promise<{ error?: string; success?: boolean; password?: string; emailed?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") return { error: "Not authorized" };

  const fullName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const password = nameToPassword(fullName);
  if (password.length < 6) {
    return { error: "Name is too short to make a password from — please use their full name." };
  }

  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "client" },
  });

  if (createError) return { error: createError.message };

  if (authData.user) {
    await admin.from("profiles").update({ coach_id: user.id }).eq("id", authData.user.id);
  }

  // Fire off the onboarding email (no-op if email isn't configured yet).
  const emailed = await sendOnboardingEmail({ to: cleanEmail, name: fullName, password });

  return { success: true, password, emailed };
}

export async function importClients(rows: ImportRow[]): Promise<ImportResult[]> {
  const user = await getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "coach") throw new Error("Not authorized");

  const results: ImportResult[] = [];

  for (const row of rows) {
    if (!row.email || !row.name) {
      results.push({ name: row.name ?? "", email: row.email ?? "", phone: row.phone, status: "skipped", error: "Missing name or email" });
      continue;
    }

    const email = row.email.trim().toLowerCase();
    const fullName = row.name.trim();
    const tempPassword = generateTempPassword();

    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "client", phone: row.phone?.trim() ?? null },
    });

    if (createError) {
      const isExisting = createError.message.toLowerCase().includes("already");
      results.push({
        name: fullName,
        email,
        phone: row.phone,
        status: isExisting ? "skipped" : "error",
        error: isExisting ? "Account already exists" : createError.message,
      });
      continue;
    }

    if (authData.user) {
      await admin.from("profiles").update({ coach_id: user.id }).eq("id", authData.user.id);
    }

    results.push({ name: fullName, email, phone: row.phone, status: "created", tempPassword });
  }

  return results;
}
