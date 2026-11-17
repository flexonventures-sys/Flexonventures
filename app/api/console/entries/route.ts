// Console: add entries to a category directly (players, pairs or teams), edit seed/status, remove.
// POST { category, players?: [playerId, playerId?], team?: teamId, seed?, status? }
// PATCH { id, seed?, status?, players? }   DELETE { id }
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

const Add = z.object({
  category: z.string().uuid(),
  players: z.array(z.string().uuid()).max(2).optional(),
  team: z.string().uuid().optional(),
  seed: z.number().int().positive().optional(),
  status: z.enum(["confirmed", "review", "waitlist"]).default("confirmed"),
});

async function displayName(players: string[]) {
  const { data } = await db().from("players").select("id, full_name").in("id", players);
  const m = new Map((data ?? []).map((p) => [p.id, p.full_name]));
  return players.map((p) => m.get(p) ?? "Player").join(" and ");
}

export const POST = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, Add);
  const { data: cat } = await db().from("categories").select("id, tournament_id, participant").eq("id", i.category).maybeSingle();
  if (!cat) throw new HttpError(404, "Category not found");
  let row: Record<string, unknown>;
  if (cat.participant === "team") {
    if (!i.team) throw new HttpError(400, "Pick a team");
    const { data: team } = await db().from("teams").select("id, name, tournament_id, team_players(player_id)").eq("id", i.team).single();
    if (!team || team.tournament_id !== cat.tournament_id) throw new HttpError(400, "Team belongs to another tournament");
    row = { team_id: team.id, display_name: team.name, player_ids: team.team_players.map((p: { player_id: string }) => p.player_id) };
  } else {
    const need = cat.participant === "player" ? 1 : 2;
    if (i.players?.length !== need) throw new HttpError(400, need === 1 ? "Pick one player" : "Pick two players");
    if (need === 2 && i.players[0] === i.players[1]) throw new HttpError(400, "Pick two different players");
    const { data: dup } = await db().from("entries").select("id").eq("category_id", cat.id).not("status", "in", "(rejected,withdrawn)")
      .or(i.players.map((p) => `player1_id.eq.${p},player2_id.eq.${p}`).join(","));
    if (dup?.length) throw new HttpError(409, "A player is already entered in this category");
    row = { player1_id: i.players[0], player2_id: i.players[1] ?? null, player_ids: i.players, display_name: await displayName(i.players) };
  }
  const { data: e, error } = await db().from("entries").insert({
    tournament_id: cat.tournament_id, category_id: cat.id, ...row, seed: i.seed ?? null, status: i.status, rules_accepted: true, desk_entry: true, note: "Added by organiser",
  }).select("id, entry_no").single();
  if (error) throw error;
  await audit(staff.profileId, "entry.console", "entry", e.id, i);
  return ok({ id: e.id, entryNo: `FX-${e.entry_no}` }, { status: 201 });
});

export const PATCH = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, z.object({ id: z.string().uuid(), seed: z.number().int().positive().nullable().optional(), status: z.enum(["confirmed", "review", "waitlist", "rejected", "withdrawn"]).optional(), players: z.array(z.string().uuid()).min(1).max(2).optional() }));
  const patch: Record<string, unknown> = {};
  if (i.seed !== undefined) patch.seed = i.seed;
  if (i.status) patch.status = i.status;
  if (i.players) Object.assign(patch, { player1_id: i.players[0], player2_id: i.players[1] ?? null, player_ids: i.players, display_name: await displayName(i.players) });
  await db().from("entries").update(patch).eq("id", i.id);
  await audit(staff.profileId, "entry.edit", "entry", i.id, i);
  return ok();
});

export const DELETE = route(async (req: Request) => {
  const staff = await requireStaff();
  const { id } = await body(req, z.object({ id: z.string().uuid() }));
  const { data: used } = await db().from("matches").select("id").or(`entry_a.eq.${id},entry_b.eq.${id}`).neq("status", "upcoming").limit(1);
  if (used?.length) throw new HttpError(409, "This entry has played; withdraw it instead");
  await db().from("entries").delete().eq("id", id);
  await audit(staff.profileId, "entry.delete", "entry", id);
  return ok();
});
