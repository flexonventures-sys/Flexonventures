// Admin helper, run with the service-role key (reads .env.local or the environment).
//   node scripts/admin.mjs organiser <email> ["Full Name"]    create/promote an organiser (Supabase Auth user)
//   node scripts/admin.mjs admin <email> ["Full Name"]        same, role admin
//   node scripts/admin.mjs pins <tournament> <court>=<pin> ...  set 4-digit court PINs, e.g. pins kol26 1=4821 2=9035
//   node scripts/admin.mjs list                                list every login that exists
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };
const file = new URL("../.env.local", import.meta.url);
if (existsSync(file))
  for (const l of readFileSync(file, "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local)."); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const ORG = "00000000-0000-0000-0000-000000000001";
const [cmd, ...args] = process.argv.slice(2);
const must = (r) => { if (r.error) { console.error("Failed:", r.error.message); process.exit(1); } return r.data; };

if (cmd === "organiser" || cmd === "admin") {
  const email = (args[0] || "").toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) { console.error("Usage: organiser <email> [name]"); process.exit(1); }
  const name = args[1] || "";
  let id;
  const created = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) {
    const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
    id = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!id) { console.error("Failed:", created.error.message); process.exit(1); }
  } else id = created.data.user.id;
  must(await sb.from("profiles").upsert({ id, email, full_name: name, role: cmd, org_id: ORG }));
  console.log(`${email} is now ${cmd}. Log in at /admin with "Send login code" (6-digit email code).`);
} else if (cmd === "pins") {
  const t = must(await sb.from("tournaments").select("id").eq("code", args[0]).maybeSingle());
  if (!t) { console.error("Unknown tournament code"); process.exit(1); }
  for (const pair of args.slice(1)) {
    const [court, pin] = pair.split("=");
    if (!/^\d{4}$/.test(pin || "")) { console.error(`Bad PIN for court ${court}: must be 4 digits`); process.exit(1); }
    const c = must(await sb.from("courts").select("id").eq("tournament_id", t.id).eq("number", +court).maybeSingle());
    if (!c) { console.error(`No court ${court}`); process.exit(1); }
    must(await sb.rpc("set_court_pin", { p_court: c.id, p_pin: pin }));
    console.log(`Court ${court}: PIN updated`);
  }
} else if (cmd === "list") {
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const profiles = must(await sb.from("profiles").select("id, role, full_name"));
  const role = new Map(profiles.map((p) => [p.id, p.role]));
  for (const u of data.users) console.log((role.get(u.id) || "?").padEnd(10), u.email || u.phone);
  if (!data.users.length) console.log("No logins yet.");
} else {
  console.log("Commands: organiser <email> [name] | admin <email> [name] | pins <tournament> <court>=<pin>... | list");
}
