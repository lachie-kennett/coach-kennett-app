import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Load .env.local manually (no dotenv dependency assumed)
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Password rule: capitalize each word of the full name, strip spaces.
function nameToPassword(name) {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

const { data: profiles, error } = await admin
  .from("profiles")
  .select("id, full_name, email, role")
  .eq("role", "client")
  .order("full_name");

if (error) { console.error(error); process.exit(1); }

console.log(`\nClients (role = client): ${profiles.length}\n`);
for (const p of profiles) {
  const pw = nameToPassword(p.full_name);
  const flag = pw.length < 6 ? "  ⚠️ under 6 chars" : "";
  console.log(`${(p.full_name ?? "(no name)").padEnd(24)} ${(p.email ?? "").padEnd(34)} -> ${pw}${flag}`);
}
console.log("");
