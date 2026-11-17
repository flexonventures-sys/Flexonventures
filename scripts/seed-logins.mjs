// Creates email + password logins in the live Supabase project (Supabase Auth):
// an organiser, an admin, four league team owners (with their teams and squads) and two sample players.
// Idempotent: re-running resets each password. Passwords are random and written only to
// credentials.local.txt (git-ignored). Usage: node scripts/seed-logins.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };
const file = new URL("../.env.local", import.meta.url);
if (existsSync(file)) for (const l of readFileSync(file, "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ORG = "00000000-0000-0000-0000-000000000001";
const must = (r, what) => { if (r.error) { console.error(what + ":", r.error.message); process.exit(1); } return r.data; };
const pw = () => { const a = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const b = randomBytes(14); return [...b].map((x) => a[x % a.length]).join("") + "#7"; };

const D = "flexon-sports.test";
const accounts = [
  { email: `organiser@${D}`, role: "organiser", name: "Flexon Organiser" },
  { email: `admin@${D}`, role: "admin", name: "Flexon Admin" },
  { email: `owner.smashers@${D}`, role: "team_owner", name: "Aarav Sen", team: "Salt Lake Smashers", squad: ["as", "km", "rk", "ab"], colour: "#1F4FD1" },
  { email: `owner.dinks@${D}`, role: "team_owner", name: "Kabir Mehta", team: "New Town Dinks", squad: ["vr", "an", "ts", "mi"], colour: "#1E7A46" },
  { email: `owner.blasters@${D}`, role: "team_owner", name: "Vikram Rao", team: "Ballygunge Blasters", squad: ["rd", "dm", "sq", "ir"], colour: "#E5322D" },
  { email: `owner.heat@${D}`, role: "team_owner", name: "Dev Malhotra", team: "Howrah Heat", squad: ["nb", "aj", "pg", "kp"], colour: "#9A3FD1" },
  { email: `player.rohan@${D}`, role: "player", name: "Rohan Das", player: "rd" },
  { email: `player.ishita@${D}`, role: "player", name: "Ishita Roy", player: "ir" },
];

const { data: league } = await sb.from("tournaments").select("id").eq("code", "league1").single();
const existing = (await sb.auth.admin.listUsers({ perPage: 1000 })).data.users;
const lines = ["Flexon Sports Hub logins (email + password). Keep private. Generated " + new Date().toISOString(), ""];
for (const a of accounts) {
  const password = pw();
  const found = existing.find((u) => u.email === a.email);
  let id;
  if (found) { must(await sb.auth.admin.updateUserById(found.id, { password, email_confirm: true }), a.email); id = found.id; }
  else id = must(await sb.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: { full_name: a.name } }), a.email).user.id;
  must(await sb.from("profiles").upsert({ id, email: a.email, full_name: a.name, role: a.role, org_id: a.role === "organiser" || a.role === "admin" ? ORG : null }), "profile " + a.email);
  if (a.team) {
    const team = must(await sb.from("teams").upsert({ tournament_id: league.id, name: a.team, owner_name: a.name, owner_profile: id, owner_verified: true, owner_access: true, colour: a.colour }, { onConflict: "tournament_id,name" }).select("id").single(), "team " + a.team);
    const ps = must(await sb.from("players").select("id, gender").in("code", a.squad), "squad");
    must(await sb.from("team_players").upsert(ps.map((p) => ({ team_id: team.id, player_id: p.id, category: p.gender === "F" ? "Women" : "Men" })), { onConflict: "team_id,player_id" }), "team_players");
  }
  if (a.player) must(await sb.from("players").update({ profile_id: id }).eq("code", a.player), "link player");
  lines.push(`${a.role.padEnd(10)} ${a.email.padEnd(36)} ${password}${a.team ? "   team: " + a.team : ""}${a.player ? "   player profile: " + a.name : ""}`);
}
writeFileSync(new URL("../credentials.local.txt", import.meta.url), lines.join("\n") + "\n");
console.log(lines.join("\n"));
