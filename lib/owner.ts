import { db, HttpError } from "./supabase";
import { requireUser } from "./session";

/** The signed-in owner's team (access switch respected). Owners see only their own team. */
export async function myTeam() {
  const me = await requireUser();
  const { data } = await db().from("teams")
    .select("id, name, colour, crest_url, owner_access, tournament_id, tournaments(code, name, team_min, team_max, tie_events, start_date, end_date)")
    .eq("owner_profile", me.profileId).order("created_at", { ascending: false });
  const team = (data ?? [])[0];
  if (!team) throw new HttpError(403, "No team is registered to this mobile");
  if (!team.owner_access) throw new HttpError(403, "Your owner access is paused. Contact the organiser.");
  const t = Array.isArray(team.tournaments) ? team.tournaments[0] : team.tournaments;
  return { me, team, tournament: t! };
}
