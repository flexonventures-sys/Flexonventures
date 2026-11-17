// Symbolic bracket construction. Every slot has a source: a known entry, a bye, or the winner/loser
// of another match. Matches decided by a bye are resolved statically and never emitted, so the
// stored bracket only contains playable matches with correct winner/loser routing.

export type Src = { e: string | null } | { w: string } | { l: string };
export const BYE: Src = { e: null };
export const isBye = (s: Src) => "e" in s && s.e === null;

export type Spec = {
  key: string; bracket: string; round: number; position: number; label: string;
  a: Src; b: Src;
  sideA?: string[]; sideB?: string[];   // explicit players (rotating-partner formats)
  court?: number; event?: string;
};

/** Standard seed order for a bracket of size n: 1 v n, then n/2 v n/2+1 ... */
export function seedOrder(n: number): number[] {
  let order = [1];
  while (order.length < n) {
    const m = order.length * 2 + 1;
    order = order.flatMap((s) => [s, m - s]);
  }
  return order;
}
export const pow2 = (n: number) => { let p = 1; while (p < n) p *= 2; return p; };

const ROUND = (left: number) => (left === 1 ? "Final" : left === 2 ? "Semi-final" : left === 4 ? "Quarter-final" : `Round of ${left * 2}`);

/** Single elimination over sources already in bracket order (length = power of 2). */
export function elim(sources: Src[], bracket: string, prefix: string, labelPrefix = "") {
  const specs: Spec[] = [];
  const losersByRound: Src[][] = [];
  let cur = sources, round = 1;
  while (cur.length > 1) {
    const next: Src[] = [], losers: Src[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const key = `${prefix}r${round}m${i / 2 + 1}`;
      specs.push({ key, bracket, round, position: i / 2 + 1, label: `${labelPrefix}${ROUND(cur.length / 2)} ${cur.length > 2 ? i / 2 + 1 : ""}`.trim(), a: cur[i], b: cur[i + 1] });
      next.push({ w: key }); losers.push({ l: key });
    }
    losersByRound.push(losers);
    cur = next; round++;
  }
  return { specs, champion: cur[0], losersByRound };
}

/** Seeded single elimination with byes for the top seeds. */
export function singleElim(entryIds: string[], opts: { bronze?: boolean } = {}) {
  const n = pow2(Math.max(2, entryIds.length));
  const srcs = seedOrder(n).map((s) => (s <= entryIds.length ? { e: entryIds[s - 1] } : BYE));
  const main = elim(srcs, "W", "w");
  const specs = [...main.specs];
  if (opts.bronze && main.losersByRound.length >= 2) {
    const semis = main.losersByRound[main.losersByRound.length - 2];
    specs.push({ key: "bronze", bracket: "B", round: main.losersByRound.length, position: 2, label: "Bronze medal match", a: semis[0], b: semis[1] });
  }
  return resolve(specs);
}

/** Double elimination: winners bracket, losers bracket fed by each winners round, grand final. */
export function doubleElim(entryIds: string[], opts: { reset?: boolean } = {}) {
  const n = pow2(Math.max(2, entryIds.length));
  const srcs = seedOrder(n).map((s) => (s <= entryIds.length ? { e: entryIds[s - 1] } : BYE));
  const W = elim(srcs, "W", "w", "Winners ");
  const specs = [...W.specs];
  let lr = 1, survivors: Src[] = [];
  const pair = (list: Src[], tag: string) => {
    const out: Src[] = [];
    for (let i = 0; i < list.length; i += 2) {
      const key = `l${lr}m${i / 2 + 1}`;
      specs.push({ key, bracket: "L", round: lr, position: i / 2 + 1, label: `Losers round ${lr}${tag}`, a: list[i], b: list[i + 1] });
      out.push({ w: key });
    }
    lr++;
    return out;
  };
  if (W.losersByRound.length === 1) {
    // two players: winner of the only match vs loser in a decider
    specs.push({ key: "gf", bracket: "GF", round: 1, position: 1, label: "Grand final", a: W.champion, b: W.losersByRound[0][0] });
    return resolve(specs);
  }
  survivors = pair(W.losersByRound[0], "");
  for (let r = 1; r < W.losersByRound.length; r++) {
    const drop = r % 2 ? [...W.losersByRound[r]].reverse() : W.losersByRound[r]; // reverse to avoid early rematches
    survivors = pair(survivors.flatMap((s, i) => [s, drop[i]]), "");
    if (survivors.length > 1) survivors = pair(survivors, "");
  }
  specs.push({ key: "gf", bracket: "GF", round: 1, position: 1, label: "Grand final", a: W.champion, b: survivors[0] });
  if (opts.reset) specs.push({ key: "gf2", bracket: "GF", round: 2, position: 1, label: "Grand final reset (if needed)", a: { w: "gf" }, b: { l: "gf" } });
  return resolve(specs);
}

const COMPASS = ["East", "West", "North", "South", "Northeast", "Northwest", "Southeast", "Southwest"];
/** Compass draw: every round's losers drop into a new direction bracket; everyone plays the same number of matches. */
export function compass(entryIds: string[]) {
  const n = pow2(Math.max(2, entryIds.length));
  const srcs = seedOrder(n).map((s) => (s <= entryIds.length ? { e: entryIds[s - 1] } : BYE));
  const specs: Spec[] = [];
  let next = 0;
  const queue: { srcs: Src[] }[] = [{ srcs }];
  while (queue.length) {
    const { srcs: s } = queue.shift()!;
    const name = COMPASS[next] ?? `Flight ${next + 1}`, code = name.replace(/[a-z]/g, "") || `F${next + 1}`;
    next++;
    const b = elim(s, code, `${code.toLowerCase()}`, `${name} `);
    specs.push(...b.specs);
    b.losersByRound.slice(0, -1).forEach((losers) => { if (losers.length >= 2) queue.push({ srcs: losers }); });
  }
  return resolve(specs);
}

/** Main draw plus a consolation bracket for first-round losers. */
export function consolation(entryIds: string[]) {
  const n = pow2(Math.max(2, entryIds.length));
  const srcs = seedOrder(n).map((s) => (s <= entryIds.length ? { e: entryIds[s - 1] } : BYE));
  const main = elim(srcs, "W", "w");
  const cons = main.losersByRound[0].length >= 2 ? elim(main.losersByRound[0], "C", "c", "Consolation ").specs : [];
  return resolve([...main.specs, ...cons]);
}

/**
 * Remove matches decided by byes, substituting their outcome forward. Returns playable matches and
 * the links to store: next (winner goes to) and loserNext (loser goes to).
 */
export function resolve(specs: Spec[]) {
  const outcome = new Map<string, { w: Src; l: Src }>();
  const sub = (s: Src): Src => {
    if ("w" in s && outcome.has(s.w)) return sub(outcome.get(s.w)!.w);
    if ("l" in s && outcome.has(s.l)) return sub(outcome.get(s.l)!.l);
    return s;
  };
  const kept: Spec[] = [];
  for (const sp of specs) {
    const a = sub(sp.a), b = sub(sp.b);
    if (isBye(a) || isBye(b)) { outcome.set(sp.key, isBye(a) ? { w: b, l: BYE } : { w: a, l: BYE }); continue; }
    kept.push({ ...sp, a, b });
  }
  const links = new Map<string, { next?: { key: string; slot: 0 | 1 }; loserNext?: { key: string; slot: 0 | 1 } }>();
  for (const sp of kept)
    ([[sp.a, 0], [sp.b, 1]] as const).forEach(([s, slot]) => {
      if ("w" in s) links.set(s.w, { ...links.get(s.w), next: { key: sp.key, slot } });
      if ("l" in s) links.set(s.l, { ...links.get(s.l), loserNext: { key: sp.key, slot } });
    });
  return { matches: kept, links };
}

/** Circle-method round robin over items; each pair once (or twice when double). */
export function roundRobinPairs<T>(items: T[], double = false) {
  const list: (T | null)[] = [...items];
  if (list.length % 2) list.push(null);
  const n = list.length, out: { round: number; a: T; b: T }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a !== null && b !== null) out.push({ round: r + 1, a: r % 2 ? b : a, b: r % 2 ? a : b });
    }
    list.splice(1, 0, list.pop()!);
  }
  if (double) return [...out, ...out.map((m) => ({ round: m.round + n - 1, a: m.b, b: m.a }))];
  return out;
}
