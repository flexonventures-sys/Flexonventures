// POST /api/matches/:code/action
//   { action: "start" }                         organiser opens scoring for that court
//   { action: "move", time: "3:00 PM", court }  reschedule; lineup window moves, everyone alerted
//   { action: "walkover", winner: 0|1 }
//   { action: "lock", games }                   referee/organiser confirms; stats + bracket update
//   { action: "reopen" }                        organiser correction, logged
// Proposal sections 5, 8, 10, 11; walkthrough pages 13, 22, 23.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { clock, formatOf, matchByCode, rallyLog, type MatchRow } from "@/lib/data";
import { replay, validGames } from "@/lib/scoring";
import { db } from "@/lib/supabase";
import { audit, requireScorer, requireStaff } from "@/lib/session";
import { alertFollowers } from "@/lib/notify";
import { onMatchLocked } from "@/lib/formats/engine";

const Game = z.tuple([z.number().int().min(0), z.number().int().min(0)]);
const In = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("move"), time: z.string().regex(/^\d{1,2}:\d{2} ?(AM|PM)$/i), court: z.number().int().min(1), date: z.string().optional() }),
  z.object({ action: z.literal("walkover"), winner: z.union([z.literal(0), z.literal(1)]) }),
  z.object({ action: z.literal("lock"), games: z.array(Game).optional() }),
  z.object({ action: z.literal("reopen") }),
]);

/** "3:00 PM" on the match's current IST date -> ISO timestamp */
function istAt(base: string | null, time: string, date?: string) {
  const day = date ?? (base ? new Date(base).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : new Date().toISOString().slice(0, 10));
  const [, h, mm, ap] = time.match(/^(\d{1,2}):(\d{2}) ?(AM|PM)$/i)!;
  const H = (+h % 12) + (ap.toUpperCase() === "PM" ? 12 : 0);
  return new Date(`${day}T${String(H).padStart(2, "0")}:${mm}:00+05:30`).toISOString();
}

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const i = await body(req, In);
  const m = await matchByCode((await ctx.params).code);
  const href = `/#/match/${m.code}`;

  if (i.action === "lock") {
    const who = await requireScorer(m);
    const f = formatOf(m);
    const s = replay(f, await rallyLog(m.id));
    // Live-scored matches lock from the rally log; organisers may enter games by hand.
    const games = s.done ? s.games : i.games;
    if (!games || !validGames(f, games)) throw new HttpError(409, "The match is not finished yet");
    const { error } = await db().rpc("lock_match", { p_match: m.id, p_games: games });
    if (error) throw error;
    await db().from("rally_events").insert({ match_id: m.id, seq: 100000 + Date.now() % 100000, kind: "lock", by_label: who.label });
    await audit(who.actor, "match.lock", "match", m.code, { games, by: who.label });
    await maybeChampion(m);
    await onMatchLocked(m.id);
    await alertFollowers({ matchId: m.id, categoryId: m.category_id, tournamentId: m.tournament_id }, { kind: "result", title: `Result: ${m.stage}`, body: games.map((g) => g.join("–")).join(", "), href });
    return ok({ locked: true, games });
  }

  const staff = await requireStaff();
  if (i.action === "start") {
    if (m.status !== "upcoming") throw new HttpError(409, "Only scheduled matches can be started");
    const { data: busy } = await db().from("matches").select("code").eq("tournament_id", m.tournament_id).eq("court_no", m.court_no ?? -1).eq("status", "live").limit(1);
    if (busy?.length) throw new HttpError(409, `Court ${m.court_no} already has a live match (${busy[0].code})`);
    await db().from("matches").update({ status: "live", started_at: new Date().toISOString() }).eq("id", m.id);
    await db().from("rally_events").insert({ match_id: m.id, seq: 0, kind: "start", by_label: staff.name });
    await audit(staff.profileId, "match.start", "match", m.code);
    return ok({ status: "live" });
  }
  if (i.action === "move") {
    if (m.status === "done") throw new HttpError(409, "Completed matches cannot be moved");
    const at = istAt(m.scheduled_at, i.time, i.date);
    await db().from("matches").update({ scheduled_at: at, court_no: i.court }).eq("id", m.id);
    // League: the tie (and so the 30-minute lineup window) moves with its match.
    if (m.tie_id) await db().from("ties").update({ scheduled_at: at, court_no: i.court }).eq("id", m.tie_id);
    await audit(staff.profileId, "match.move", "match", m.code, { from: { at: m.scheduled_at, court: m.court_no }, to: { at, court: i.court } });
    const changed = m.court_no !== i.court ? (m.scheduled_at !== at ? "Time and court change" : "Court change") : "Schedule change";
    await alertFollowers({ matchId: m.id, categoryId: m.category_id, tournamentId: m.tournament_id },
      { kind: m.court_no !== i.court ? "court_change" : "schedule_change", title: `${m.stage} moved to ${clock(at)}, Court ${i.court}`, body: changed, href });
    return ok({ at, court: i.court });
  }
  if (i.action === "walkover") {
    const f = formatOf(m), need = Math.ceil(f.bo / 2);
    const games = Array.from({ length: need }, () => (i.winner ? [0, f.to] : [f.to, 0]) as [number, number]);
    const { error } = await db().rpc("lock_match", { p_match: m.id, p_games: games });
    if (error) throw error;
    await db().from("matches").update({ status: "walkover" }).eq("id", m.id);
    await onMatchLocked(m.id);
    await audit(staff.profileId, "match.walkover", "match", m.code, { winner: i.winner });
    await alertFollowers({ matchId: m.id, tournamentId: m.tournament_id }, { kind: "result", title: `Walkover: ${m.stage}`, href });
    return ok({ status: "walkover" });
  }
  // reopen
  const { error } = await db().rpc("reopen_match", { p_match: m.id });
  if (error) throw error;
  await audit(staff.profileId, "match.reopen", "match", m.code, { previous: m.games });
  return ok({ status: "live" });
});

/** Final locked -> store the champion permanently and bump titles. */
async function maybeChampion(m: MatchRow) {
  if (!/^final$/i.test(m.stage) || !m.category_id) return;
  const { data } = await db().from("matches").select("winner, side_a, side_b, categories(name)").eq("id", m.id).single();
  if (!data || data.winner === null) return;
  const winners: string[] = data.winner === 0 ? data.side_a : data.side_b;
  const cat = Array.isArray(data.categories) ? data.categories[0] : data.categories;
  await db().from("champions").upsert({ tournament_id: m.tournament_id, category: cat?.name ?? m.stage, player_ids: winners }, { onConflict: "tournament_id,category" });
  for (const id of winners) {
    const { data: p } = await db().from("players").select("titles").eq("id", id).single();
    await db().from("players").update({ titles: (p?.titles ?? 0) + 1 }).eq("id", id);
  }
}
