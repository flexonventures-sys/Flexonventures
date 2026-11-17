// GET /api/matches/:code  -> match with replayed live state and rally feed (match centre)
import { ok, route } from "@/lib/http";
import { formatOf, matchByCode, rallyLog } from "@/lib/data";
import { replay, scoreCall } from "@/lib/scoring";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const m = await matchByCode((await ctx.params).code);
  const log = await rallyLog(m.id);
  const f = formatOf(m);
  const s = replay(f, log);
  const { data: court } = await db().from("public_courts").select("stream_url, referee_name").eq("tournament_id", m.tournament_id).eq("number", m.court_no ?? 0).maybeSingle();
  return ok({
    id: m.code, status: m.status, court: m.court_no, games: m.status === "live" ? s.games : m.games,
    log: log.map(({ w, t }) => ({ w, t })), state: s, call: scoreCall(f, s), stream: court?.stream_url ?? null,
  });
});
