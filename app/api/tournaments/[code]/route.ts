// GET   /api/tournaments/:code   overview, categories, schedule, standings, bracket, rules
// PATCH /api/tournaments/:code   { advance: true } next progress step | edit details / form after publishing
// Six steps: Published, Entries open, Close entries, Make the draw, Publish the schedule, Results.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { alertFollowers } from "@/lib/notify";
import { STEPS, standings } from "@/lib/standings";

export const dynamic = "force-dynamic";
export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const code = (await ctx.params).code;
  const { data: t } = await db().from("tournaments").select("*, venues(name, address)").eq("code", code).neq("status", "draft").maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const [cats, groups, matches, counts, champs] = await Promise.all([
    db().from("categories").select("id, name, kind, stage, group_count, advance, scoring, points_to, best_of, capacity").eq("tournament_id", t.id).order("sort"),
    db().from("groups").select("id, name, category_id").in("category_id", (await db().from("categories").select("id").eq("tournament_id", t.id)).data?.map((c) => c.id) ?? []),
    db().from("matches").select("code, stage, round_no, court_no, scheduled_at, status, games, winner, category_id, group_id, next_match").eq("tournament_id", t.id).order("scheduled_at"),
    db().from("entries").select("category_id, status").eq("tournament_id", t.id).in("status", ["confirmed", "review"]),
    db().from("champions").select("category, player_ids").eq("tournament_id", t.id),
  ]);
  const taken = new Map<string, number>();
  for (const e of counts.data ?? []) taken.set(e.category_id, (taken.get(e.category_id) ?? 0) + 1);
  const table = await Promise.all((groups.data ?? []).map(async (g) => ({ ...g, rows: await standings(g.id) })));
  const ko = (matches.data ?? []).filter((m) => !m.group_id);
  return ok({
    tournament: { ...t, form_fields: t.form_fields, steps: STEPS },
    categories: (cats.data ?? []).map((c) => ({ ...c, taken: taken.get(c.id) ?? 0 })),
    schedule: matches.data ?? [], standings: table, bracket: ko, champions: champs.data ?? [],
  });
});

const In = z.object({
  advance: z.boolean().optional(),
  name: z.string().min(3).max(80).optional(),
  start_date: z.string().date().optional(), end_date: z.string().date().optional(),
  courts: z.number().int().min(1).optional(),
  reg_open: z.string().date().nullable().optional(), reg_close: z.string().date().nullable().optional(),
  approval: z.enum(["auto", "manual"]).optional(), when_full: z.enum(["waitlist", "close"]).optional(),
  online_payment: z.boolean().optional(), refund_policy: z.enum(["until", "org", "none"]).optional(),
  find_partner: z.boolean().optional(), form_fields: z.array(z.any()).optional(), rules: z.string().max(5000).optional(),
  status: z.enum(["draft", "upcoming", "live", "done", "cancelled"]).optional(),
});

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const staff = await requireStaff();
  const code = (await ctx.params).code;
  const { advance, ...patch } = await body(req, In);
  const { data: t } = await db().from("tournaments").select("id, progress_step, status, name").eq("code", code).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");

  if (advance) {
    const next = t.progress_step + 1;
    if (next > 6) throw new HttpError(409, "Results are already published");
    if (next === 4) {
      const { count } = await db().from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", t.id);
      if (!count) throw new HttpError(409, "Generate the draw first");
    }
    const status = next === 1 ? "upcoming" : next === 6 ? "done" : next >= 5 ? "live" : t.status;
    await db().from("tournaments").update({ progress_step: next, status }).eq("id", t.id);
    if (next === 2) {
      const today = new Date().toISOString().slice(0, 10);
      await db().from("tournaments").update({ reg_open: today }).eq("id", t.id).is("reg_open", null);
    }
    if (next === 3) await db().from("tournaments").update({ reg_close: new Date().toISOString().slice(0, 10) }).eq("id", t.id);
    if (next === 5) await alertFollowers({ tournamentId: t.id }, { kind: "general", title: `${t.name}: schedule published`, href: `/#/t/${code}?tab=schedule` });
    await audit(staff.profileId, "tournament.step", "tournament", code, { step: STEPS[next - 1] });
    return ok({ step: next, label: STEPS[next - 1] });
  }
  await db().from("tournaments").update(patch).eq("id", t.id);
  await audit(staff.profileId, "tournament.edit", "tournament", code, patch);
  return ok();
});
