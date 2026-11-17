"use client";
// Format-aware tournament views shared by the public page and the admin console:
// brackets (single/double/compass/consolation), pools and standings, rounds on courts, team ties.
import { useEffect, useState } from "react";

export type M = {
  id: string; code: string; stage_id: string | null; tie_id: string | null; bracket: string | null; round_no: number | null; position: number | null;
  stage: string; event: string | null; court_no: number | null; time: string; status: string; winner: 0 | 1 | null; games: [number, number][];
  nameA: string; nameB: string; playersA: string[]; playersB: string[]; side_a: string[]; side_b: string[]; entry_a: string | null; entry_b: string | null;
  points_to: number; best_of: number; scoring: string;
};
export type Row = { id: string; name: string; played: number; won: number; lost: number; gf: number; ga: number; pf: number; pa: number; pts: number; extra?: string };
export type StageT = { id: string; category_id: string; seq: number; kind: string; name: string; config: any; status: string; state: any; scoring: any };
export type Detail = {
  tournament: { code: string; name: string; status: string; start_date: string; end_date: string; venue: string; courts: number };
  categories: { id: string; name: string; participant: string; format_id: string; format: { id: string; name: string; family: string } | null }[];
  stages: StageT[]; matches: M[]; standings: { stageId: string; kind: string; groups: { name: string; rows: Row[] }[] }[];
  ties: { id: string; stage_id: string | null; nameA?: string; nameB?: string; winnerName?: string | null; round: string | null; team_a: string; team_b: string }[];
  courts: { number: number; referee_name: string | null; stream_url: string | null }[];
};

export function useLive<T>(url: string, ms = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try { const r = await fetch(url, { cache: "no-store" }); const j = await r.json(); if (!r.ok) throw new Error(j.error); if (!stop) { setData(j); setError(""); } }
      catch (e) { if (!stop) setError((e as Error).message); }
    };
    tick(); const id = setInterval(tick, ms);
    return () => { stop = true; clearInterval(id); };
  }, [url, ms]);
  return { data, error, setData };
}

const done = (m: M) => m.status === "done" || m.status === "walkover";
export const games = (m: M) => (m.games ?? []).map((g) => g.join("–")).join(", ");

export function MatchCard({ m, onClick, compact }: { m: M; onClick?: () => void; compact?: boolean }) {
  const side = (i: 0 | 1) => {
    const won = done(m) && m.winner === i;
    return (
      <div className={`flex items-center justify-between gap-2 px-2 py-1 ${won ? "font-bold" : done(m) ? "muted" : ""}`}>
        <span className="truncate" title={(i ? m.playersB : m.playersA).join(" / ")}>{i ? m.nameB : m.nameA}</span>
        <span className="flex gap-1 tabular-nums">{(m.games ?? []).map((g, k) => <span key={k} className={`w-6 text-center ${g[i] > g[1 - i] ? "bg-ball text-ink" : ""}`}>{g[i]}</span>)}</span>
      </div>
    );
  };
  return (
    <button type="button" onClick={onClick} className={`block w-full border text-left text-sm ${m.status === "live" ? "border-live" : "border-line dark:border-line-dark"} bg-white dark:bg-[#111]`}>
      {!compact && (
        <div className="flex justify-between bg-surface px-2 py-0.5 text-[11px] uppercase tracking-wide dark:bg-surface-dark">
          <span className="truncate">{m.event ?? m.stage}</span>
          <span>{m.status === "live" ? <b className="text-live">Live</b> : done(m) ? "Final" : `${m.court_no ? `C${m.court_no} ` : ""}${m.time !== "TBC" ? m.time : ""}`}</span>
        </div>
      )}
      {side(0)}{side(1)}
    </button>
  );
}

const BRACKET_NAMES: Record<string, string> = { W: "Main draw", L: "Losers bracket", GF: "Grand final", B: "Bronze", C: "Consolation", E: "East", N: "North", S: "South", NE: "Northeast", NW: "Northwest", SE: "Southeast", SW: "Southwest" };

/** Columns of rounds per bracket label. */
export function Bracket({ matches, onPick }: { matches: M[]; onPick?: (m: M) => void }) {
  const ORDER = ["W", "E", "L", "GF", "B", "C", "W2", "N", "S", "NE", "NW", "SE", "SW"];
  const labels = [...new Set(matches.map((m) => m.bracket ?? "W"))].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
  return (
    <div className="space-y-6">
      {labels.map((b) => {
        const ms = matches.filter((m) => (m.bracket ?? "W") === b);
        const rounds = [...new Set(ms.map((m) => m.round_no ?? 1))].sort((x, y) => x - y);
        return (
          <section key={b}>
            {labels.length > 1 && <h4 className="mb-2 text-sm font-bold uppercase tracking-wide">{BRACKET_NAMES[b] ?? (b === "W" ? "Main draw" : b)}</h4>}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {rounds.map((r) => {
                const col = ms.filter((m) => (m.round_no ?? 1) === r).sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
                return (
                  <div key={r} className="flex w-60 shrink-0 flex-col justify-around gap-3">
                    <div className="muted text-xs font-semibold">{b === "L" ? `Round ${r}` : b === "GF" ? (r === 1 ? "Grand final" : "Reset") : col[0]?.stage.replace(/\s+\d+$/, "")}</div>
                    {col.map((m) => <MatchCard key={m.id} m={m} onClick={() => onPick?.(m)} />)}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function Standings({ groups, kind, qualify = 0 }: { groups: { name: string; rows: Row[] }[]; kind: string; qualify?: number }) {
  const individual = ["rotating", "americano", "mexicano", "shootout"].includes(kind);
  const pointsFirst = kind === "americano" || kind === "mexicano";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.name} className="overflow-x-auto">
          <h4 className="mb-1 text-sm font-bold">{g.name}</h4>
          <table className="w-full text-sm tabular-nums">
            <thead><tr className="muted text-left text-xs">
              <th className="py-1">#</th><th>{individual ? "Player" : kind === "team_ties" ? "Team" : "Entry"}</th><th>P</th><th>W</th><th>L</th>
              {kind === "team_ties" ? <th>Games</th> : <><th>G±</th><th>Pts±</th></>}{pointsFirst ? <th>Pts won</th> : <th>Pts</th>}
            </tr></thead>
            <tbody>{g.rows.map((r, i) => (
              <tr key={r.id} className={`border-t border-line dark:border-line-dark ${qualify && i < qualify ? "bg-pitch/10" : ""}`}>
                <td className="py-1.5">{r.extra ?? i + 1}</td><td className="max-w-[12rem] truncate">{r.name}</td><td>{r.played}</td><td>{r.won}</td><td>{r.lost}</td>
                {kind === "team_ties" ? <td>{r.gf}–{r.ga}</td> : <><td>{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</td><td>{r.pf - r.pa > 0 ? "+" : ""}{r.pf - r.pa}</td></>}
                <td className="font-bold">{pointsFirst ? r.pf : r.pts}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** Round-by-round formats laid out by round and court. */
export function Rounds({ matches, onPick }: { matches: M[]; onPick?: (m: M) => void }) {
  const rounds = [...new Set(matches.map((m) => m.round_no ?? 1))].sort((a, b) => b - a);
  return (
    <div className="space-y-4">
      {rounds.map((r) => (
        <div key={r}>
          <h4 className="mb-2 text-sm font-bold">Round {r}</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {matches.filter((m) => m.round_no === r).sort((a, b) => (a.court_no ?? 0) - (b.court_no ?? 0)).map((m) => <MatchCard key={m.id} m={m} onClick={() => onPick?.(m)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Ties({ d, stage, onPick }: { d: Detail; stage: StageT; onPick?: (m: M) => void }) {
  const ties = d.ties.filter((t) => t.stage_id === stage.id);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {ties.map((t) => {
        const ms = d.matches.filter((m) => m.tie_id === t.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        const w = [0, 0]; ms.filter((m) => m.event !== "DreamBreaker").forEach((m) => { if (m.winner !== null) w[m.winner]++; });
        return (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between gap-2">
              <span className="muted text-xs uppercase">{t.round}</span>
              {t.winnerName && <span className="tag bg-pitch text-white">{t.winnerName} win</span>}
            </div>
            <div className="my-2 flex items-center justify-between text-lg font-bold"><span>{t.nameA}</span><span className="tabular-nums">{w[0]} – {w[1]}</span><span className="text-right">{t.nameB}</span></div>
            <div className="space-y-1">{ms.map((m) => <MatchCard key={m.id} m={m} onClick={() => onPick?.(m)} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Everything for one stage, chosen by its kind. */
export function StageView({ d, stage, onPick }: { d: Detail; stage: StageT; onPick?: (m: M) => void }) {
  const ms = d.matches.filter((m) => m.stage_id === stage.id);
  const st = d.standings.find((s) => s.stageId === stage.id);
  const bracketKinds = ["single_elim", "double_elim", "compass", "consolation"];
  if (!ms.length && stage.kind !== "ladder") return <p className="muted text-sm">Draw not made yet.</p>;
  return (
    <div className="space-y-5">
      {bracketKinds.includes(stage.kind) && <Bracket matches={ms} onPick={onPick} />}
      {stage.kind === "team_ties" && <Ties d={d} stage={stage} onPick={onPick} />}
      {st && st.groups.length > 0 && !bracketKinds.includes(stage.kind) && <Standings groups={st.groups} kind={st.kind} qualify={stage.kind === "round_robin" ? 0 : 0} />}
      {stage.kind === "round_robin" && (
        <details><summary className="cursor-pointer text-sm font-semibold">All pool matches ({ms.length})</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ms.map((m) => <MatchCard key={m.id} m={m} onClick={() => onPick?.(m)} />)}</div></details>
      )}
      {["swiss", "king_court", "shootout", "rotating", "americano", "mexicano", "ladder"].includes(stage.kind) && <Rounds matches={ms} onPick={onPick} />}
    </div>
  );
}
