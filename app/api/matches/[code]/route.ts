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
  const ids = [m.entry_a, m.entry_b].filter(Boolean) as string[];
  const [{ data: es }, { data: ps }] = await Promise.all([
    db().from("entries").select("id, display_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db().from("players").select("id, full_name").in("id", [...m.side_a, ...m.side_b].length ? [...m.side_a, ...m.side_b] : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const en = new Map((es ?? []).map((e) => [e.id, e.display_name as string])), pn = new Map((ps ?? []).map((p) => [p.id, p.full_name as string]));
  const nm = (entry: string | null, side: string[]) => (side.length ? side.map((id) => pn.get(id) ?? "").join(" / ") : entry ? en.get(entry) ?? "TBC" : "TBC");
  return ok({
    names: [nm(m.entry_a, m.side_a), nm(m.entry_b, m.side_b)], title: m.stage,
    id: m.code, status: m.status, court: m.court_no, games: m.status === "live" ? s.games : m.games,
    log: log.map(({ w, t }) => ({ w, t })), state: s, call: scoreCall(f, s), stream: court?.stream_url ?? null,
  });
});
