// POST /api/matches/:code/events  { kind: "rally"|"undo"|"timeout", winner?, side?, clientId }
// Referee tap scoring. Each rally is stored on its own; undo voids the last rally (never deletes);
// clientId makes offline replays idempotent (proposal sections 9, 10).
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { formatOf, matchByCode, rallyLog } from "@/lib/data";
import { replay, scoreCall } from "@/lib/scoring";
import { db } from "@/lib/supabase";
import { requireScorer } from "@/lib/session";

const In = z.object({
  kind: z.enum(["rally", "undo", "timeout"]),
  winner: z.union([z.literal(0), z.literal(1)]).optional(),
  side: z.union([z.literal(0), z.literal(1)]).optional(),
  clientId: z.string().max(64).optional(),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const i = await body(req, In);
  const m = await matchByCode((await ctx.params).code);
  const who = await requireScorer(m);
  if (m.status !== "live") throw new HttpError(409, "Only live matches can be scored");

  if (i.clientId) {
    const { data: dup } = await db().from("rally_events").select("id").eq("match_id", m.id).eq("client_id", i.clientId).maybeSingle();
    if (dup) return ok({ duplicate: true });
  }
  const { data: last } = await db().from("rally_events").select("seq").eq("match_id", m.id).order("seq", { ascending: false }).limit(1).maybeSingle();
  const seq = (last?.seq ?? 0) + 1;
  const started = m.scheduled_at ? Date.now() - new Date(m.scheduled_at).getTime() : 0;
  const tOffset = Math.max(0, Math.round(started / 600) / 100); // minutes, 2dp

  if (i.kind === "rally") {
    if (i.winner === undefined) throw new HttpError(400, "Which side won the rally?");
    const f = formatOf(m);
    if (replay(f, await rallyLog(m.id)).done) throw new HttpError(409, "Match is over. Confirm the result.");
    const { error } = await db().from("rally_events").insert({ match_id: m.id, seq, kind: "rally", winner: i.winner, t_offset: tOffset, client_id: i.clientId, by_label: who.label });
    if (error?.code === "23505") return ok({ duplicate: true });
    if (error) throw error;
  } else if (i.kind === "undo") {
    const { data: lastRally } = await db().from("rally_events").select("id").eq("match_id", m.id).eq("kind", "rally").is("voided_at", null)
      .order("seq", { ascending: false }).limit(1).maybeSingle();
    if (lastRally) await db().from("rally_events").update({ voided_at: new Date().toISOString() }).eq("id", lastRally.id);
    // the undo itself is logged as a correction event for the audit trail
    await db().from("rally_events").insert({ match_id: m.id, seq, kind: "correction", client_id: i.clientId, by_label: who.label, t_offset: tOffset });
  } else {
    await db().from("rally_events").insert({ match_id: m.id, seq, kind: "timeout", side: i.side ?? 0, client_id: i.clientId, by_label: who.label, t_offset: tOffset });
  }

  const f = formatOf(m);
  const s = replay(f, await rallyLog(m.id));
  return ok({ state: s, call: scoreCall(f, s) });
});
