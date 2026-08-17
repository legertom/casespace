/**
 * Shared arithmetic behind the pipeline drawings on /graphs.
 *
 * Nothing here knows about SVG — these are the two numbers the shapes are
 * built from (how many reached a stage, and a stress-test distribution), kept
 * pure so they can be tested without rendering anything.
 */

/**
 * How many records reached each stage **or any stage beyond it**, given the
 * count sitting at each. A suffix sum, so it can only fall as you move along
 * the pipeline — which is exactly why a chart built on it always looks
 * plausible and can never warn you that the data is strange.
 */
export function cumulativeReach(counts: number[]): number[] {
  const out = new Array<number>(counts.length);
  let running = 0;
  for (let i = counts.length - 1; i >= 0; i--) {
    running += counts[i];
    out[i] = running;
  }
  return out;
}

/**
 * A stress-test distribution: `parts` distinct positive counts summing to
 * `total`, in random stage order.
 *
 * Distinct is the point — it stops two stages coincidentally matching and
 * flattering a design that can't separate close values. Built from the gaps
 * between the sorted values rather than by rejection sampling, so it always
 * terminates: the smallest value costs `parts` to raise by one, the largest
 * costs 1, and the cheapest legal split is 1, 2, … parts.
 */
export function distinctSplit(
  total: number,
  parts: number,
  rng: () => number = Math.random,
): number[] {
  if (parts < 1) throw new Error("parts must be at least 1");
  const cheapest = (parts * (parts + 1)) / 2;
  if (total < cheapest)
    throw new Error(
      `${parts} distinct positive counts need a total of at least ${cheapest}`,
    );

  const weights = Array.from({ length: parts }, (_, i) => parts - i);
  const gaps = new Array<number>(parts).fill(1);
  let left = total - cheapest;
  while (left > 0) {
    const affordable: number[] = [];
    for (let i = 0; i < parts; i++) if (weights[i] <= left) affordable.push(i);
    const pick = affordable[Math.floor(rng() * affordable.length)];
    gaps[pick] += 1;
    left -= weights[pick];
  }

  const values: number[] = [];
  let running = 0;
  for (let i = 0; i < parts; i++) {
    running += gaps[i];
    values.push(running);
  }

  // Shuffle, so a stage's count isn't tied to its place in the pipeline.
  for (let i = parts - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
