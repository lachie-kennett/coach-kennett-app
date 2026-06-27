import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

// Cookie name Supabase uses — must match what createBrowserClient reads.
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace("https://", "")
  .split(".")[0];

export const SESSION_COOKIE = `sb-${PROJECT_REF}-auth-token`;

const CHUNK_SIZE = 3180; // same as @supabase/ssr

function parseRaw(raw: string) {
  try {
    // Older @supabase/ssr versions base64-encoded the value
    const str = raw.startsWith("base64-")
      ? Buffer.from(raw.slice(7), "base64").toString("utf-8")
      : raw;
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function getServerSession() {
  const store = await cookies();
  const all = store.getAll();

  // Try single cookie
  const single = all.find((c) => c.name === SESSION_COOKIE);
  if (single) return parseRaw(single.value);

  // Try chunked — join WITHOUT spaces (the @supabase/ssr 0.12.x bug joins with spaces)
  const chunks = all
    .filter((c) => c.name.startsWith(`${SESSION_COOKIE}.`))
    .sort((a, b) => {
      const ai = parseInt(a.name.split(".").pop() ?? "0", 10);
      const bi = parseInt(b.name.split(".").pop() ?? "0", 10);
      return ai - bi;
    })
    .map((c) => c.value);

  if (chunks.length > 0) return parseRaw(chunks.join(""));

  return null;
}

export async function getSessionUser(): Promise<User | null> {
  const session = await getServerSession();
  return (session?.user as User) ?? null;
}

// Writes the session object to cookies in the same format createBrowserClient expects.
export async function setSessionCookie(session: object) {
  const store = await cookies();
  const value = JSON.stringify(session);
  const opts = { path: "/", secure: true, sameSite: "lax" as const, httpOnly: false };

  if (value.length <= CHUNK_SIZE) {
    store.set(SESSION_COOKIE, value, opts);
  } else {
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) ?? [];
    chunks.forEach((chunk, i) => store.set(`${SESSION_COOKIE}.${i}`, chunk, opts));
  }
}

export async function clearSessionCookie() {
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name === SESSION_COOKIE || c.name.startsWith(`${SESSION_COOKIE}.`)) {
      store.delete(c.name);
    }
  }
}
