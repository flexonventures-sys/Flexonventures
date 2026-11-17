// Maps database rows to the shapes the approved prototype renders (P, T, M ...),
// so the UI stays exactly as signed off while every value comes from Supabase.
import { db, HttpError, supabaseAnonKey, supabaseUrl } from "./supabase";
import type { Format, Rally } from "./scoring";

const IST = "Asia/Kolkata";
const fmtDay = (d: string) => new Date(d + "T00:00:00+05:30");
const dayNum = (d: string) => String(fmtDay(d).getDate());
const mon = (d: string) => fmtDay(d).toLocaleString("en-IN", { month: "short", timeZone: IST }).toUpperCase();
const dm = (d: string) => fmtDay(d).toLocaleString("en-IN", { day: "numeric", month: "short", timeZone: IST });
export const clock = (ts: string | null) =>
  ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: IST }) : "TBC";
const STAGE: Record<string, string> = { rr: "Round robin", ko: "Knockout", groups: "Groups, then knockout" };

export type MatchRow = {
  id: string; code: string; tournament_id: string; category_id: string | null; group_id: string | null; tie_id: string | null;
  stage: string; court_no: number | null; scheduled_at: string | null; side_a: string[]; side_b: string[];
  entry_a: string | null; entry_b: string | null;
  scoring: "sideout" | "rally"; points_to: number; best_of: number; doubles: boolean; status: string;
  games: [number, number][]; winner: 0 | 1 | null; referee_name: string | null;
  win_by?: number | null; cap?: number | null; freeze_at?: number | null; stage_id?: string | null;
};

export const formatOf = (m: MatchRow): Format => ({
  type: m.scoring, to: m.points_to, bo: m.best_of, dbl: m.doubles,
  winBy: m.win_by ?? 2, cap: m.cap ?? undefined, freeze: m.freeze_at ?? undefined,
});

export async function matchByCode(code: string): Promise<MatchRow> {
  const { data } = await db().from("matches").select("*").eq("code", code).maybeSingle();
  if (!data) throw new HttpError(404, "Match not found");
  return data as MatchRow;
}

/** Active rally log (voided undo entries excluded), in order, as the replay engine expects. */
export async function rallyLog(matchId: string): Promise<(Rally & { t: number; seq: number })[]> {
  const { data } = await db().from("rally_events").select("seq, winner, t_offset")
    .eq("match_id", matchId).eq("kind", "rally").is("voided_at", null).order("seq");
  return (data ?? []).map((r) => ({ w: r.winner as 0 | 1, t: Number(r.t_offset), seq: r.seq }));
}

export async function bootstrap(opts: { staff: boolean }) {
  const sb = db();
  const [players, tournaments, cats, matches, counts, champs, events, courts] = await Promise.all([
    sb.from("players").select("id, code, full_name, locality, played, won, titles, rating, gender"),
    sb.from("tournaments").select("id, code, name, type, status, progress_step, start_date, end_date, courts, capacity, reg_open, reg_close, fee_paise, fee_unit, rules, venues(name, address)").neq("status", "draft").order("start_date", { ascending: false }),
    sb.from("categories").select("id, tournament_id, name, stage, sort").order("sort"),
    sb.from("matches").select("*").order("scheduled_at"),
    sb.from("tournament_counts").select("*"),
    sb.from("champions").select("tournament_id, category, player_ids"),
    sb.from("rally_events").select("match_id, seq, winner, t_offset").eq("kind", "rally").is("voided_at", null).order("seq"),
    sb.from("public_courts").select("tournament_id, number, referee_name, stream_url"),
  ]);
  for (const r of [players, tournaments, cats, matches, counts, champs, events, courts]) if (r.error) throw r.error;

  const pcode = new Map(players.data!.map((p) => [p.id, p.code as string]));
  const P = Object.fromEntries(players.data!.map((p) => [p.code, {
    n: p.full_name, c: p.locality ?? "", pl: p.played, w: p.won, ti: p.titles, r: Number(p.rating).toFixed(2), g: p.gender, uuid: p.id,
  }]));
  const tcode = new Map(tournaments.data!.map((t) => [t.id, t.code as string]));
  const cname = new Map(cats.data!.map((c) => [c.id, c.name as string]));
  const cnt = new Map(counts.data!.map((c) => [c.tournament_id, c]));
  const today = new Date().toISOString().slice(0, 10);

  const T = tournaments.data!.map((t) => {
    const tc = cats.data!.filter((c) => c.tournament_id === t.id);
    const n = cnt.get(t.id)?.entries ?? 0;
    const reg = t.status === "upcoming" && (!t.reg_open || t.reg_open <= today) && (!t.reg_close || t.reg_close >= today) && t.progress_step <= 2;
    const dayIdx = Math.floor((Date.now() - fmtDay(t.start_date).getTime()) / 864e5) + 1;
    const total = Math.round((fmtDay(t.end_date).getTime() - fmtDay(t.start_date).getTime()) / 864e5) + 1;
    const ch = champs.data!.filter((c) => c.tournament_id === t.id).map((c) => [c.category, ...c.player_ids.map((id: string) => pcode.get(id))]);
    const venue = Array.isArray(t.venues) ? t.venues[0] : t.venues;
    return {
      id: t.code, uuid: t.id, name: t.name, yr: +t.start_date.slice(0, 4), status: t.status, reg,
      d: dayNum(t.start_date), mo: mon(t.start_date),
      dates: `${dm(t.start_date)} to ${dm(t.end_date)}`,
      day: `Day ${Math.min(Math.max(dayIdx, 1), total)} of ${total}`,
      venue: venue ? [venue.name, venue.address].filter(Boolean).join(", ") : "",
      courts: t.courts, entries: n, cap: t.capacity ?? undefined, closes: t.reg_close ? dm(t.reg_close) : undefined,
      cats: tc.map((c) => c.name), fmt: STAGE[tc[0]?.stage ?? "groups"], fee: t.fee_paise / 100, unit: t.fee_unit,
      type: t.type, progress: t.progress_step, champs: ch.length ? ch : undefined, rules: t.rules,
    };
  });

  const logs = new Map<string, { w: number; t: number }[]>();
  for (const e of events.data!) {
    const l = logs.get(e.match_id) ?? []; l.push({ w: e.winner, t: Number(e.t_offset) }); logs.set(e.match_id, l);
  }
  const M = (matches.data as MatchRow[]).filter((m) => tcode.has(m.tournament_id)).map((m) => ({
    id: m.code, uuid: m.id, t: tcode.get(m.tournament_id), cat: m.category_id ? cname.get(m.category_id) : "", stage: m.stage,
    court: m.court_no, time: clock(m.scheduled_at), at: m.scheduled_at, status: m.status === "walkover" ? "done" : m.status,
    A: m.side_a.map((id) => pcode.get(id)).filter(Boolean), B: m.side_b.map((id) => pcode.get(id)).filter(Boolean),
    fmt: { type: m.scoring, to: m.points_to, bo: m.best_of, dbl: m.doubles },
    games: m.games, log: m.status === "live" ? logs.get(m.id) ?? [] : undefined, ref: m.referee_name ?? "",
  }));

  const out: Record<string, unknown> = {
    live: true, P, T, M,
    courts: courts.data,
    supabaseUrl, supabaseAnonKey,
    vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
  };

  if (opts.staff) {
    const [rev, conf, refs] = await Promise.all([
      sb.from("entries").select("id, display_name, amount_paise, tournaments(name), categories(name)").eq("status", "review").order("created_at"),
      sb.from("entries").select("display_name, amount_paise, tournaments(name), categories(name)").eq("status", "confirmed").order("updated_at", { ascending: false }).limit(50),
      sb.from("refunds").select("id, amount_paise, reason, status, entries(display_name, tournaments(name))").order("created_at", { ascending: false }).limit(50),
    ]);
    const one = <X,>(v: X | X[] | null): X | null => (Array.isArray(v) ? v[0] ?? null : v);
    const label = (e: { tournaments: unknown; categories?: unknown }) =>
      [one(e.tournaments as { name: string })?.name, one((e.categories ?? null) as { name: string })?.name].filter(Boolean).join(", ");
    out.reviews = (rev.data ?? []).map((e) => ({ id: e.id, t: e.display_name, m: label(e), amt: e.amount_paise / 100 }));
    out.confirmed = (conf.data ?? []).map((e) => [e.display_name, label(e), e.amount_paise / 100]);
    out.refunds = (refs.data ?? []).map((r) => {
      const e = one(r.entries as unknown as { display_name: string; tournaments: unknown });
      return { id: r.id, t: e?.display_name ?? "", m: [one(e?.tournaments as { name: string })?.name, r.reason].filter(Boolean).join(", "), amt: r.amount_paise / 100, done: r.status === "done" };
    });
  }
  return out;
}
