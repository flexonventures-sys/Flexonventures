// POST /api/owner/lineup { tie, lineup: [{ event, players: [id, id] }] }
// Eligible squad players per match (two for doubles, one for singles), only inside the window (30 min before start until start).
// The database function enforces the window and ownership again; the opponent cannot read it early.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db, userClient } from "@/lib/supabase";
import { myTeam } from "@/lib/owner";
import { lineupWindow } from "@/lib/draw";
import { applyLineups } from "@/lib/formats/engine";

const In = z.object({
  tie: z.string().uuid(),
  lineup: z.array(z.object({ event: z.string(), players: z.array(z.string().uuid()).min(1).max(2) })).min(1),
});

export const POST = route(async (req: Request) => {
  const { team, tournament } = await myTeam();
  const i = await body(req, In);
  const { data: tie } = await db().from("ties").select("id, team_a, team_b, scheduled_at").eq("id", i.tie).maybeSingle();
  if (!tie || (tie.team_a !== team.id && tie.team_b !== team.id)) throw new HttpError(404, "Tie not found");
  const w = lineupWindow(new Date(tie.scheduled_at));
  const now = Date.now();
  if (now < w.opens.getTime()) throw new HttpError(409, `Lineup window opens at ${w.opens.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}`);
  if (now >= w.closes.getTime()) throw new HttpError(409, "The tie has started. Ask the organiser to reschedule.");

  const { data: evs } = await db().from("matches").select("event").eq("tie_id", i.tie).neq("event", "DreamBreaker");
  const events: string[] = evs?.length ? evs.map((e) => e.event as string) : tournament.tie_events?.length ? tournament.tie_events : ["Doubles"];
  if (i.lineup.length !== events.length || !events.every((e: string) => i.lineup.some((l) => l.event === e))) throw new HttpError(400, "Fill every match in the tie");
  const { data: squad } = await db().from("team_players").select("player_id, players(gender)").eq("team_id", team.id);
  const gender = new Map((squad ?? []).map((s) => [s.player_id, (Array.isArray(s.players) ? s.players[0] : s.players)?.gender]));
  for (const l of i.lineup) {
    const need = /singles/i.test(l.event) ? 1 : 2;
    if (l.players.length !== need) throw new HttpError(400, `${l.event}: pick ${need} player${need > 1 ? "s" : ""}`);
    if (l.players[0] === l.players[1]) throw new HttpError(400, `${l.event}: pick two different players`);
    for (const p of l.players) if (!gender.has(p)) throw new HttpError(400, `${l.event}: player is not in your squad`);
    const g = l.players.map((p) => gender.get(p));
    if (/^men/i.test(l.event) && g.some((x) => x !== "M")) throw new HttpError(400, `${l.event}: men only`);
    if (/^women/i.test(l.event) && g.some((x) => x !== "F")) throw new HttpError(400, `${l.event}: women only`);
    if (/mixed/i.test(l.event) && !(g.includes("M") && g.includes("F"))) throw new HttpError(400, `${l.event}: one man and one woman`);
  }
  const sb = await userClient();
  const { error } = await sb.rpc("submit_lineup", { p_tie: i.tie, p_lineup: i.lineup });
  if (error) throw new HttpError(409, error.message);
  await applyLineups(i.tie);
  return ok({ submitted: true });
});
