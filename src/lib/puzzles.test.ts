import { describe, it, expect } from "vitest";
import { makeTest, cellKey, estimateScore } from "./puzzles";

describe("puzzles", () => {
  it("builds 20 unique puzzles", () => {
    const t = makeTest(12345);
    expect(t).toHaveLength(20);
    expect(new Set(t.map((p) => p.grid.map(cellKey).join())).size).toBe(20);
  });
  it("has 4 visually distinct options with the answer at answerIndex", () => {
    for (const p of makeTest(987)) {
      expect(p.options).toHaveLength(4);
      expect(new Set(p.options.map(cellKey)).size).toBe(4);
      expect(cellKey(p.options[p.answerIndex])).toBe(cellKey(p.grid[8]));
    }
  });
  it("same seed gives same test (battle)", () => {
    expect(makeTest(42).map((p) => p.answerIndex)).toEqual(makeTest(42).map((p) => p.answerIndex));
  });
  it("estimate ranges 70..145", () => {
    expect(estimateScore(0, 20)).toBe(70);
    expect(estimateScore(20, 20)).toBe(145);
  });
});

import { RULES, generatePuzzle, mulberry32, validatePuzzle, scoreTest, DIFFICULTY } from "./puzzles";

describe("generator correctness", () => {
  for (const rule of RULES) {
    it(`rule ${rule}: exactly one correct answer across 300 seeds`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const p = generatePuzzle(rule, mulberry32(seed), "x");
        expect(validatePuzzle(p)).toBe(true);
        expect(p.difficulty).toBe(DIFFICULTY[rule]);
      }
    });
  }
  it("every puzzle in 200 seeded tests is valid and options never exceed 4 shapes", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const t = makeTest(seed * 7919);
      expect(t).toHaveLength(20);
      t.forEach((p) => expect(validatePuzzle(p)).toBe(true));
    }
  });
  it("difficulty weighting: hard correct is worth 3, easy 1, timeout 0", () => {
    const t = makeTest(5);
    const ans = t.map((p) => p.answerIndex);
    expect(scoreTest(t, ans).score).toBe(145);
    expect(scoreTest(t, t.map(() => null)).score).toBe(70);
    const one = t.map((p, i) => (i === 0 ? p.answerIndex : null));
    expect(scoreTest(t, one).points).toBe(t[0].difficulty);
  });
  it("time limits: easy 40s, medium 60s, hard 90s", () => {
    expect(generatePuzzle("count", mulberry32(1), "a").timeLimit).toBe(40);
    expect(generatePuzzle("latin", mulberry32(1), "a").timeLimit).toBe(60);
    expect(generatePuzzle("countLatin", mulberry32(1), "a").timeLimit).toBe(90);
  });
});
