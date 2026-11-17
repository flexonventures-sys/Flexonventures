// Shared read model for the admin console and the public tournament / scoreboard pages.
import { db, HttpError } from "./supabase";
import { standings } from "./formats/engine";
import { formatById } from "./formats/catalog";
import { clock } from "./data";

export async function tournamentDetail(code: string, opts: { staff: boolean }) {
  const { data: t } = await db().from("tournaments").select("id, code, name, type, status, progress_step, start_date, end_date, courts, fee_paise, fee_unit, rules, capacity, reg_open, reg_close, venues(name, address)").eq("code", code).maybeSingle();
  if (!t || (t.status === "draft" && !opts.staff)) throw new HttpError(404, "Tournament not found");
  const [cats, stages, matches, entries, teams, players, ties, courts] = await Promise.all([
    db().from("categories").select("id, name, kind, participant, format_id, format_config, capacity, sort").eq("tournament_id", t.id).order("sort"),
    db().from("stages").select("id, category_id, seq, kind, name, config, scoring, state, status").order("seq"),
    db().from("matches").select("id, code, stage_id, category_id, group_id, tie_id, bracket, round_no, position, stage, event, court_no, scheduled_at, status, winner, games, entry_a, entry_b, side_a, side_b, scoring, points_to, best_of, win_by, cap, freeze_at, doubles, next_match, loser_next_match").eq("tournament_id", t.id).order("round_no").order("position"),
    db().from("entries").select("id, entry_no, category_id, display_name, status, seed, player1_id, player2_id, team_id, player_ids, desk_entry, amount_paise").eq("tournament_id", t.id).order("seed", { nullsFirst: false }),
    db().from("teams").select("id, name, colour, owner_name, owner_phone, owner_profile, owner_access, team_players(player_id, category)").eq("tournament_id", t.id),
    db().from("players").select("id, code, full_name, gender, rating"),
    db().from("ties").select("id, stage_id, team_a, team_b, round, winner_team, scheduled_at, court_no").eq("tournament_id", t.id),
    db().from("public_courts").select("number, referee_name, stream_url").eq("tournament_id", t.id).order("number"),
  ]);
  const catIds = new Set((cats.data ?? []).map((c) => c.id));
  const myStages = (stages.data ?? []).filter((s) => catIds.has(s.category_id));
  const pname = new Map((players.data ?? []).map((p) => [p.id, p.full_name as string]));
  const ename = new Map((entries.data ?? []).map((e) => [e.id, e.display_name as string]));
  const short = (side: string[]) => side.map((id) => (pname.get(id) ?? "").split(" ").slice(-1)[0]).join(" / ");
  // team events show the players on court (team name until lineups are in); other formats show the entry
  const sideName = (entry: string | null, side: string[], tie: boolean) =>
    tie && side.length ? short(side) : entry ? ename.get(entry) ?? "TBC" : side.length ? short(side) : "TBC";
  const ms = (matches.data ?? []).map((m) => ({
    ...m, time: clock(m.scheduled_at), nameA: sideName(m.entry_a, m.side_a, !!m.tie_id), nameB: sideName(m.entry_b, m.side_b, !!m.tie_id),
    playersA: m.side_a.map((id: string) => pname.get(id) ?? ""), playersB: m.side_b.map((id: string) => pname.get(id) ?? ""),
  }));
  const table = await Promise.all(myStages.map(async (s) => ({ stageId: s.id, ...(await standings(s.id).catch(() => ({ kind: s.kind, groups: [] }))) })));
  const teamName = new Map((teams.data ?? []).map((x) => [x.id, x.name as string]));
  const venue = Array.isArray(t.venues) ? t.venues[0] : t.venues;
  return {
    tournament: { ...t, venue: venue ? [venue.name, venue.address].filter(Boolean).join(", ") : "" },
    categories: (cats.data ?? []).map((c) => ({ ...c, format: formatById(c.format_id) ? { id: c.format_id, name: formatById(c.format_id)!.name, family: formatById(c.format_id)!.family } : null })),
    stages: myStages, matches: ms, standings: table, courts: courts.data ?? [],
    ties: (ties.data ?? []).map((x) => ({ ...x, nameA: teamName.get(x.team_a), nameB: teamName.get(x.team_b), winnerName: x.winner_team ? teamName.get(x.winner_team) : null })),
    entries: opts.staff ? entries.data ?? [] : (entries.data ?? []).filter((e) => e.status === "confirmed").map(({ id, category_id, display_name, seed, team_id }) => ({ id, category_id, display_name, seed, team_id })),
    teams: (teams.data ?? []).map((x) => opts.staff ? x : { id: x.id, name: x.name, colour: x.colour, owner_name: x.owner_name, team_players: x.team_players }),
    players: opts.staff ? players.data ?? [] : undefined,
  };
}
