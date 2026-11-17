// Squad management within league limits (walkthrough page 25)
//   POST   { name, phone, gender, category?, photo? }  add (player invited by WhatsApp login code)
//   PATCH  { player, name?, category?, photo? }         edit
//   DELETE { player }                                   remove (not while in a submitted lineup of an upcoming tie)
import { z } from "zod";
import { body, HttpError, normPhone, ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { audit } from "@/lib/session";
import { myTeam } from "@/lib/owner";

const Add = z.object({
  name: z.string().min(2).max(120), phone: z.string(), gender: z.enum(["M", "F", "X"]),
  category: z.string().max(40).optional(), photo: z.string().url().optional(),
});

export const POST = route(async (req: Request) => {
  const { me, team, tournament } = await myTeam();
  const i = await body(req, Add);
  const { count } = await db().from("team_players").select("player_id", { count: "exact", head: true }).eq("team_id", team.id);
  if (tournament.team_max && (count ?? 0) >= tournament.team_max) throw new HttpError(409, `Squads are limited to ${tournament.team_max} players`);
  const phone = normPhone(i.phone);
  const { data: ex } = await db().from("players").select("id").eq("phone", phone).maybeSingle();
  const pid = ex?.id ?? (await db().from("players").insert({ code: "p" + crypto.randomUUID().replace(/-/g, "").slice(0, 10), full_name: i.name, phone, gender: i.gender }).select("id").single()).data!.id;
  const { data: other } = await db().from("team_players").select("team_id, teams!inner(tournament_id)").eq("player_id", pid).eq("teams.tournament_id", team.tournament_id).limit(1);
  if (other?.length) throw new HttpError(409, "This player is already in a team in this league");
  await db().from("team_players").insert({ team_id: team.id, player_id: pid, category: i.category ?? null, photo_url: i.photo ?? null });
  await audit(me.profileId, "squad.add", "team", team.id, { player: pid });
  return ok({ player: pid }, { status: 201 });
});

const Edit = z.object({ player: z.string().uuid(), name: z.string().min(2).max(120).optional(), category: z.string().max(40).optional(), photo: z.string().url().optional() });

export const PATCH = route(async (req: Request) => {
  const { me, team } = await myTeam();
  const i = await body(req, Edit);
  const { data: tp } = await db().from("team_players").select("player_id").eq("team_id", team.id).eq("player_id", i.player).maybeSingle();
  if (!tp) throw new HttpError(404, "Player is not in your squad");
  if (i.name) await db().from("players").update({ full_name: i.name }).eq("id", i.player).is("profile_id", null); // verified players keep their own name
  if (i.category !== undefined || i.photo !== undefined)
    await db().from("team_players").update({ ...(i.category !== undefined && { category: i.category }), ...(i.photo !== undefined && { photo_url: i.photo }) }).eq("team_id", team.id).eq("player_id", i.player);
  await audit(me.profileId, "squad.edit", "team", team.id, i);
  return ok();
});

export const DELETE = route(async (req: Request) => {
  const { me, team, tournament } = await myTeam();
  const i = await body(req, z.object({ player: z.string().uuid() }));
  const { count } = await db().from("team_players").select("player_id", { count: "exact", head: true }).eq("team_id", team.id);
  if (tournament.team_min && (count ?? 0) <= tournament.team_min) throw new HttpError(409, `Squads need at least ${tournament.team_min} players`);
  await db().from("team_players").delete().eq("team_id", team.id).eq("player_id", i.player);
  await audit(me.profileId, "squad.remove", "team", team.id, i);
  return ok();
});
