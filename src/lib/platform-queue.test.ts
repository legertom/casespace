import { describe, expect, it } from "vitest";
import { maxRankDepth, queueRanks } from "./platform-queue";

describe("queue ranks", () => {
  it("puts a small crowd in one rank", () => {
    expect(queueRanks(1, 8)).toEqual([1]);
    expect(queueRanks(8, 8)).toEqual([8]);
  });

  it("draws nothing for an empty stage", () => {
    expect(queueRanks(0, 8)).toEqual([]);
    expect(queueRanks(-3, 8)).toEqual([]);
  });

  it("balances rather than filling front ranks to capacity", () => {
    // Greedy would give 8 + 1; balanced never strands a lone figure.
    expect(queueRanks(9, 8)).toEqual([5, 4]);
    expect(queueRanks(30, 8)).toEqual([8, 8, 7, 7]);
  });

  it("never leaves a rank holding one when the crowd is bigger", () => {
    for (let count = 2; count <= 200; count++) {
      const ranks = queueRanks(count, 8);
      if (ranks.length > 1) expect(Math.min(...ranks)).toBeGreaterThan(1);
    }
  });

  it("keeps every rank within capacity and conserves the count", () => {
    for (let perRank = 1; perRank <= 12; perRank++) {
      for (let count = 0; count <= 200; count++) {
        const ranks = queueRanks(count, perRank);
        expect(ranks.reduce((a, b) => a + b, 0)).toBe(Math.max(0, count));
        for (const r of ranks) expect(r).toBeLessThanOrEqual(perRank);
      }
    }
  });

  it("uses the fewest ranks that fit", () => {
    expect(queueRanks(16, 8)).toHaveLength(2);
    expect(queueRanks(17, 8)).toHaveLength(3);
    expect(queueRanks(45, 8)).toHaveLength(6);
  });

  it("rejects a nonsense rank width", () => {
    expect(() => queueRanks(5, 0)).toThrow();
  });
});

describe("max rank depth", () => {
  it("is one when every stage is empty", () => {
    expect(maxRankDepth([0, 0, 0, 0, 0, 0, 0], 8)).toBe(1);
  });

  it("follows the busiest stage", () => {
    expect(maxRankDepth([6, 4, 30, 2, 1, 1, 1], 8)).toBe(4);
    expect(maxRankDepth([1, 1, 0, 1, 0, 1, 1], 8)).toBe(1);
  });
});
