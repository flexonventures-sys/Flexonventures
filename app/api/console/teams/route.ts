// Console: teams for any team format, with owner assignment and squads.
// POST { tournament, name, colour?, ownerUserId?, players?: [ids] }
// PATCH { id, name?, colour?, ownerUserId?: string | null, access?, players? }   DELETE { id }
import { z } from "zod";
import { body, HttpError, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit, requireStaff } from "@/lib/session";

async function ownerFields(userId: string | null | undefined) {
  if (userId === undefined) return {};
  if (userId === null) return { owner_profile: null, owner_name: null, owner_phone: null, owner_verified: false };
  const { data: p } = await db().from("profiles").select("id, full_name, phone, role").eq("id", userId).maybeSingle();
  if (!p) throw new HttpError(404, "User not found");
  if (p.role === "player") await db().from("profiles").update({ role: "team_owner" }).eq("id", p.id);
  return { owner_profile: p.id, owner_name: p.full_name, owner_phone: p.phone, owner_verified: true };
}
async function setSquad(teamId: string, players?: string[]) {
  if (!players) return;
  await db().from("team_players").delete().eq("team_id", teamId);
  if (players.length) await db().from("team_players").insert(players.map((p) => ({ team_id: teamId, player_id: p })));
  await db().from("entries").update({ player_ids: players }).eq("team_id", teamId);
}

export const POST = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, z.object({ tournament: z.string(), name: z.string().min(2).max(80), colour: z.string().max(20).optional(), ownerUserId: z.string().uuid().optional(), players: z.array(z.string().uuid()).optional() }));
  const { data: t } = await db().from("tournaments").select("id").eq("code", i.tournament).maybeSingle();
  if (!t) throw new HttpError(404, "Tournament not found");
  const { data: team, error } = await db().from("teams").insert({ tournament_id: t.id, name: i.name, colour: i.colour ?? null, owner_access: true, ...(await ownerFields(i.ownerUserId)) }).select("id").single();
  if (error?.code === "23505") throw new HttpError(409, "That team name is taken");
  if (error) throw error;
  await setSquad(team.id, i.players);
  await audit(staff.profileId, "team.create", "team", team.id, i);
  return ok({ id: team.id }, { status: 201 });
});

export const PATCH = route(async (req: Request) => {
  const staff = await requireStaff();
  const i = await body(req, z.object({ id: z.string().uuid(), name: z.string().min(2).max(80).optional(), colour: z.string().max(20).optional(), ownerUserId: z.string().uuid().nullable().optional(), access: z.boolean().optional(), players: z.array(z.string().uuid()).optional() }));
  await db().from("teams").update({ ...(i.name && { name: i.name }), ...(i.colour && { colour: i.colour }), ...(i.access !== undefined && { owner_access: i.access }), ...(await ownerFields(i.ownerUserId)) }).eq("id", i.id);
  if (i.name) await db().from("entries").update({ display_name: i.name }).eq("team_id", i.id);
  await setSquad(i.id, i.players);
  await audit(staff.profileId, "team.edit", "team", i.id, i);
  return ok();
});

export const DELETE = route(async (req: Request) => {
  const staff = await requireStaff();
  const { id } = await body(req, z.object({ id: z.string().uuid() }));
  const { data: e } = await db().from("entries").select("id").eq("team_id", id);
  if (e?.length) {
    const { data: used } = await db().from("matches").select("id").in("entry_a", e.map((x) => x.id)).neq("status", "upcoming").limit(1);
    if (used?.length) throw new HttpError(409, "This team has played");
    await db().from("entries").delete().eq("team_id", id);
  }
  await db().from("teams").delete().eq("id", id);
  await audit(staff.profileId, "team.delete", "team", id);
  return ok();
});
