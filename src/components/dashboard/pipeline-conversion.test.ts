import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  STATUSES,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type UcStatus,
} from "@/lib/domain";
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
    expect(markup).toContain("6 here now, 17 reached this stage or beyond");
  });

  /**
   * The caption a sighted person gets on hover lives *inside* the stage link,
   * where the link's aria-label overrides it for assistive tech. So the label
   * has to carry the description itself, or a screen reader hears the numbers
   * and never what the stage means.
   *
   * Asserted on Launched because its description is the one with no
   * apostrophe — renderToStaticMarkup escapes those to &#x27;.
   */
  it("puts the stage's meaning in that label too", () => {
    const markup = draw(CASES.live);
    expect(markup).toContain(
      `aria-label="${STATUS_LABELS.launched} — ${STATUS_DESCRIPTIONS.launched} 3 here now`,
    );
  });

  /**
   * Every stage says what it means on its own row, with nothing hidden behind
   * a hover — that is the whole point of the description column, and the
   * reason this chart carries no key beneath it.
   */
  it("prints what every stage means, on the stage's own row", () => {
    const markup = draw(CASES.live);
    for (const s of STATUSES) {
      // renderToStaticMarkup escapes apostrophes, so compare like for like.
      const escaped = STATUS_DESCRIPTIONS[s].replaceAll("'", "&#x27;");
      expect(markup, s).toContain(`>${escaped}</text>`);
    }
  });

  /**
   * The descriptions are only legible if the chart keeps its width. Letting it
   * shrink to a phone would render them at half size, so it scrolls instead —
   * a min-width well under the viewBox is the silent way that breaks.
   */
  it("holds enough width for the descriptions to stay legible", () => {
    const markup = draw(CASES.live);
    const viewBox = Number(markup.match(/viewBox="0 0 (\d+)/)![1]);
    const minW = Number(markup.match(/min-w-\[(\d+)px\]/)![1]);
    expect(minW / viewBox).toBeGreaterThan(0.8);
  });

  it("keeps the longest status name inside its gutter", () => {
    const markup = draw(CASES.live);
    // 176px is the measured width of "Approved by Functional Leader" at 12px.
    expect(markup).toContain('x="184"');
    expect(markup).toContain('text-anchor="end"');
  });
});
