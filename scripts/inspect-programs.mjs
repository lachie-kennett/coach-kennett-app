import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const name of ["Cam Green", "Darcy Rouget", "Lucas Pham"]) {
  const { data: prof } = await admin.from("profiles").select("id").ilike("full_name", name).maybeSingle();
  const { data: assigns } = await admin.from("client_programs").select("program_id").eq("client_id", prof.id);
  for (const a of assigns ?? []) {
    const { data: prog } = await admin.from("programs").select("id, name").eq("id", a.program_id).single();
    console.log(`\n=== ${name} — ${prog.name} ===`);
    const { data: workouts } = await admin
      .from("program_workouts").select("id, name, session_type, day_order").eq("program_id", prog.id).order("day_order");
    for (const w of workouts ?? []) {
      console.log(`  ${w.name} [${w.session_type ?? "—"}]`);
      const { data: wes } = await admin
        .from("workout_exercises")
        .select("order_index, block_type, sets, reps, weight_kg, rest_seconds, work_seconds, intensity, superset_group, exercise_id, exercises(name)")
        .eq("workout_id", w.id).order("order_index");
      for (const we of wes ?? []) {
        const exName = we.exercises?.name ?? `⚠️ MISSING exercise (${we.exercise_id?.slice(0, 8)})`;
        const meta = we.block_type === "conditioning"
          ? `COND ${we.sets}×${we.reps} work=${we.work_seconds ?? "—"} rest=${we.rest_seconds} int=${we.intensity ?? "—"}`
          : `${we.sets}×${we.reps}${we.weight_kg ? ` @${we.weight_kg}` : ""} rest=${we.rest_seconds}`;
        console.log(`     ${we.superset_group ?? " "} ${exName} — ${meta}`);
      }
    }
  }
}
console.log("");
