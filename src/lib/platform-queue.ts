/**
 * Rank layout for the pipeline's platform queues — how a crowd of records
 * waiting at one status splits into rows of standing figures.
 *
 * Balanced rather than greedy: a greedy fill leaves the back rank holding
 * whatever is left over, so 30 at ten-per-rank comes out 10 + 9 + 10 + 1 and
 * one figure stands alone. Spreading the same count evenly over the same
 * number of ranks can never produce a straggler, and costs nothing.
 */

/**
 * Figures per rank, front rank first. Rank count is the fewest that fit, so
 * a crowd grows deeper rather than denser and a figure is the same size at
 * every station.
 */
export function queueRanks(count: number, perRank: number): number[] {
  if (count <= 0) return [];
  if (perRank < 1) throw new Error("perRank must be at least 1");
  const ranks = Math.ceil(count / perRank);
  const base = Math.floor(count / ranks);
  const extra = count % ranks;
  return Array.from({ length: ranks }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Deepest crowd across the whole pipeline — what the drawing has to fit. */
export function maxRankDepth(counts: number[], perRank: number): number {
  return Math.max(1, ...counts.map((c) => queueRanks(c, perRank).length));
}
