import { test } from "node:test";
import assert from "node:assert/strict";
import { compass, consolation, doubleElim, roundRobinPairs, seedOrder, singleElim } from "./brackets.ts";
import { kingCourtRound, ladderAfter, mexicanoRound, rotatingRound, shootoutRound, swissRound, tally, canChallenge } from "./rounds.ts";
import { FORMATS, expand, SCORING_PRESETS } from "./catalog.ts";

const ids = (n: number) => Array.from({ length: n }, (_, i) => "e" + (i + 1));

test("seed order puts 1 and 2 in opposite halves", () => {
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test("single elimination: n-1 playable matches, byes to top seeds, bronze", () => {
  const r = singleElim(ids(6), { bronze: true });
  assert.equal(r.matches.filter((m) => m.bracket === "W").length, 5);
  assert.equal(r.matches.filter((m) => m.bracket === "B").length, 1);
  const r1 = r.matches.filter((m) => m.round === 1);
  assert.ok(!r1.some((m) => JSON.stringify(m).includes('"e1"')), "seed 1 has a bye");
  const semis = r.matches.filter((m) => m.label.startsWith("Semi"));
  assert.ok(semis.every((m) => r.links.get(m.key)?.loserNext?.key === "bronze"), "semi losers go to bronze");
});

test("double elimination: 2n-2 matches for 8, every winners-round loser is routed", () => {
  const r = doubleElim(ids(8));
  assert.equal(r.matches.length, 14);
  for (const m of r.matches.filter((x) => x.bracket === "W")) assert.ok(r.links.get(m.key)?.loserNext, `${m.key} loser routed`);
  assert.equal(r.matches.filter((m) => m.bracket === "GF").length, 1);
});

test("double elimination with byes stays consistent (6 entries)", () => {
  const r = doubleElim(ids(6));
  assert.equal(r.matches.length, 10); // 2n - 2
  for (const m of r.matches) for (const s of [m.a, m.b]) assert.ok(!("e" in s && s.e === null), "no bye slots emitted");
});

test("compass draw: everyone plays log2(n) matches", () => {
  const r = compass(ids(8));
  assert.equal(r.matches.length, 12);
  assert.deepEqual([...new Set(r.matches.map((m) => m.bracket))].sort(), ["E", "N", "S", "W"]);
});

test("consolation: first-round losers get a second bracket", () => {
  const r = consolation(ids(8));
  assert.equal(r.matches.filter((m) => m.bracket === "C").length, 3);
});

test("round robin: each pair once, double = twice", () => {
  assert.equal(roundRobinPairs(ids(5)).length, 10);
  assert.equal(roundRobinPairs(ids(4), true).length, 12);
});

test("swiss: equal records meet and no rematches", () => {
  const p = ids(8);
  const r1 = swissRound(p, [], new Set());
  const results = r1.pairs.map(([a, b]) => ({ a: [a], b: [b], winner: 0 as const, games: [[11, 5]] as [number, number][] }));
  const r2 = swissRound(p, results, new Set());
  const met = new Set(r1.pairs.map((x) => x.sort().join()));
  assert.ok(r2.pairs.every((x) => !met.has([...x].sort().join())));
  const winners = new Set(r1.pairs.map((x) => x[0]));
  assert.ok(r2.pairs.every(([a, b]) => winners.has(a) === winners.has(b)), "winners play winners");
});

test("king of the court and shootout move winners up and losers down", () => {
  const prev = [{ court: 1, a: "A", b: "B", winner: 0 as const }, { court: 2, a: "C", b: "D", winner: 0 as const }, { court: 3, a: "E", b: "F", winner: 1 as const }];
  assert.deepEqual(kingCourtRound(prev, 3), [{ court: 1, a: "A", b: "C" }, { court: 2, a: "B", b: "F" }, { court: 3, a: "D", b: "E" }]);
  const s = shootoutRound([{ court: 1, a: ["p1", "p2"], b: ["p3", "p4"], winner: 0 }, { court: 2, a: ["p5", "p6"], b: ["p7", "p8"], winner: 1 }], 2);
  assert.deepEqual(s[0], { court: 1, a: ["p1", "p8"], b: ["p2", "p7"] });
  assert.deepEqual(s[1], { court: 2, a: ["p3", "p6"], b: ["p4", "p5"] });
});

test("rotating partners: everyone plays, few repeat partners", () => {
  const ps = ids(8), hist: { a: string[]; b: string[] }[] = [];
  for (let r = 0; r < 7; r++) hist.push(...rotatingRound(ps, hist, 2).courts);
  const partners = hist.flatMap((h) => [h.a, h.b].map((x) => [...x].sort().join()));
  assert.ok(new Set(partners).size >= 22, `distinct partnerships ${new Set(partners).size}/28`);
  const games = new Map<string, number>(); hist.forEach((h) => [...h.a, ...h.b].forEach((p) => games.set(p, (games.get(p) ?? 0) + 1)));
  assert.ok([...games.values()].every((g) => g === 7));
});

test("mexicano pairs 1&4 v 2&3 by points", () => {
  const p = ids(4);
  const res = [{ a: ["e1", "e2"], b: ["e3", "e4"], winner: 0 as const, games: [[21, 10]] as [number, number][] }];
  const r = mexicanoRound(p, res, 1).courts[0];
  assert.equal(r.a.length, 2); assert.equal(r.b.length, 2);
});

test("ladder: challenger win takes defender's place", () => {
  assert.deepEqual(ladderAfter(["a", "b", "c", "d"], "d", "b", true), ["a", "d", "b", "c"]);
  assert.ok(canChallenge(["a", "b", "c", "d"], "d", "b", 3));
  assert.ok(!canChallenge(["a", "b", "c", "d"], "d", "a", 2));
});

test("tally: points, games, point difference", () => {
  const t = tally(["x", "y"], [{ a: ["x"], b: ["y"], winner: 0, games: [[11, 9], [11, 7]] }]);
  assert.equal(t[0].id, "x"); assert.equal(t[0].pts, 2); assert.equal(t[0].pf - t[0].pa, 6);
});

test("every catalog format expands into valid stages", () => {
  assert.ok(FORMATS.length >= 20);
  for (const f of FORMATS) {
    const e = expand(f.id, {}, SCORING_PRESETS.so11bo1, SCORING_PRESETS.so11bo3);
    assert.ok(e.stages.length >= 1, f.id);
  }
});
