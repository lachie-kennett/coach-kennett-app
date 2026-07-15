import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Accounts to never touch.
const EXCLUDE_EMAILS = new Set([
  "lachie@coachkennett.com", // coach (also excluded by role filter)
  "lkennett7@gmail.com",     // test account
]);

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

const targets = profiles.filter((p) => !EXCLUDE_EMAILS.has((p.email ?? "").toLowerCase()));
console.log(`\nUpdating ${targets.length} of ${profiles.length} clients (excluding ${profiles.length - targets.length})\n`);

let ok = 0;
const failures = [];

for (const p of targets) {
  const password = nameToPassword(p.full_name);
  if (password.length < 6) {
    failures.push({ email: p.email, reason: `password too short (${password})` });
    console.log(`SKIP  ${p.full_name} — password under 6 chars`);
    continue;
  }
  const { error: updErr } = await admin.auth.admin.updateUserById(p.id, { password });
  if (updErr) {
    failures.push({ email: p.email, reason: updErr.message });
    console.log(`FAIL  ${p.full_name} (${p.email}) — ${updErr.message}`);
  } else {
    ok++;
    console.log(`OK    ${p.full_name} -> ${password}`);
  }
}

console.log(`\nDone. ${ok} updated, ${failures.length} failed/skipped.`);
if (failures.length) console.log(failures);
