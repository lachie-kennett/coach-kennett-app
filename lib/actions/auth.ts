"use server";

import { redirect } from "next/navigation";
import {
  getServerSession,
  setSessionCookie,
  clearSessionCookie,
} from "@/lib/supabase/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const BASE_HEADERS = { "Content-Type": "application/json", apikey: ANON };

export async function signIn(email: string, password: string) {
  try {
    const endpoint = `${URL}/auth/v1/token?grant_type=password`;
    console.log("[signIn] URL:", URL ? URL.slice(0, 30) + "..." : "MISSING");
    console.log("[signIn] ANON:", ANON ? ANON.slice(0, 10) + "..." : "MISSING");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ email, password }),
    });

    console.log("[signIn] status:", res.status, res.statusText);
    const text = await res.text();
    console.log("[signIn] body:", text.slice(0, 100));
    const data = JSON.parse(text);
    if (!res.ok) {
      return { error: data.error_description ?? data.message ?? "Invalid email or password" };
    }

    await setSessionCookie(data);
    return { redirectTo: "/redirect" };
  } catch (err) {
    console.error("[signIn]", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function signOut() {
  const session = await getServerSession();
  if (session?.access_token) {
    // Best-effort — invalidate server-side
    fetch(`${URL}/auth/v1/logout`, {
      method: "POST",
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});
  }
  await clearSessionCookie();
  redirect("/login");
}

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const res = await fetch(`${URL}/auth/v1/recover`, {
    method: "POST",
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ email, redirect_to: `${siteUrl}/reset-password` }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { error: data.error_description ?? data.message ?? "Failed to send reset email" };
  }
  return {};
}

export async function resetPassword(accessToken: string, newPassword: string): Promise<{ error?: string }> {
  const res = await fetch(`${URL}/auth/v1/user`, {
    method: "PUT",
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { error: data.message ?? "Failed to reset password" };
  }
  return {};
}

export async function changePassword(newPassword: string) {
  const session = await getServerSession();
  if (!session?.access_token) return { error: "Not authenticated" };

  const res = await fetch(`${URL}/auth/v1/user`, {
    method: "PUT",
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!res.ok) {
    const data = await res.json();
    return { error: data.message ?? "Failed to update password" };
  }
  return { success: true };
}
