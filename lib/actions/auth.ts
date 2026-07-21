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
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { ...BASE_HEADERS, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { error: data.error_description ?? data.message ?? "Invalid email or password" };
    }

    await setSessionCookie(data);
    return { redirectTo: "/redirect" };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// Returns a currently-valid access token, transparently refreshing it (and
// re-saving the session cookie) if the stored one has expired. Now that sessions
// last for months, the original access token is usually long gone.
async function getValidAccessToken(): Promise<string | null> {
  const session = await getServerSession();
  if (!session?.access_token) return null;

  const expiresAt = (session.expires_at as number | undefined) ?? 0;
  if (expiresAt * 1000 > Date.now() + 60_000) {
    return session.access_token as string; // still valid for >60s
  }

  const refreshToken = session.refresh_token as string | undefined;
  if (!refreshToken) return session.access_token as string;

  const res = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return session.access_token as string;

  const data = await res.json();
  await setSessionCookie(data);
  return data.access_token as string;
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
  const accessToken = await getValidAccessToken();
  if (!accessToken) return { error: "Not authenticated" };

  const res = await fetch(`${URL}/auth/v1/user`, {
    method: "PUT",
    headers: { ...BASE_HEADERS, Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!res.ok) {
    const data = await res.json();
    return { error: data.message ?? "Failed to update password" };
  }
  return { success: true };
}
