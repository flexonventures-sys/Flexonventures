// POST /api/tournaments/:code/draw
//   { action: "generate", category }                 groups (seeds spread) + round-robin matches, or straight knockout
//   { action: "swap", category, a: entryId, b: entryId }   tap-to-swap two entries between groups
//   { action: "knockout", category }                  build knockout from group finishers (winners v other runners-up)
// Proposal sections 6, 11; walkthrough page 19.
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";
import { crossover, makeGroups, roundName, roundRobin, seededBracket } from "@/lib/draw";
import { standings } from "@/lib/standings";

const In = z.object({
  action: z.enum(["generate", "swap", "knockout"]),
  category: z.string(),
  a: z.string().uuid().optional(),
  b: z.string().uuid().optional(),
});

type Entry = { id: string; seed: number | null; player1_id: string | null; player2_id: string | null };

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const staff = await requireStaff();
  const code = (await ctx.params).code;
  const i = await body(req, In);
  const { data: t } = await db().from("tournaments").select("id, progress_step").eq("code", code).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const { data: cat } = await db().from("categories").select("*").eq("tournament_id", t.id).eq("name", i.category).maybeSingle();
  if (!cat) throw new HttpError(404, "Category not found");
  const prefix = `${code}-${cat.sort}`;

  const sides = (e: Entry | null) => (e ? [e.player1_id, e.player2_id].filter(Boolean) as string[] : []);
  const fmt = { scoring: cat.scoring, points_to: cat.points_to, best_of: cat.best_of, doubles: cat.kind !== "singles" };

  if (i.action === "generate") {
    if (t.progress_step < 3) throw new HttpError(409, "Close entries before making the draw");
    const { data: played } = await db().from("matches").select("id").eq("category_id", cat.id).neq("status", "upcoming").limit(1);
    if (played?.length) throw new HttpError(409, "Matches have started; the draw is locked");
    await db().from("matches").delete().eq("category_id", cat.id);
    await db().from("groups").delete().eq("category_id", cat.id);
    const { data: entries } = await db().from("entries").select("id, seed, player1_id, player2_id").eq("category_id", cat.id).eq("status", "confirmed");
    const list = (entries ?? []) as Entry[];
    if (list.length < 2) throw new HttpError(409, "Need at least two confirmed entries");

    const rows: Record<string, unknown>[] = [];
    let n = 0;
    if (cat.stage === "ko") {
      const pairs = seededBracket(list);
      pairs.forEach(([a, b], k) => rows.push({
        code: `${prefix}-${++n}`, tournament_id: t.id, category_id: cat.id, stage: `${roundName(pairs.length)} ${k + 1}`, round_no: 1,
        entry_a: a?.id ?? null, entry_b: b?.id ?? null, side_a: sides(a), side_b: sides(b), ...fmt,
        status: a && b ? "upcoming" : "walkover", games: [], winner: a && b ? null : a ? 0 : 1,
      }));
    } else {
      const groups = makeGroups(list, cat.stage === "rr" ? 1 : cat.group_count ?? 2);
      for (const [gi, members] of groups.entries()) {
        const name = cat.stage === "rr" ? "Round robin" : `Group ${String.fromCharCode(65 + gi)}`;
        const { data: g } = await db().from("groups").insert({ category_id: cat.id, name, sort: gi }).select("id").single();
        await db().from("group_members").insert(members.map((e) => ({ group_id: g!.id, entry_id: e.id })));
        for (const m of roundRobin(members)) rows.push({
          code: `${prefix}-${++n}`, tournament_id: t.id, category_id: cat.id, group_id: g!.id, stage: name, round_no: m.round,
          entry_a: m.a.id, entry_b: m.b.id, side_a: sides(m.a), side_b: sides(m.b), ...fmt,
        });
      }
    }
    if (rows.length) { const { error } = await db().from("matches").insert(rows); if (error) throw error; }
    await audit(staff.profileId, "draw.generate", "category", cat.id, { matches: rows.length });
    return ok({ matches: rows.length });
  }

  if (i.action === "swap") {
    if (!i.a || !i.b) throw new HttpError(400, "Pick two entries to swap");
    const { data: gm } = await db().from("group_members").select("group_id, entry_id, groups!inner(category_id)").in("entry_id", [i.a, i.b]).eq("groups.category_id", cat.id);
    if (gm?.length !== 2) throw new HttpError(400, "Both entries must be in this category's groups");
    const ga = gm.find((x) => x.entry_id === i.a)!.group_id, gb = gm.find((x) => x.entry_id === i.b)!.group_id;
    if (ga === gb) return ok({ swapped: false });
    await db().from("group_members").update({ group_id: gb }).eq("entry_id", i.a).eq("group_id", ga);
    await db().from("group_members").update({ group_id: ga }).eq("entry_id", i.b).eq("group_id", gb);
    // regenerate group fixtures for both groups (draw is editable only before play)
    const { data: started } = await db().from("matches").select("id").in("group_id", [ga, gb]).neq("status", "upcoming").limit(1);
    if (started?.length) throw new HttpError(409, "Matches have started; the draw is locked");
    await db().from("matches").delete().in("group_id", [ga, gb]);
    const { data: groups } = await db().from("groups").select("id, name").in("id", [ga, gb]);
    const { count } = await db().from("matches").select("id", { count: "exact", head: true }).eq("category_id", cat.id);
    let n = (count ?? 0) + 1000;
    for (const g of groups ?? []) {
      const { data: mem } = await db().from("group_members").select("entries(id, seed, player1_id, player2_id)").eq("group_id", g.id);
      const es = (mem ?? []).map((x) => (Array.isArray(x.entries) ? x.entries[0] : x.entries) as Entry);
      await db().from("matches").insert(roundRobin(es).map((m) => ({
        code: `${prefix}-${++n}`, tournament_id: t.id, category_id: cat.id, group_id: g.id, stage: g.name, round_no: m.round,
        entry_a: m.a.id, entry_b: m.b.id, side_a: sides(m.a), side_b: sides(m.b), ...fmt,
      })));
    }
    await audit(staff.profileId, "draw.swap", "category", cat.id, { a: i.a, b: i.b });
    return ok({ swapped: true });
  }

  // knockout from groups
  const { data: groups } = await db().from("groups").select("id").eq("category_id", cat.id).order("sort");
  if (!groups?.length) throw new HttpError(409, "No groups yet");
  const { data: open } = await db().from("matches").select("id").in("group_id", groups.map((g) => g.id)).not("status", "in", "(done,walkover)").limit(1);
  if (open?.length) throw new HttpError(409, "Finish all group matches first");
  const qualified = await Promise.all(groups.map(async (g) => (await standings(g.id)).slice(0, cat.advance ?? 2).map((r) => r.entry_id)));
  const ids = qualified.flat();
  const { data: es } = await db().from("entries").select("id, seed, player1_id, player2_id").in("id", ids);
  const byId = new Map((es ?? []).map((e) => [e.id, e as Entry]));
  let round = crossover(qualified).map(([a, b]) => [byId.get(a)!, byId.get(b)!] as [Entry, Entry]);
  // Build every round up front; winners advance through next_match / next_slot automatically.
  const { count } = await db().from("matches").select("id", { count: "exact", head: true }).eq("category_id", cat.id);
  let n = (count ?? 0) + 2000, r = 1, prev: { id: string }[] = [];
  let size = round.length;
  const created: { id: string }[][] = [];
  while (size >= 1) {
    const rows = Array.from({ length: size }, (_, k) => {
      const pair = r === 1 ? round[k] : null;
      return {
        code: `${prefix}-${++n}`, tournament_id: t.id, category_id: cat.id, stage: size === 1 ? "Final" : `${roundName(size)} ${k + 1}`, round_no: 100 + r,
        entry_a: pair?.[0].id ?? null, entry_b: pair?.[1].id ?? null, side_a: sides(pair?.[0] ?? null), side_b: sides(pair?.[1] ?? null), ...fmt,
      };
    });
    const { data, error } = await db().from("matches").insert(rows).select("id");
    if (error) throw error;
    if (prev.length) await Promise.all(prev.map((m, k) => db().from("matches").update({ next_match: data![Math.floor(k / 2)].id, next_slot: k % 2 }).eq("id", m.id)));
    created.push(data!); prev = data!; size = size === 1 ? 0 : Math.ceil(size / 2); r++;
  }
  round = [];
  await audit(staff.profileId, "draw.knockout", "category", cat.id, { rounds: created.length });
  return ok({ rounds: created.length });
});
