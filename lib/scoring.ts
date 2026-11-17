// Pickleball scoring engine. Every rally is one event; the score is replayed from the log,
// so undo, corrections, audit history and stats stay consistent (proposal section 10).
// Mirrors replay() in the prototype so server and client always agree.

export type Format = {
  type: "sideout" | "rally"; to: number; bo: number; dbl: boolean;
  winBy?: number;   // default 2; 1 = first to `to`
  cap?: number;     // hard cap: first to `cap` wins even if only 1 ahead
  freeze?: number;  // rally scoring freeze (MLP DreamBreaker): from this score a receiving side wins only the serve
};
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

const winBy = (f: Format) => f.winBy ?? 2;
function gameOver(f: Format, sc: [number, number]) {
  const hi = Math.max(sc[0], sc[1]), lo = Math.min(sc[0], sc[1]);
  if (f.cap && hi >= f.cap) return hi > lo;
  return hi >= f.to && hi - lo >= winBy(f);
}

export function replay(fmt: Format, log: Rally[]): ScoreState {
  const need = Math.ceil(fmt.bo / 2);
  const start = (): 1 | 2 => (fmt.type === "sideout" && fmt.dbl ? 2 : 1); // first serve of a game: one server only
  const s: ScoreState = { games: [], sc: [0, 0], srv: 0, num: start(), gw: [0, 0], done: false, winner: null };
  for (const e of log) {
    if (s.done) break;
    const w = e.w;
    if (fmt.type === "rally") {
      if (w !== s.srv && fmt.freeze && s.sc[w] >= fmt.freeze) { s.srv = w; s.num = 1; } // frozen: side out only
      else { s.sc[w]++; if (w !== s.srv) { s.srv = w; s.num = 1; } }
    } else if (w === s.srv) {
      s.sc[w]++;
    } else if (fmt.dbl && s.num === 1) {
      s.num = 2;
    } else {
      s.srv = (1 - s.srv) as 0 | 1; s.num = 1;
    }
    if (gameOver(fmt, s.sc)) {
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
    if (!gameOver(fmt, [hi, lo])) return false;
    // no points after the game was already won (except the deciding rally)
    if (fmt.cap && hi > fmt.cap) return false;
    const capped = fmt.cap && hi === fmt.cap;
    if (!capped && hi > fmt.to && hi - lo !== winBy(fmt)) return false;
    gw[a > b ? 0 : 1]++;
    if (gw[0] > need || gw[1] > need) return false;
  }
  return Math.max(gw[0], gw[1]) === need;
}
