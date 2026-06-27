import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

// Returns the current user from the session cookie — no network call.
// Use this instead of supabase.auth.getUser() everywhere in server components.
export async function getSessionUser() {
  const client = await createClient();
  const { data: { session } } = await client.auth.getSession();
  return session?.user ?? null;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const seen = new Set<string>();
          return cookieStore.getAll().filter(c => {
            if (seen.has(c.name)) return false;
            seen.add(c.name);
            // Malformed chunk joins produce values with spaces; valid JWTs never have them
            if (c.value.includes(" ")) return false;
            return true;
          });
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
