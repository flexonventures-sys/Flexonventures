// GET /api/owner — team owner home: next tie + window, squad, fixtures, league table (proposal section 7)
import { ok, route } from "@/lib/http";
import { db } from "@/lib/supabase";
import { myTeam } from "@/lib/owner";
import { lineupWindow } from "@/lib/draw";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const { team, tournament } = await myTeam();
  const [squad, ties, teams] = await Promise.all([
    db().from("team_players").select("category, photo_url, players(id, code, full_name, gender, rating)").eq("team_id", team.id),
    db().from("owner_ties").select("*").eq("tournament_id", team.tournament_id).or(`team_a.eq.${team.id},team_b.eq.${team.id}`).order("scheduled_at"),
    db().from("teams").select("id, name, colour").eq("tournament_id", team.tournament_id),
  ]);
  const name = new Map<string, string>((teams.data ?? []).map((x) => [x.id, x.name]));
  const now = Date.now();
  const fixtures = (ties.data ?? []).map((x) => {
    const home = x.team_a === team.id;
    const w = x.scheduled_at ? lineupWindow(new Date(x.scheduled_at)) : null;
    return {
      id: x.id, round: x.round, court: x.court_no, at: x.scheduled_at,
      opponent: name.get(home ? x.team_b : x.team_a), home,
      myLineup: home ? x.lineup_a : x.lineup_b,
      window: w && { opens: w.opens, closes: w.closes, open: now >= w.opens.getTime() && now < w.closes.getTime() },
      result: x.winner_team ? (x.winner_team === team.id ? "W" : "L") : null,
    };
  });
  // League table: 2 points a tie win
  const { data: allTies } = await db().from("owner_ties").select("team_a, team_b, winner_team").eq("tournament_id", team.tournament_id).not("winner_team", "is", null);
  const rows = (teams.data ?? []).map((tm) => {
    const played = (allTies ?? []).filter((x) => x.team_a === tm.id || x.team_b === tm.id);
    const won = played.filter((x) => x.winner_team === tm.id).length;
    return { team: tm.name, played: played.length, won, lost: played.length - won, points: won * 2, me: tm.id === team.id };
  }).sort((a, b) => b.points - a.points || b.won - a.won);

  return ok({
    team: { id: team.id, name: team.name, colour: team.colour, crest: team.crest_url },
    tournament: { code: tournament.code, name: tournament.name, squadMin: tournament.team_min, squadMax: tournament.team_max, tieEvents: tournament.tie_events },
    squad: (squad.data ?? []).map((s) => { const p = Array.isArray(s.players) ? s.players[0] : s.players; return { ...p, category: s.category, photo: s.photo_url }; }),
    next: fixtures.find((f) => f.at && new Date(f.at).getTime() > now - 3 * 3600_000 && !f.result) ?? null,
    fixtures, table: rows,
  });
});
