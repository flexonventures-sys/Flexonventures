// POST /api/follows — follow a tournament (whole or chosen categories), a match, or a player.
//   { match, toggle } | { tournament, categories: ["all"|name...] } | { tournament, remove } | { player, toggle }
// GET  /api/follows — what I follow
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { requireUser } from "@/lib/session";

const In = z.object({
  match: z.string().optional(),
  player: z.string().optional(),
  tournament: z.string().optional(),
  categories: z.array(z.string()).optional(),
  toggle: z.boolean().optional(),
  remove: z.boolean().optional(),
});

export const GET = route(async () => {
  const me = await requireUser();
  const { data } = await db().from("follows").select("player_id, tournament_id, category_id, match_id, created_at").eq("profile_id", me.profileId);
  return ok({ follows: data ?? [] });
});

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const i = await body(req, In);
  const f = db().from("follows");

  if (i.match || i.player) {
    const col = i.match ? "match_id" : "player_id";
    const { data: row } = i.match
      ? await db().from("matches").select("id").eq("code", i.match).maybeSingle()
      : await db().from("players").select("id").eq("code", i.player!).maybeSingle();
    if (!row) throw new HttpError(404, "Not found");
    const { data: ex } = await f.select("profile_id").eq("profile_id", me.profileId).eq(col, row.id).maybeSingle();
    if (ex) { await db().from("follows").delete().eq("profile_id", me.profileId).eq(col, row.id); return ok({ following: false }); }
    await db().from("follows").insert({ profile_id: me.profileId, [col]: row.id });
    return ok({ following: true });
  }

  if (!i.tournament) throw new HttpError(400, "Nothing to follow");
  const { data: t } = await db().from("tournaments").select("id").eq("code", i.tournament).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const { data: cats } = await db().from("categories").select("id, name").eq("tournament_id", t.id);
  const catIds = (cats ?? []).map((c) => c.id);
  // replace this tournament's follows with the new selection
  await db().from("follows").delete().eq("profile_id", me.profileId).eq("tournament_id", t.id);
  if (catIds.length) await db().from("follows").delete().eq("profile_id", me.profileId).in("category_id", catIds);
  if (i.remove) return ok({ following: false });
  const sel = i.categories ?? ["all"];
  const rows = sel.includes("all")
    ? [{ profile_id: me.profileId, tournament_id: t.id }]
    : (cats ?? []).filter((c) => sel.includes(c.name)).map((c) => ({ profile_id: me.profileId, category_id: c.id }));
  if (rows.length) await db().from("follows").insert(rows);
  return ok({ following: true, count: rows.length });
});
