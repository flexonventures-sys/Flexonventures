// Round-by-round formats: Swiss, King of the Court / Up & Down the River, rotating partners
// (mixer / Americano / scramble), Mexicano, ladder. Each takes the current state and the results so far
// and returns the next round. Pure functions.

export type Result = { a: string[]; b: string[]; winner: 0 | 1 | null; games: [number, number][]; court?: number | null; round?: number | null };

export type Row = { id: string; played: number; won: number; lost: number; gf: number; ga: number; pf: number; pa: number; pts: number };

/** Standings for any set of participants from completed results. `keyOf` maps a side to a participant key (entry or player). */
export function tally(ids: string[], results: Result[], ppw = 2, perPlayer = false): Row[] {
  const rows = new Map(ids.map((id) => [id, { id, played: 0, won: 0, lost: 0, gf: 0, ga: 0, pf: 0, pa: 0, pts: 0 }]));
  for (const r of results) {
    if (r.winner === null) continue;
    const sides = perPlayer ? [r.a, r.b] : [[r.a[0]], [r.b[0]]];
    sides.forEach((members, side) => {
      for (const id of members) {
        const row = rows.get(id); if (!row) continue;
        row.played++;
        if (r.winner === side) { row.won++; row.pts += ppw; } else row.lost++;
        for (const g of r.games) {
          const me = g[side], them = g[1 - side];
          row.pf += me; row.pa += them;
          if (me > them) row.gf++; else row.ga++;
        }
      }
    });
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || (y.pf - y.pa) - (x.pf - x.pa) || y.pf - x.pf);
}

/** Swiss pairing: similar scores meet, no rematches where avoidable, lowest-ranked without a bye gets one. */
export function swissRound(ids: string[], results: Result[], byesHad: Set<string>) {
  const table = tally(ids, results).map((r) => r.id);
  const met = new Set(results.map((r) => [r.a[0], r.b[0]].sort().join("|")));
  let pool = [...table], bye: string | null = null;
  if (pool.length % 2) {
    const i = [...pool].reverse().findIndex((id) => !byesHad.has(id));
    bye = [...pool].reverse()[i < 0 ? 0 : i];
    pool = pool.filter((id) => id !== bye);
  }
  const pairs: [string, string][] = [];
  const solve = (left: string[]): boolean => {
    if (!left.length) return true;
    const [first, ...rest] = left;
    for (let j = 0; j < rest.length; j++) {
      if (met.has([first, rest[j]].sort().join("|")) && j < rest.length - 1) continue;
      pairs.push([first, rest[j]]);
      if (solve(rest.filter((_, k) => k !== j))) return true;
      pairs.pop();
    }
    return false;
  };
  solve(pool);
  return { pairs, bye };
}

/**
 * Court promotion used by King of the Court and Up & Down the River. Court 1 is the top court.
 * Court 1 next round: its winner + court 2's winner. Middle court c: loser from c-1 + winner from c+1.
 * Bottom court: loser from the court above + its own loser. With one court, the same two sides replay.
 */
function promote<T>(by: Map<number, { w: T; l: T }>, courts: number) {
  const out: { court: number; top: T; bottom: T }[] = [];
  if (courts === 1) return [{ court: 1, top: by.get(1)!.w, bottom: by.get(1)!.l }];
  for (let c = 1; c <= courts; c++) {
    if (c === 1) out.push({ court: 1, top: by.get(1)!.w, bottom: by.get(2)!.w });
    else if (c === courts) out.push({ court: c, top: by.get(c - 1)!.l, bottom: by.get(c)!.l });
    else out.push({ court: c, top: by.get(c - 1)!.l, bottom: by.get(c + 1)!.w });
  }
  return out;
}

/** King of the Court with fixed pairs (entries). */
export function kingCourtRound(prev: { court: number; a: string; b: string; winner: 0 | 1 }[], courts: number) {
  const by = new Map(prev.map((m) => [m.court, { w: m.winner === 0 ? m.a : m.b, l: m.winner === 0 ? m.b : m.a }]));
  return promote(by, courts).map((x) => ({ court: x.court, a: x.top, b: x.bottom }));
}

/** Shootout / Up & Down the River with split partners: 4 players a court, winners up, losers down, partners split. */
export function shootoutRound(prev: { court: number; a: string[]; b: string[]; winner: 0 | 1 }[], courts: number) {
  const by = new Map(prev.map((m) => [m.court, { w: m.winner === 0 ? m.a : m.b, l: m.winner === 0 ? m.b : m.a }]));
  return promote(by, courts).map((x) => ({ court: x.court, a: [x.top[0], x.bottom[1]], b: [x.top[1], x.bottom[0]] }));
}

/** Deterministic PRNG so schedules are reproducible. */
export function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/**
 * Rotating partners (mixer / Americano / scramble): each round, players are placed in foursomes on courts
 * minimising repeat partners and opponents; sit-outs rotate to whoever has played most.
 */
export function rotatingRound(players: string[], history: { a: string[]; b: string[] }[], courts: number, seed = 1, random = false) {
  const r = rng(seed + history.length * 7919);
  const games = new Map(players.map((p) => [p, 0]));
  const partner = new Map<string, number>(), opp = new Map<string, number>();
  const k = (x: string, y: string) => [x, y].sort().join("|");
  for (const h of history) {
    [...h.a, ...h.b].forEach((p) => games.set(p, (games.get(p) ?? 0) + 1));
    partner.set(k(h.a[0], h.a[1]), (partner.get(k(h.a[0], h.a[1])) ?? 0) + 1);
    partner.set(k(h.b[0], h.b[1]), (partner.get(k(h.b[0], h.b[1])) ?? 0) + 1);
    for (const x of h.a) for (const y of h.b) opp.set(k(x, y), (opp.get(k(x, y)) ?? 0) + 1);
  }
  const slots = Math.min(courts, Math.floor(players.length / 4)) * 4;
  const order = [...players].sort((x, y) => games.get(x)! - games.get(y)! || r() - 0.5);
  const playing = order.slice(0, slots), sitting = order.slice(slots);
  if (random) {
    const sh = [...playing].sort(() => r() - 0.5);
    return { courts: Array.from({ length: slots / 4 }, (_, c) => ({ court: c + 1, a: [sh[c * 4], sh[c * 4 + 1]], b: [sh[c * 4 + 2], sh[c * 4 + 3]] })), sitting };
  }
  const cost = (a: string[], b: string[]) =>
    10 * ((partner.get(k(a[0], a[1])) ?? 0) + (partner.get(k(b[0], b[1])) ?? 0)) + a.reduce((s, x) => s + b.reduce((t, y) => t + (opp.get(k(x, y)) ?? 0), 0), 0);
  let best: { court: number; a: string[]; b: string[] }[] = [], bestCost = Infinity;
  for (let attempt = 0; attempt < 60; attempt++) {
    const pool = [...playing].sort(() => r() - 0.5);
    const out: { court: number; a: string[]; b: string[] }[] = [];
    let total = 0;
    for (let c = 0; c < slots / 4; c++) {
      const [p, q, s, t] = pool.slice(c * 4, c * 4 + 4);
      const opts: [string[], string[]][] = [[[p, q], [s, t]], [[p, s], [q, t]], [[p, t], [q, s]]];
      const pick = opts.reduce((m, o) => (cost(o[0], o[1]) < cost(m[0], m[1]) ? o : m));
      total += cost(pick[0], pick[1]);
      out.push({ court: c + 1, a: pick[0], b: pick[1] });
    }
    if (total < bestCost) { best = out; bestCost = total; if (total === 0) break; }
  }
  return { courts: best, sitting };
}

/** Mexicano: rank by points so far, then courts of four in rank order, 1st & 4th vs 2nd & 3rd. */
export function mexicanoRound(players: string[], results: Result[], courts: number) {
  const table = results.length ? tally(players, results, 0, true).sort((x, y) => y.pf - x.pf || y.won - x.won).map((x) => x.id) : players;
  const slots = Math.min(courts, Math.floor(table.length / 4)) * 4;
  return {
    courts: Array.from({ length: slots / 4 }, (_, c) => {
      const [p1, p2, p3, p4] = table.slice(c * 4, c * 4 + 4);
      return { court: c + 1, a: [p1, p4], b: [p2, p3] };
    }),
    sitting: table.slice(slots),
  };
}

/** Ladder: a challenger may challenge up to `reach` places above. A challenger win takes the opponent's place. */
export function ladderAfter(order: string[], challenger: string, defender: string, challengerWon: boolean) {
  if (!challengerWon) return order;
  const out = order.filter((x) => x !== challenger);
  out.splice(out.indexOf(defender), 0, challenger);
  return out;
}
export function canChallenge(order: string[], challenger: string, defender: string, reach: number) {
  const c = order.indexOf(challenger), d = order.indexOf(defender);
  return c > d && d >= 0 && c - d <= reach;
}
