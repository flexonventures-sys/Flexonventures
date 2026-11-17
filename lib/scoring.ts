// Pickleball scoring engine. Every rally is one event; the score is replayed from the log,
// so undo, corrections, audit history and stats stay consistent (proposal section 10).
// Mirrors replay() in the prototype so server and client always agree.

export type Format = { type: "sideout" | "rally"; to: number; bo: number; dbl: boolean };
export type Rally = { w: 0 | 1 };
export type ScoreState = {
  games: [number, number][];
  sc: [number, number];
  srv: 0 | 1;
  num: 1 | 2;
  gw: [number, number];
  done: boolean;
  winner: 0 | 1 | null;
};

export function replay(fmt: Format, log: Rally[]): ScoreState {
  const need = Math.ceil(fmt.bo / 2);
  const start = (): 1 | 2 => (fmt.type === "sideout" && fmt.dbl ? 2 : 1); // first serve of a game: one server only
  const s: ScoreState = { games: [], sc: [0, 0], srv: 0, num: start(), gw: [0, 0], done: false, winner: null };
  for (const e of log) {
    if (s.done) break;
    const w = e.w;
    if (fmt.type === "rally") {
      s.sc[w]++;
      if (w !== s.srv) { s.srv = w; s.num = 1; }
    } else if (w === s.srv) {
      s.sc[w]++;
    } else if (fmt.dbl && s.num === 1) {
      s.num = 2;
    } else {
      s.srv = (1 - s.srv) as 0 | 1; s.num = 1;
    }
    if (Math.max(s.sc[0], s.sc[1]) >= fmt.to && Math.abs(s.sc[0] - s.sc[1]) >= 2) {
      const g = s.sc[0] > s.sc[1] ? 0 : 1;
      s.games.push([s.sc[0], s.sc[1]]);
      s.gw[g]++;
      if (s.gw[g] >= need) { s.done = true; s.winner = g; }
      else { s.sc = [0, 0]; s.srv = (s.games.length % 2) as 0 | 1; s.num = start(); }
    }
  }
  return s;
}

/** Official score call, e.g. "6–6–2" for doubles side-out, "8–5" otherwise. */
export function scoreCall(fmt: Format, s: ScoreState): string {
  if (s.done) return "Final";
  const a = s.sc[s.srv], b = s.sc[1 - s.srv];
  return fmt.type === "sideout" && fmt.dbl ? `${a}–${b}–${s.num}` : `${a}–${b}`;
}

/** Validate games submitted for lock against the format (win by 2, enough games). */
export function validGames(fmt: Format, games: [number, number][]): boolean {
  const need = Math.ceil(fmt.bo / 2);
  const gw = [0, 0];
  for (const [a, b] of games) {
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi < fmt.to || hi - lo < 2 || (hi > fmt.to && hi - lo !== 2)) return false;
    gw[a > b ? 0 : 1]++;
    if (gw[0] > need || gw[1] > need) return false;
  }
  return Math.max(gw[0], gw[1]) === need;
}
