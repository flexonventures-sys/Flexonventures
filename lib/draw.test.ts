import { test } from "node:test";
import assert from "node:assert/strict";
import { makeGroups, roundRobin, crossover, seededBracket, schedule, lineupWindow } from "./draw.ts";

const E = (n: number) => Array.from({ length: n }, (_, i) => ({ id: "e" + (i + 1), seed: i + 1 }));

test("snake seeding spreads top seeds", () => {
  const g = makeGroups(E(8), 2).map((x) => x.map((e) => e.seed));
  assert.deepEqual(g, [[1, 4, 5, 8], [2, 3, 6, 7]]);
});

test("round robin: everyone meets once", () => {
  const m = roundRobin(["a", "b", "c", "d", "e"]);
  assert.equal(m.length, 10);
  const keys = new Set(m.map((x) => [x.a, x.b].sort().join()));
  assert.equal(keys.size, 10);
});

test("group winners meet other group's runner-up", () => {
  assert.deepEqual(crossover([["A1", "A2"], ["B1", "B2"]]), [["A1", "B2"], ["B1", "A2"]]);
});

test("bracket pads with byes", () => {
  const b = seededBracket(E(5));
  assert.equal(b.length, 4);
  assert.equal(b[0][1], null);
});

test("schedule never double-books a player", () => {
  const s = schedule([{ players: ["a", "b"] }, { players: ["a", "c"] }, { players: ["d", "e"] }], new Date("2026-12-13T09:00:00+05:30"), 30, 2);
  assert.equal(s[0].court, 1); assert.equal(s[1].court, 2); assert.deepEqual(s[1].players, ["d", "e"]);
  assert.equal(s[2].at.getTime() - s[0].at.getTime(), 30 * 60_000);
});

test("lineup window is the 30 minutes before the tie", () => {
  const w = lineupWindow(new Date("2026-11-07T16:00:00+05:30"));
  assert.equal(w.opens.toISOString(), new Date("2026-11-07T15:30:00+05:30").toISOString());
});
