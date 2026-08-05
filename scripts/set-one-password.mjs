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

function nameToPassword(name) {
  return (name ?? "").trim().split(/\s+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

const query = process.argv[2].toLowerCase();
const { data: profiles, error } = await admin
  .from("profiles").select("id, full_name, email, role");
if (error) { console.error(error); process.exit(1); }

const matches = profiles.filter((p) => (p.full_name ?? "").toLowerCase().includes(query));
if (matches.length === 0) { console.log("No match for:", query); process.exit(0); }

for (const p of matches) {
  const pw = nameToPassword(p.full_name);
  const { error: uErr } = await admin.auth.admin.updateUserById(p.id, { password: pw });
  console.log(`${p.full_name} | ${p.email} | ${p.role} -> ${pw} ${uErr ? "FAILED: " + uErr.message : "OK"}`);
}
