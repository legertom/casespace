import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STATUSES, STATUS_LABELS, type UcStatus } from "@/lib/domain";
import { PipelineConversion } from "./pipeline-conversion";

const CASES: Record<string, number[]> = {
  live: [6, 1, 2, 2, 3, 2, 1],
  target: [12, 9, 6, 7, 4, 4, 3],
  empty: [0, 0, 0, 0, 0, 0, 0],
  single: [1, 0, 0, 0, 0, 0, 0],
  allAtOnce: [45, 0, 0, 0, 0, 0, 0],
  onlyAtTheEnd: [0, 0, 0, 0, 0, 0, 9],
};

function draw(counts: number[]): string {
  const byStatus = Object.fromEntries(
    STATUSES.map((s, i) => [s, counts[i]]),
  ) as Record<UcStatus, number>;
  return renderToStaticMarkup(createElement(PipelineConversion, { byStatus }));
}

describe("the pipeline as a conversion report", () => {
  for (const [label, counts] of Object.entries(CASES)) {
    it(`renders sane geometry for ${label}`, () => {
      const markup = draw(counts);
      expect(markup).toContain("<svg");
      expect(markup).not.toContain("NaN");
      expect(markup).not.toMatch(/(width|height)="-/);
    });
  }

  /**
   * The solid bar is what a click delivers; the pale one is what the row
   * claims. Solid may never exceed pale, or the chart promises less than it
   * hands over.
   */
  it("never draws more here-now than reached-or-beyond", () => {
    for (const [label, counts] of Object.entries(CASES)) {
      const markup = draw(counts);
      const bars = [...markup.matchAll(/<rect[^>]*width="([\d.]+)"[^>]*height="20"/g)].map(
        (m) => Number(m[1]),
      );
      // Three bars per row: track, reached, and here-now when non-zero.
      let cursor = 0;
      STATUSES.forEach((_, i) => {
        const track = bars[cursor++];
        const reached = bars[cursor++];
        expect(track, label).toBe(300);
        expect(reached, `${label} row ${i}`).toBeLessThanOrEqual(track);
        if (counts[i] > 0) {
          const here = bars[cursor++];
          expect(here, `${label} row ${i} solid vs pale`).toBeLessThanOrEqual(reached);
        }
      });
    }
  });

  it("links every stage to its own filter, not to a running total", () => {
    const markup = draw(CASES.live);
    for (const status of STATUSES) {
      expect(markup).toContain(`href="/use-cases?status=${status}"`);
    }
  });

  it("says both numbers in the label a screen reader hears", () => {
    const markup = draw(CASES.live);
    expect(markup).toContain(
      `${STATUS_LABELS.in_discovery} — 6 here now, 17 reached this stage or beyond`,
    );
  });

  it("keeps the longest status name inside its gutter", () => {
    const markup = draw(CASES.live);
    // 176px is the measured width of "Approved by Functional Leader" at 12px.
    expect(markup).toContain('x="184"');
    expect(markup).toContain('text-anchor="end"');
  });
});
