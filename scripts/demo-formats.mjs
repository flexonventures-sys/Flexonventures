// End-to-end exercise of the format engine through the real HTTP API, as an organiser.
// Creates "Flexon Format Showcase" with one category per format family, enters players/teams,
// generates every stage, plays every match, advances rounds/stages, and prints standings.
// Usage: BASE=http://localhost:3000 ORG_EMAIL=... ORG_PASSWORD=... node scripts/demo-formats.mjs
const BASE = process.env.BASE ?? "http://localhost:3000";
let cookie = "";
async function api(path, body, method) {
  const r = await fetch(BASE + "/api/" + path, { method: method ?? (body ? "POST" : "GET"), headers: { "content-type": "application/json", cookie }, body: body ? JSON.stringify(body) : undefined });
  const set = r.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = [...new Map([...cookie.split("; ").filter(Boolean), ...set.map((c) => c.split(";")[0])].map((c) => [c.split("=")[0], c])).values()].join("; ");
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method ?? (body ? "POST" : "GET")} ${path}: ${j.error ?? r.status}`);
  return j;
}
const log = (...a) => console.log(...a);
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
function games(m) {
  const w = rnd() < 0.5 ? 0 : 1, need = Math.ceil(m.best_of / 2), out = [];
  const to = m.points_to > 30 ? 15 : m.points_to;
  for (let g = 0; g < need; g++) { const lo = Math.floor(rnd() * (to - 2)); out.push(w === 0 ? [to, lo] : [lo, to]); }
  return out;
}

await api("auth/password", { email: process.env.ORG_EMAIL, password: process.env.ORG_PASSWORD, role: "organiser" });
log("logged in as organiser");

const today = new Date().toISOString().slice(0, 10);
const cats = [
  { name: "Double elimination", format: "double_elim", config: { reset: false }, entry: "pair" },
  { name: "Compass draw singles", format: "compass", entry: "player" },
  { name: "Pools to playoffs", format: "pools_single_elim", config: { groups: 2, advance: 2, bronze: true }, entry: "pair" },
  { name: "Swiss", format: "swiss", config: { rounds: 3 }, entry: "pair" },
  { name: "King of the Court", format: "king_court", config: { courts: 2, rounds: 3 } },
  { name: "Mixer", format: "rotating", config: { courts: 2, rounds: 3 } },
  { name: "Mexicano", format: "mexicano", config: { courts: 2, rounds: 2 } },
  { name: "Shootout", format: "shootout", config: { courts: 2, rounds: 2 } },
  { name: "Singles ladder", format: "ladder", config: { reach: 3 }, entry: "player" },
  { name: "MLP team league", format: "mlp_team", config: { groups: 1, advance: 2 } },
];
const { code } = await api("console/tournaments", { name: "Flexon Format Showcase", start: today, end: today, courts: 4, status: "live", categories: cats.map((c) => ({ ...c, scoring: "so11bo1", playoffScoring: "so11bo3" })) });
log("created tournament", code);

let d = await api(`console/tournaments/${code}`);
const P = Object.fromEntries(d.players.map((p) => [p.code, p]));
const men = ["as", "km", "vr", "an", "rd", "dm", "nb", "aj"].map((c) => P[c].id), women = ["rk", "ab", "ts", "mi", "sq", "ir", "pg", "kp"].map((c) => P[c].id);
const all = [...men, ...women];
const pairs = Array.from({ length: 8 }, (_, i) => [men[i], women[i]]);

// teams for the team format
const teamIds = [];
for (let t = 0; t < 4; t++) {
  const { id } = await api("console/teams", { tournament: code, name: ["Salt Lake Smashers", "New Town Dinks", "Ballygunge Blasters", "Howrah Heat"][t], players: [men[t * 2], men[t * 2 + 1], women[t * 2], women[t * 2 + 1]] });
  teamIds.push(id);
}
const catId = (name) => d.categories.find((c) => c.name === name).id;
for (const c of cats) {
  const id = catId(c.name), f = c.format;
  if (f === "mlp_team") { for (const [i, t] of teamIds.entries()) await api("console/entries", { category: id, team: t, seed: i + 1 }); continue; }
  const individual = ["king_court"].includes(f) ? false : ["rotating", "mexicano", "shootout"].includes(f) || c.entry === "player";
  const list = individual ? all.slice(0, f === "compass" || f === "ladder" ? 8 : 16).map((p) => [p]) : pairs.slice(0, f === "pools_single_elim" ? 8 : f === "double_elim" ? 6 : 8);
  for (const [i, ps] of list.entries()) await api("console/entries", { category: id, players: ps, seed: i + 1 });
}
log("entries added");

async function playStage(stage) {
  const lock = async (m) => {
    if (m.tie_id && !m.side_a.length) {
      const tie = d.ties.find((t) => t.id === m.tie_id);
      const sq = (teamId) => d.teams.find((t) => t.id === teamId).team_players.map((x) => x.player_id);
      const pick = (ps) => (/women/i.test(m.event) ? ps.slice(2, 4) : /men/i.test(m.event) ? ps.slice(0, 2) : m.event === "DreamBreaker" ? ps.slice(0, 1) : [ps[0], ps[2]]);
      await api(`console/matches/${m.code}`, { sideA: pick(sq(tie.team_a)), sideB: pick(sq(tie.team_b)) }, "PATCH");
    }
    // force a 2-2 in the first tie so a DreamBreaker is created
    let g = games(m);
    if (m.tie_id && m.event !== "DreamBreaker" && m.tie_id === d.ties.find((t) => t.stage_id === stage.id)?.id) g = Array.from({ length: Math.ceil(m.best_of / 2) }, () => (m.event.includes("1") || m.event.startsWith("Women") ? [11, 6] : [6, 11]));
    await api(`matches/${m.code}/action`, { action: "lock", games: g });
  };
  const refresh = async () => { d = await api(`console/tournaments/${code}`); return d.matches.filter((m) => m.stage_id === stage.id); };
  if (stage.kind === "ladder") {
    await api(`console/stages/${stage.id}`, { action: "generate" });
    d = await api(`console/tournaments/${code}`);
    const order = d.stages.find((s) => s.id === stage.id).state.ladder;
    await api(`console/stages/${stage.id}`, { action: "challenge", challenger: order[3], defender: order[1] });
    for (const m of (await refresh()).filter((m) => m.status === "upcoming")) await api(`matches/${m.code}/action`, { action: "lock", games: [[11, 4]] });
    return;
  }
  await api(`console/stages/${stage.id}`, { action: "generate" });
  for (let guard = 0; guard < 60; guard++) {
    const ms = await refresh();
    const ready = ms.filter((m) => m.status === "upcoming" && (m.entry_a || m.side_a.length || m.tie_id) && (m.entry_b || m.side_b.length || m.tie_id));
    if (ready.length) { for (const m of ready) await lock(m); continue; }
    try { await api(`console/stages/${stage.id}`, { action: "next" }); } catch { break; }
  }
}

d = await api(`console/tournaments/${code}`);
for (const c of d.categories) {
  const stages = d.stages.filter((s) => s.category_id === c.id).sort((a, b) => a.seq - b.seq);
  for (const s of stages) {
    try { await playStage(s); } catch (e) { log(`  ! ${c.name} / ${s.name}: ${e.message}`); }
  }
}
d = await api(`console/tournaments/${code}`);
for (const c of d.categories) {
  const stages = d.stages.filter((s) => s.category_id === c.id);
  log(`\n== ${c.name} [${c.format?.name}]`);
  for (const s of stages) {
    const ms = d.matches.filter((m) => m.stage_id === s.id);
    const st = d.standings.find((x) => x.stageId === s.id);
    const top = st?.groups.map((g) => `${g.name}: ${g.rows.slice(0, 3).map((r) => `${r.name} (${r.won}-${r.lost}${r.pf ? `, ${r.pf}pts` : ""})`).join("; ")}`).join(" | ");
    const fin = ms.find((m) => /Grand final|^Final|East Final|Final$/.test(m.stage) && m.winner !== null);
    log(`  ${s.name}: ${s.status}, ${ms.length} matches, ${ms.filter((m) => m.status === "done" || m.status === "walkover").length} played${fin ? `, winner ${fin.winner === 0 ? fin.nameA : fin.nameB}` : ""}`);
    if (top) log(`    ${top}`);
    const dbm = ms.filter((m) => m.event === "DreamBreaker");
    if (dbm.length) log(`    DreamBreakers: ${dbm.length}, ties decided: ${d.ties.filter((t) => t.stage_id === s.id && t.winner_team).length}/${d.ties.filter((t) => t.stage_id === s.id).length}`);
  }
}
