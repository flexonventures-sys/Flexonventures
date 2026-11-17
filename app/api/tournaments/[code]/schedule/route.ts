// POST /api/tournaments/:code/schedule { date, start: "09:00", minutes?, categories? }
// Auto schedule from first match time, match length and courts; any slot can then be moved
// with /api/matches/:code/action { action: "move" }. Walkthrough page 19.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { schedule } from "@/lib/draw";

const In = z.object({
  date: z.string().date(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  minutes: z.number().int().min(10).max(120).optional(),
  categories: z.array(z.string()).optional(),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const staff = await requireStaff();
  const code = (await ctx.params).code;
  const i = await body(req, In);
  const { data: t } = await db().from("tournaments").select("id, courts").eq("code", code).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  let cq = db().from("categories").select("id, name, match_minutes").eq("tournament_id", t.id);
  if (i.categories?.length) cq = cq.in("name", i.categories);
  const { data: cats } = await cq;
  const minutes = i.minutes ?? Math.max(...(cats ?? []).map((c) => c.match_minutes ?? 30), 30);
  const { data: ms } = await db().from("matches").select("id, round_no, side_a, side_b, entry_a, entry_b")
    .in("category_id", (cats ?? []).map((c) => c.id)).eq("status", "upcoming").order("round_no").order("code");
  // Unknown knockout slots (winners TBC) are scheduled after group play and block no one.
  const list = (ms ?? []).map((m) => ({ id: m.id, players: [...m.side_a, ...m.side_b, m.entry_a, m.entry_b].filter(Boolean) as string[] }));
  const out = schedule(list, new Date(`${i.date}T${i.start}:00+05:30`), minutes, t.courts);
  await Promise.all(out.map((m) => db().from("matches").update({ scheduled_at: m.at.toISOString(), court_no: m.court }).eq("id", m.id)));
  await audit(staff.profileId, "schedule.generate", "tournament", code, { matches: out.length, minutes });
  return ok({ scheduled: out.length, last: out.at(-1)?.at ?? null });
});
