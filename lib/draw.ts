// Draw and schedule generation (proposal sections 6, 11; walkthrough page 19).
// Pure functions so they are unit-tested and reusable by the API and future native apps.

export type Seeded = { id: string; seed?: number | null };

/** Spread seeds across groups with a snake: 1→A, 2→B, 3→B, 4→A ... */
export function makeGroups<T extends Seeded>(entries: T[], groupCount: number): T[][] {
  const sorted = [...entries].sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9));
  const groups: T[][] = Array.from({ length: Math.max(1, groupCount) }, () => []);
  sorted.forEach((e, i) => {
    const row = Math.floor(i / groups.length), col = i % groups.length;
    groups[row % 2 ? groups.length - 1 - col : col].push(e);
  });
  return groups;
}

/** Circle-method round robin: every pair meets once, spread over rounds. */
export function roundRobin<T>(items: T[]): { round: number; a: T; b: T }[] {
  const list: (T | null)[] = [...items];
  if (list.length % 2) list.push(null);
  const n = list.length, out: { round: number; a: T; b: T }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i], b = list[n - 1 - i];
      if (a !== null && b !== null) out.push({ round: r + 1, a, b });
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

/**
 * Knockout seeding from group finishers: group winners meet other groups' runners-up
 * (proposal section 21). `qualified[g]` is the ordered finishers of group g.
 */
export function crossover<T>(qualified: T[][]): [T, T][] {
  const g = qualified.length;
  if (g === 1) { const q = qualified[0]; return Array.from({ length: Math.floor(q.length / 2) }, (_, i) => [q[i], q[q.length - 1 - i]]); }
  const pairs: [T, T][] = [];
  const adv = Math.min(...qualified.map((q) => q.length));
  for (let place = 0; place < adv; place += 2)
    for (let i = 0; i < g; i++) {
      const top = qualified[i][place], other = qualified[(i + 1) % g][place + 1];
      if (top !== undefined && other !== undefined) pairs.push([top, other]);
    }
  return pairs;
}

/** Straight knockout from seeds (1 v N, 2 v N-1 ...), padded with byes (null). */
export function seededBracket<T extends Seeded>(entries: T[]): [T | null, T | null][] {
  const sorted = [...entries].sort((a, b) => (a.seed ?? 1e9) - (b.seed ?? 1e9));
  let size = 1; while (size < sorted.length) size *= 2;
  const slots: (T | null)[] = [...sorted, ...Array(size - sorted.length).fill(null)];
  return Array.from({ length: size / 2 }, (_, i) => [slots[i], slots[size - 1 - i]]);
}

export const roundName = (matchesInRound: number) =>
  ({ 1: "Final", 2: "Semi-final", 4: "Quarter-final" } as Record<number, string>)[matchesInRound] ?? `Round of ${matchesInRound * 2}`;

/**
 * Schedule from first match time, match length and courts. Keeps a player off two courts
 * at once by pushing a match to the next slot when any player is already busy.
 */
export function schedule<M extends { players: string[] }>(matches: M[], start: Date, minutes: number, courts: number): (M & { at: Date; court: number })[] {
  const out: (M & { at: Date; court: number })[] = [];
  const queue = [...matches];
  let slot = 0;
  while (queue.length) {
    const busy = new Set<string>();
    for (let c = 1; c <= courts && queue.length; c++) {
      const i = queue.findIndex((m) => m.players.every((p) => !busy.has(p)));
      if (i < 0) break;
      const [m] = queue.splice(i, 1);
      m.players.forEach((p) => busy.add(p));
      out.push({ ...m, at: new Date(start.getTime() + slot * minutes * 60_000), court: c });
    }
    slot++;
  }
  return out;
}

/** Team lineup window: opens 30 minutes before the tie and closes at the start (section 8). */
export function lineupWindow(tieAt: Date) {
  return { opens: new Date(tieAt.getTime() - 30 * 60_000), closes: tieAt };
}
