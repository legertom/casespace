import { describe, expect, it } from "vitest";
import { cumulativeReach, distinctSplit } from "./pipeline-shapes";

/** Deterministic stand-in for Math.random, cycling a fixed sequence. */
function seeded(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("cumulative reach", () => {
  it("is a suffix sum", () => {
    expect(cumulativeReach([6, 1, 2, 2, 3, 3, 0])).toEqual([
      17, 11, 10, 8, 6, 3, 0,
    ]);
  });

  it("never rises as it moves along the pipeline", () => {
    const reach = cumulativeReach([12, 9, 6, 7, 4, 4, 3]);
    for (let i = 1; i < reach.length; i++)
      expect(reach[i]).toBeLessThanOrEqual(reach[i - 1]);
  });

  it("handles an empty pipeline", () => {
    expect(cumulativeReach([0, 0, 0])).toEqual([0, 0, 0]);
    expect(cumulativeReach([])).toEqual([]);
  });
});

describe("distinct split", () => {
  it("returns distinct positive counts summing to the total", () => {
    for (let seed = 0; seed < 200; seed++) {
      const split = distinctSplit(45, 7, seeded([seed / 200, 0.31, 0.77, 0.05]));
      expect(split).toHaveLength(7);
      expect(split.reduce((a, b) => a + b, 0)).toBe(45);
      expect(new Set(split).size).toBe(7);
      for (const v of split) expect(v).toBeGreaterThan(0);
    }
  });

  it("works across a range of totals and part counts", () => {
    for (let parts = 1; parts <= 8; parts++) {
      const cheapest = (parts * (parts + 1)) / 2;
      for (let total = cheapest; total <= cheapest + 40; total++) {
        const split = distinctSplit(total, parts, seeded([0.13, 0.62, 0.9]));
        expect(split.reduce((a, b) => a + b, 0)).toBe(total);
        expect(new Set(split).size).toBe(parts);
      }
    }
  });

  it("gives the cheapest split when the total leaves no room", () => {
    expect(distinctSplit(28, 7, seeded([0])).slice().sort((a, b) => a - b))
      .toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("refuses a total too small to split distinctly", () => {
    expect(() => distinctSplit(27, 7)).toThrow(/at least 28/);
    expect(() => distinctSplit(45, 0)).toThrow(/at least 1/);
  });

  it("is deterministic for a given random source", () => {
    const a = distinctSplit(45, 7, seeded([0.4, 0.1, 0.8, 0.55]));
    const b = distinctSplit(45, 7, seeded([0.4, 0.1, 0.8, 0.55]));
    expect(a).toEqual(b);
  });
});
