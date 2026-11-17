import { test } from "node:test";
import assert from "node:assert/strict";
import { replay, scoreCall, validGames, type Format } from "./scoring.ts";

const SO: Format = { type: "sideout", to: 11, bo: 3, dbl: true };
const RS: Format = { type: "rally", to: 15, bo: 1, dbl: false };
const rallies = (s: string) => [...s].map((c) => ({ w: (+c) as 0 | 1 }));

test("doubles game starts at 0-0-2 and side-outs after one fault", () => {
  assert.equal(scoreCall(SO, replay(SO, [])), "0–0–2");
  const s = replay(SO, rallies("1"));
  assert.equal(s.srv, 1); assert.equal(s.num, 1);
});

test("second server before side out", () => {
  const s = replay(SO, rallies("1" + "1" + "0"));   // B gets serve, scores, then first fault -> server 2
  assert.equal(s.sc[1], 1); assert.equal(s.num, 2); assert.equal(s.srv, 1);
});

test("rally scoring: every rally is a point, win by 2", () => {
  const s = replay(RS, rallies("0".repeat(14) + "1".repeat(14) + "00"));
  assert.equal(s.done, true); assert.deepEqual(s.games, [[16, 14]]);
});

test("validGames enforces win by 2 and enough games", () => {
  assert.ok(validGames(SO, [[11, 7], [11, 9]]));
  assert.ok(validGames(SO, [[11, 4], [9, 11], [12, 10]]));
  assert.ok(!validGames(SO, [[11, 10], [11, 9]]));
  assert.ok(!validGames(SO, [[11, 7]]));
});
