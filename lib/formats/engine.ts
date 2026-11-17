// Server-side format engine: turns a category's format into stages, generates matches for each stage,
// runs round-by-round formats, reacts to locked results (team ties, DreamBreakers, ladders) and
// computes standings for every format.
import { db, HttpError } from "../supabase";
import { expand, formatById, type Scoring, type StageKind } from "./catalog";
import { compass, consolation, doubleElim, resolve, roundRobinPairs, singleElim, type Spec } from "./brackets";
import { canChallenge, kingCourtRound, ladderAfter, mexicanoRound, rotatingRound, shootoutRound, swissRound, tally, type Result } from "./rounds";

type Stage = { id: string; category_id: string; seq: number; kind: StageKind; name: string; config: any; scoring: Scoring; state: any; status: string };
type Entry = { id: string; display_name: string; seed: number | null; player1_id: string | null; player2_id: string | null; team_id: string | null; player_ids: string[] };
type MatchRow = {
  id: string; code: string; stage_id: string | null; group_id: string | null; tie_id: string | null; bracket: string | null; round_no: number | null; position: number | null;
  entry_a: string | null; entry_b: string | null; side_a: string[]; side_b: string[]; status: string; winner: 0 | 1 | null; games: [number, number][];
  court_no: number | null; event: string | null; stage: string;
};

const INDIVIDUAL: StageKind[] = ["shootout", "rotating", "americano", "mexicano"];
const ROUND_BASED: StageKind[] = ["swiss", "king_court", "shootout", "rotating", "americano", "mexicano"];
const sidesOf = (e: Entry | undefined) => (e ? (e.player_ids?.length ? e.player_ids : [e.player1_id, e.player2_id].filter(Boolean) as string[]) : []);

async function stageById(id: string): Promise<Stage> {
  const { data } = await db().from("stages").select("*").eq("id", id).maybeSingle();
  if (!data) throw new HttpError(404, "Stage not found");
  return data as Stage;
}
async function category(id: string) {
  const { data } = await db().from("categories").select("*, tournaments(id, code, courts)").eq("id", id).single();
  const t = Array.isArray(data.tournaments) ? data.tournaments[0] : data.tournaments;
  return { ...data, tournament: t as { id: string; code: string; courts: number } };
}
async function confirmedEntries(categoryId: string): Promise<Entry[]> {
  const { data } = await db().from("entries").select("id, display_name, seed, player1_id, player2_id, team_id, player_ids")
    .eq("category_id", categoryId).eq("status", "confirmed").order("seed", { nullsFirst: false }).order("created_at");
  return (data ?? []) as Entry[];
}
async function stageMatches(stageId: string): Promise<MatchRow[]> {
  const { data } = await db().from("matches").select("*").eq("stage_id", stageId).order("round_no").order("position");
  return (data ?? []) as MatchRow[];
}

/** Replace a category's stages with the expansion of a format. */
export async function applyFormat(categoryId: string, formatId: string, config: Record<string, unknown>, main: Scoring, playoff?: Scoring, entry?: "player" | "pair") {
  const f = formatById(formatId);
  if (!f) throw new HttpError(400, "Unknown format");
  const { data: started } = await db().from("matches").select("id").eq("category_id", categoryId).neq("status", "upcoming").limit(1);
  if (started?.length) throw new HttpError(409, "Matches have started; the format is locked");
  const ex = expand(formatId, config, main, playoff);
  const participant = entry && f.allows?.includes(entry) ? entry : f.participant;
  await db().from("matches").delete().eq("category_id", categoryId);
  await db().from("stages").delete().eq("category_id", categoryId);
  await db().from("categories").update({ format_id: formatId, format_config: ex.config, participant,
    kind: participant === "team" ? "league" : participant === "player" && !INDIVIDUAL.includes(ex.stages[0].kind) ? "singles" : "doubles",
    scoring: main.type, points_to: main.to, best_of: main.bo }).eq("id", categoryId);
  const { error } = await db().from("stages").insert(ex.stages.map((s, i) => ({ category_id: categoryId, seq: i + 1, kind: s.kind, name: s.name, config: s.config, scoring: s.scoring })));
  if (error) throw error;
  return ex;
}

/** Participants for a stage: confirmed entries for the first stage, qualifiers from the previous stage otherwise. */
async function participants(st: Stage): Promise<Entry[]> {
  const all = await confirmedEntries(st.category_id);
  if (st.seq === 1) return all;
  const { data: prev } = await db().from("stages").select("*").eq("category_id", st.category_id).eq("seq", st.seq - 1).single();
  const table = await standings(prev.id);
  const byId = new Map(all.map((e) => [e.id, e]));
  const groupsOf = table.groups;
  let ids: string[];
  if (st.config.fromPools && groupsOf.length > 1) {
    // crossover: group winners, then runners-up from the next group, etc.
    const per = groupsOf.map((g) => g.rows.slice(0, st.config.fromPools).map((r) => r.id));
    ids = [];
    for (let place = 0; place < st.config.fromPools; place++) for (let gi = 0; gi < per.length; gi++) { const x = per[place % 2 ? (gi + 1) % per.length : gi][place]; if (x) ids.push(x); }
  } else {
    const ranked = groupsOf.flatMap((g) => g.rows).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || (b.pf - b.pa) - (a.pf - a.pa)).map((r) => r.id);
    const n = st.config.topN ?? (st.config.fromPools ? st.config.fromPools * groupsOf.length : ranked.length);
    ids = st.config.flight === "top" ? ranked.slice(0, Math.ceil(ranked.length / 2))
      : st.config.flight === "bottom" ? ranked.slice(Math.ceil(ranked.length / 2)) : ranked.slice(0, n);
  }
  return ids.map((id, i) => ({ ...byId.get(id)!, seed: i + 1 })).filter((e) => e.id);
}

/** Insert specs, then wire winner/loser routing in a second pass. */
async function insertSpecs(st: Stage, specs: Spec[], links: Map<string, any>, entries: Map<string, Entry>, extra: (s: Spec) => Record<string, unknown> = () => ({})) {
  const cat = await category(st.category_id);
  const sc = st.scoring;
  const doubles = INDIVIDUAL.includes(st.kind) || cat.participant !== "player";
  const rows = specs.map((s, i) => {
    const ea = "e" in s.a ? s.a.e : null, eb = "e" in s.b ? s.b.e : null;
    return {
      code: `${cat.tournament.code}-${st.id.slice(0, 8)}-${s.key}`,
      tournament_id: cat.tournament.id, category_id: st.category_id, stage_id: st.id, stage: s.label,
      bracket: s.bracket, round_no: s.round, position: s.position ?? i + 1, court_no: s.court ?? null, event: s.event ?? null,
      entry_a: ea, entry_b: eb, side_a: s.sideA ?? sidesOf(ea ? entries.get(ea) : undefined), side_b: s.sideB ?? sidesOf(eb ? entries.get(eb) : undefined),
      scoring: sc.type, points_to: sc.to, best_of: sc.bo, win_by: sc.winBy ?? 2, cap: sc.cap ?? null, freeze_at: sc.freeze ?? null, timed_minutes: sc.timed ?? null,
      doubles, ...extra(s),
    };
  });
  if (!rows.length) return [];
  const { data, error } = await db().from("matches").insert(rows).select("id, code");
  if (error) throw error;
  const idOf = new Map(specs.map((s, i) => [s.key, data![i].id as string]));
  await Promise.all([...links.entries()].filter(([k]) => idOf.has(k)).map(([k, l]) => db().from("matches").update({
    ...(l.next && idOf.has(l.next.key) && { next_match: idOf.get(l.next.key), next_slot: l.next.slot }),
    ...(l.loserNext && idOf.has(l.loserNext.key) && { loser_next_match: idOf.get(l.loserNext.key), loser_next_slot: l.loserNext.slot }),
  }).eq("id", idOf.get(k)!)));
  return data!;
}

/** Generate the matches of a stage (first round only for round-based formats). */
export async function generateStage(stageId: string) {
  const st = await stageById(stageId);
  const { data: played } = await db().from("matches").select("id").eq("stage_id", st.id).neq("status", "upcoming").limit(1);
  if (played?.length) throw new HttpError(409, "This stage has started; reset is locked");
  if (st.seq > 1) {
    const { data: prev } = await db().from("stages").select("id").eq("category_id", st.category_id).eq("seq", st.seq - 1).single();
    const { data: open } = await db().from("matches").select("id").eq("stage_id", prev!.id).not("status", "in", "(done,walkover,cancelled)").limit(1);
    if (open?.length) throw new HttpError(409, "Finish the previous stage first");
  }
  await db().from("matches").delete().eq("stage_id", st.id);
  await db().from("ties").delete().eq("stage_id", st.id);
  await db().from("groups").delete().eq("stage_id", st.id);
  const list = await participants(st);
  if (list.length < 2) throw new HttpError(409, "Need at least two confirmed entries");
  const map = new Map(list.map((e) => [e.id, e]));
  const ids = list.map((e) => e.id);
  const playersOf = () => list.map((e) => e.player1_id!).filter(Boolean);
  let created = 0;

  switch (st.kind) {
    case "single_elim": { const r = singleElim(ids, { bronze: !!st.config.bronze }); created = (await insertSpecs(st, r.matches, r.links, map)).length; break; }
    case "double_elim": { const r = doubleElim(ids, { reset: !!st.config.reset }); created = (await insertSpecs(st, r.matches, r.links, map)).length; break; }
    case "compass": { const r = compass(ids); created = (await insertSpecs(st, r.matches, r.links, map)).length; break; }
    case "consolation": { const r = consolation(ids); created = (await insertSpecs(st, r.matches, r.links, map)).length; break; }
    case "round_robin": {
      const size = st.config.boxSize as number | undefined;
      const nGroups = size ? Math.max(1, Math.ceil(ids.length / size)) : Math.max(1, Math.min(st.config.groups ?? 1, Math.floor(ids.length / 2)));
      const buckets: string[][] = Array.from({ length: nGroups }, () => []);
      ids.forEach((id, i) => { const row = Math.floor(i / nGroups), col = i % nGroups; buckets[size ? Math.floor(i / size) : row % 2 ? nGroups - 1 - col : col].push(id); });
      for (const [gi, members] of buckets.entries()) {
        const name = nGroups === 1 ? (st.config.labels ?? "Round robin") : `${st.config.labels ?? "Pool"} ${String.fromCharCode(65 + gi)}`;
        const { data: g } = await db().from("groups").insert({ category_id: st.category_id, stage_id: st.id, name, sort: gi }).select("id").single();
        await db().from("group_members").insert(members.map((e) => ({ group_id: g!.id, entry_id: e })));
        const specs: Spec[] = roundRobinPairs(members, !!st.config.double).map((m, k) => ({ key: `g${gi}m${k}`, bracket: "P", round: m.round, position: k + 1, label: name, a: { e: m.a }, b: { e: m.b } }));
        created += (await insertSpecs(st, specs, new Map(), map, () => ({ group_id: g!.id }))).length;
      }
      break;
    }
    case "ladder":
      await db().from("stages").update({ state: { ladder: ids }, status: "active" }).eq("id", st.id);
      return { created: 0, ladder: ids.length };
    case "team_ties": return generateTeamStage(st, list);
    default: {
      if (!ROUND_BASED.includes(st.kind)) throw new HttpError(400, "Unsupported stage");
      const individual = INDIVIDUAL.includes(st.kind);
      const roster = individual ? playersOf() : ids;
      await db().from("stages").update({ state: { roster, round: 0, byes: [] }, status: "active" }).eq("id", st.id);
      return nextRound(st.id);
    }
  }
  await db().from("stages").update({ status: "active" }).eq("id", st.id);
  return { created };
}

/** Next round for Swiss, King of the Court, Shootout, rotating, Americano, Mexicano and team knockouts. */
export async function nextRound(stageId: string) {
  const st = await stageById(stageId);
  const ms = await stageMatches(st.id);
  const round = Math.max(0, ...ms.map((m) => m.round_no ?? 0));
  if (ms.some((m) => m.round_no === round && !["done", "walkover", "cancelled"].includes(m.status))) throw new HttpError(409, `Finish round ${round} first`);
  if (st.config.rounds && round >= st.config.rounds) throw new HttpError(409, "All rounds are played");
  const cat = await category(st.category_id);
  const courts = Math.max(1, Math.min(st.config.courts ?? cat.tournament.courts ?? 4, 64));
  const last = ms.filter((m) => m.round_no === round);
  const roster: string[] = st.state.roster ?? [];
  const r = round + 1;
  const entries = new Map((await confirmedEntries(st.category_id)).map((e) => [e.id, e]));
  let specs: Spec[] = [];
  const res = (m: MatchRow): Result => ({ a: m.side_a, b: m.side_b, winner: m.winner, games: m.games, court: m.court_no, round: m.round_no });
  const done = ms.filter((m) => m.winner !== null);

  if (st.kind === "team_ties") return nextTeamRound(st, ms);
  if (st.kind === "swiss") {
    const byes = new Set<string>(st.state.byes ?? []);
    const results: Result[] = done.map((m) => ({ a: [m.entry_a!], b: [m.entry_b!], winner: m.winner, games: m.games }));
    for (const b of byes) results.push({ a: [b], b: ["__bye"], winner: 0, games: [] });
    const { pairs, bye } = swissRound(roster, results, byes);
    specs = pairs.map(([a, b], i) => ({ key: `s${r}m${i + 1}`, bracket: "S", round: r, position: i + 1, label: `Swiss round ${r}`, a: { e: a }, b: { e: b } }));
    if (bye) await db().from("stages").update({ state: { ...st.state, byes: [...byes, bye] } }).eq("id", st.id);
  } else if (st.kind === "king_court") {
    const pairs = round === 0
      ? Array.from({ length: Math.min(courts, Math.floor(roster.length / 2)) }, (_, c) => ({ court: c + 1, a: roster[c * 2], b: roster[c * 2 + 1] }))
      : kingCourtRound(last.map((m) => ({ court: m.court_no!, a: m.entry_a!, b: m.entry_b!, winner: m.winner! })), last.length);
    specs = pairs.map((p) => ({ key: `k${r}c${p.court}`, bracket: `C${p.court}`, round: r, position: p.court, court: p.court, label: `Round ${r}, Court ${p.court}`, a: { e: p.a }, b: { e: p.b } }));
  } else {
    let games: { court: number; a: string[]; b: string[] }[];
    if (st.kind === "shootout" && round > 0) games = shootoutRound(last.map((m) => ({ court: m.court_no!, a: m.side_a, b: m.side_b, winner: m.winner! })), last.length);
    else if (st.kind === "shootout") games = Array.from({ length: Math.min(courts, Math.floor(roster.length / 4)) }, (_, c) => ({ court: c + 1, a: [roster[c * 4], roster[c * 4 + 3]], b: [roster[c * 4 + 1], roster[c * 4 + 2]] }));
    else if (st.kind === "mexicano") games = mexicanoRound(roster, done.map(res), courts).courts;
    else games = rotatingRound(roster, ms.map((m) => ({ a: m.side_a, b: m.side_b })), courts, 17, !!st.config.random).courts;
    // individual formats: no entry per side, the players are the sides
    specs = games.map((g) => ({ key: `x${r}c${g.court}`, bracket: `C${g.court}`, round: r, position: g.court, court: g.court, label: `Round ${r}, Court ${g.court}`, a: { e: null }, b: { e: null }, sideA: g.a, sideB: g.b }));
  }
  const rows = await insertSpecs(st, specs, new Map(), entries);
  await db().from("stages").update({ state: { ...st.state, round: r } }).eq("id", st.id);
  return { round: r, created: rows.length };
}

// ---------------------------------------------------------------- team ties
async function createTie(st: Stage, a: Entry, b: Entry, round: number, label: string) {
  const cat = await category(st.category_id);
  const { data: tie, error } = await db().from("ties").insert({ tournament_id: cat.tournament.id, stage_id: st.id, team_a: a.team_id, team_b: b.team_id, round: label }).select("id").single();
  if (error) throw error;
  const events: string[] = st.config.events ?? ["Doubles"];
  const specs: Spec[] = events.map((ev, i) => ({ key: `t${tie.id.slice(0, 6)}e${i + 1}`, bracket: "T", round, position: i + 1, label: `${label}: ${ev}`, event: ev, a: { e: a.id }, b: { e: b.id }, sideA: [], sideB: [] }));
  await insertSpecs(st, specs, new Map(), new Map(), () => ({ tie_id: tie.id }));
  return tie.id as string;
}

async function generateTeamStage(st: Stage, teams: Entry[]) {
  if (teams.some((t) => !t.team_id)) throw new HttpError(409, "Every entry in a team format must be a team");
  let ties = 0;
  if (st.config.knockout) {
    const r = singleElim(teams.map((t) => t.id));
    const byId = new Map(teams.map((t) => [t.id, t]));
    const firstRound = r.matches.filter((m) => "e" in m.a && "e" in m.b && m.a.e && m.b.e);
    const advanced = teams.filter((t) => !firstRound.some((m) => ("e" in m.a && m.a.e === t.id) || ("e" in m.b && m.b.e === t.id))).map((t) => t.id);
    for (const m of firstRound) { await createTie(st, byId.get((m.a as any).e)!, byId.get((m.b as any).e)!, 1, m.label); ties++; }
    await db().from("stages").update({ state: { byes: advanced, round: 1 }, status: "active" }).eq("id", st.id);
    return { ties };
  }
  const groups = Math.max(1, st.config.groups ?? 1);
  const buckets: Entry[][] = Array.from({ length: groups }, () => []);
  teams.forEach((t, i) => buckets[Math.floor(i / groups) % 2 ? groups - 1 - (i % groups) : i % groups].push(t));
  for (const [gi, b] of buckets.entries())
    for (const m of roundRobinPairs(b)) { await createTie(st, m.a, m.b, m.round, `${groups > 1 ? `Pool ${String.fromCharCode(65 + gi)}, ` : ""}Round ${m.round}`); ties++; }
  await db().from("stages").update({ status: "active" }).eq("id", st.id);
  return { ties };
}

async function nextTeamRound(st: Stage, ms: MatchRow[]) {
  if (!st.config.knockout) throw new HttpError(409, "Round robin ties are all scheduled already");
  const { data: ties } = await db().from("ties").select("id, round, winner_team, team_a, team_b").eq("stage_id", st.id);
  const round = st.state.round ?? 1;
  const cur = (ties ?? []).filter((t) => ms.some((m) => m.tie_id === t.id && m.round_no === round));
  if (cur.some((t) => !t.winner_team)) throw new HttpError(409, "Finish every tie in this round first");
  const entries = await confirmedEntries(st.category_id);
  const byTeam = new Map(entries.map((e) => [e.team_id!, e]));
  const advancing = [...cur.map((t) => byTeam.get(t.winner_team)!.id), ...(st.state.byes ?? [])];
  if (advancing.length < 2) { await db().from("stages").update({ status: "done" }).eq("id", st.id); return { champion: advancing[0] ?? null }; }
  const byId = new Map(entries.map((e) => [e.id, e]));
  const label = advancing.length === 2 ? "Final" : advancing.length === 4 ? "Semi-final" : `Round of ${advancing.length}`;
  for (let i = 0; i + 1 < advancing.length; i += 2) await createTie(st, byId.get(advancing[i])!, byId.get(advancing[i + 1])!, round + 1, label);
  await db().from("stages").update({ state: { ...st.state, round: round + 1, byes: advancing.length % 2 ? [advancing.at(-1)] : [] } }).eq("id", st.id);
  return { round: round + 1 };
}

/** Copy owners' submitted lineups onto the tie's matches (event order). */
export async function applyLineups(tieId: string) {
  const { data: t } = await db().from("ties").select("lineup_a, lineup_b").eq("id", tieId).single();
  if (!t) return;
  const { data: ms } = await db().from("matches").select("id, event, status").eq("tie_id", tieId);
  for (const m of ms ?? []) {
    if (m.status !== "upcoming") continue;
    const a = (t.lineup_a ?? []).find((l: any) => l.event === m.event)?.players, b = (t.lineup_b ?? []).find((l: any) => l.event === m.event)?.players;
    await db().from("matches").update({ ...(a && { side_a: a }), ...(b && { side_b: b }) }).eq("id", m.id);
  }
}

/** Called after any match locks: decide ties (and DreamBreakers), update ladders, close finished stages. */
export async function onMatchLocked(matchId: string) {
  const { data: m } = await db().from("matches").select("*").eq("id", matchId).single();
  if (!m?.stage_id) return;
  const st = await stageById(m.stage_id);
  if (m.tie_id) {
    const { data: tm } = await db().from("matches").select("event, winner, status, entry_a, entry_b, side_a, side_b").eq("tie_id", m.tie_id);
    const all = tm ?? [];
    const db_ = all.find((x) => x.event === "DreamBreaker");
    const open = all.filter((x) => !["done", "walkover"].includes(x.status));
    if (!open.length) {
      const wins = [0, 0];
      all.filter((x) => x.event !== "DreamBreaker").forEach((x) => { if (x.winner !== null) wins[x.winner]++; });
      let winSide: 0 | 1 | null = wins[0] > wins[1] ? 0 : wins[1] > wins[0] ? 1 : null;
      if (winSide === null && db_?.winner != null) winSide = db_.winner;
      const { data: tie } = await db().from("ties").select("team_a, team_b").eq("id", m.tie_id).single();
      if (winSide !== null && tie) await db().from("ties").update({ winner_team: winSide === 0 ? tie.team_a : tie.team_b }).eq("id", m.tie_id);
      else if (st.config.dreambreaker && !db_) {
        const first = all[0];
        await db().from("matches").insert({
          code: `${m.code.split("-").slice(0, 2).join("-")}-db-${m.tie_id.slice(0, 6)}`, tournament_id: m.tournament_id, category_id: m.category_id, stage_id: st.id,
          tie_id: m.tie_id, stage: `${m.stage.split(":")[0]}: DreamBreaker`, event: "DreamBreaker", bracket: "T", round_no: m.round_no, position: 99,
          entry_a: first.entry_a, entry_b: first.entry_b, side_a: [...new Set(all.flatMap((x) => x.side_a))], side_b: [...new Set(all.flatMap((x) => x.side_b))],
          scoring: "rally", points_to: 21, best_of: 1, win_by: 2, freeze_at: 20, doubles: false, court_no: m.court_no, scheduled_at: m.scheduled_at,
        });
      }
    }
  }
  if (st.kind === "ladder" && m.entry_a && m.entry_b && m.winner !== null) {
    // entry_a is always the challenger
    const order = ladderAfter(st.state.ladder ?? [], m.entry_a, m.entry_b, m.winner === 0);
    await db().from("stages").update({ state: { ...st.state, ladder: order } }).eq("id", st.id);
  }
  const { data: open } = await db().from("matches").select("id").eq("stage_id", st.id).not("status", "in", "(done,walkover,cancelled)").limit(1);
  const roundsLeft = st.config.rounds && (st.state.round ?? 0) < st.config.rounds;
  if (!open?.length && !roundsLeft && st.kind !== "ladder" && !(st.kind === "team_ties" && st.config.knockout)) await db().from("stages").update({ status: "done" }).eq("id", st.id);
}

export async function ladderChallenge(stageId: string, challenger: string, defender: string) {
  const st = await stageById(stageId);
  if (st.kind !== "ladder") throw new HttpError(400, "Not a ladder");
  if (!canChallenge(st.state.ladder ?? [], challenger, defender, st.config.reach ?? 3)) throw new HttpError(409, `You can challenge up to ${st.config.reach ?? 3} places above`);
  const entries = new Map((await confirmedEntries(st.category_id)).map((e) => [e.id, e]));
  const n = (await stageMatches(st.id)).length + 1;
  const spec: Spec = { key: `ch${n}`, bracket: "LAD", round: n, position: 1, label: `Ladder challenge ${n}`, a: { e: challenger }, b: { e: defender } };
  return (await insertSpecs(st, [spec], new Map(), entries))[0];
}

// ---------------------------------------------------------------- standings
export type StandingRow = { id: string; name: string; played: number; won: number; lost: number; gf: number; ga: number; pf: number; pa: number; pts: number; extra?: string };

export async function standings(stageId: string): Promise<{ kind: StageKind; groups: { name: string; rows: StandingRow[] }[] }> {
  const st = await stageById(stageId);
  const ms = (await stageMatches(st.id)).filter((m) => m.winner !== null);
  const ppw = 2;
  const entries = await confirmedEntries(st.category_id);
  const ename = new Map(entries.map((e) => [e.id, e.display_name]));
  const name = async (ids: string[], players: boolean) => {
    if (!players) return (id: string) => ename.get(id) ?? "TBC";
    const { data } = await db().from("players").select("id, full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const m = new Map((data ?? []).map((p) => [p.id, p.full_name]));
    return (id: string) => m.get(id) ?? "Player";
  };
  if (INDIVIDUAL.includes(st.kind)) {
    const roster: string[] = st.state.roster ?? [];
    const rows = tally(roster, ms.map((m) => ({ a: m.side_a, b: m.side_b, winner: m.winner, games: m.games })), ppw, true);
    if (st.kind === "americano" || st.kind === "mexicano") rows.sort((a, b) => b.pf - a.pf || b.won - a.won);
    const nm = await name(roster, true);
    return { kind: st.kind, groups: [{ name: st.name, rows: rows.map((r) => ({ ...r, name: nm(r.id) })) }] };
  }
  if (st.kind === "team_ties") {
    const { data: ties } = await db().from("ties").select("team_a, team_b, winner_team").eq("stage_id", st.id);
    const inStage = new Set((ties ?? []).flatMap((t) => [t.team_a, t.team_b]));
    const teamEntries = entries.filter((e) => e.team_id && inStage.has(e.team_id));
    const rows = teamEntries.map((e) => {
      const mine = (ties ?? []).filter((t) => t.winner_team && (t.team_a === e.team_id || t.team_b === e.team_id));
      const won = mine.filter((t) => t.winner_team === e.team_id).length;
      const games = ms.filter((m) => (m.entry_a === e.id || m.entry_b === e.id) && m.event !== "DreamBreaker");
      const gf = games.filter((m) => (m.entry_a === e.id ? 0 : 1) === m.winner).length;
      return { id: e.id, name: e.display_name, played: mine.length, won, lost: mine.length - won, gf, ga: games.length - gf, pf: 0, pa: 0, pts: won * ppw };
    }).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
    return { kind: st.kind, groups: [{ name: st.name, rows }] };
  }
  if (st.kind === "ladder") {
    const order: string[] = st.state.ladder ?? [];
    const t = new Map(tally(order, ms.map((m) => ({ a: [m.entry_a!], b: [m.entry_b!], winner: m.winner, games: m.games })), ppw).map((r) => [r.id, r]));
    return { kind: st.kind, groups: [{ name: "Ladder", rows: order.map((id, i) => ({ ...t.get(id)!, name: ename.get(id) ?? "", extra: `#${i + 1}` })) }] };
  }
  if (st.kind === "round_robin") {
    const { data: groups } = await db().from("groups").select("id, name, group_members(entry_id)").eq("stage_id", st.id).order("sort");
    return {
      kind: st.kind,
      groups: (groups ?? []).map((g) => {
        const ids = g.group_members.map((x: { entry_id: string }) => x.entry_id);
        const res = ms.filter((m) => m.group_id === g.id).map((m) => ({ a: [m.entry_a!], b: [m.entry_b!], winner: m.winner, games: m.games }));
        const rows = tally(ids, res, ppw);
        // head-to-head between two teams level on points
        rows.sort((x, y) => {
          if (y.pts !== x.pts) return y.pts - x.pts;
          const h = res.find((r) => [r.a[0], r.b[0]].sort().join() === [x.id, y.id].sort().join());
          if (h && h.winner !== null) return (h.winner === 0 ? h.a[0] : h.b[0]) === x.id ? -1 : 1;
          return (y.gf - y.ga) - (x.gf - x.ga) || (y.pf - y.pa) - (x.pf - x.pa);
        });
        return { name: g.name, rows: rows.map((r) => ({ ...r, name: ename.get(r.id) ?? "" })) };
      }),
    };
  }
  // brackets, swiss, king of the court
  const ids = [...new Set(ms.flatMap((m) => [m.entry_a, m.entry_b]).filter(Boolean) as string[])];
  const rows = tally(ids, ms.map((m) => ({ a: [m.entry_a!], b: [m.entry_b!], winner: m.winner, games: m.games })), ppw);
  if (st.kind === "king_court") {
    const lastRound = Math.max(0, ...ms.map((m) => m.round_no ?? 0));
    const court = new Map(ms.filter((m) => m.round_no === lastRound).flatMap((m) => [[m.entry_a!, m.court_no ?? 99], [m.entry_b!, m.court_no ?? 99]] as [string, number][]));
    rows.sort((a, b) => b.won - a.won || (court.get(a.id) ?? 99) - (court.get(b.id) ?? 99) || (b.pf - b.pa) - (a.pf - a.pa));
  }
  return { kind: st.kind, groups: [{ name: st.name, rows: rows.map((r) => ({ ...r, name: ename.get(r.id) ?? "" })) }] };
}

export { resolve };
