import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ClassicFunnel,
  ConversionReport,
  FunnelAgainstTarget,
  StandingFunnel,
  TaperedTrack,
} from "./funnels";

const FUNNELS = {
  TaperedTrack,
  StandingFunnel,
  ClassicFunnel,
  ConversionReport,
  FunnelAgainstTarget,
};

const CASES: Record<string, number[]> = {
  live: [6, 1, 2, 2, 3, 2, 1],
  target: [12, 9, 6, 7, 4, 4, 3],
  empty: [0, 0, 0, 0, 0, 0, 0],
  single: [1, 0, 0, 0, 0, 0, 0],
  onlyAtTheEnd: [0, 0, 0, 0, 0, 0, 9],
  lopsided: [3, 4, 28, 5, 2, 2, 1],
};

function draw(name: keyof typeof FUNNELS, n: number[]): string {
  return renderToStaticMarkup(createElement(FUNNELS[name], { n }));
}

describe("funnel drawings", () => {
  for (const name of Object.keys(FUNNELS) as (keyof typeof FUNNELS)[]) {
    for (const [label, n] of Object.entries(CASES)) {
      it(`${name} renders sane geometry for ${label}`, () => {
        const markup = draw(name, n);
        expect(markup).toContain("<svg");
        // A NaN in a coordinate silently drops the shape rather than throwing.
        expect(markup).not.toContain("NaN");
        expect(markup).not.toContain("Infinity");
        expect(markup).not.toMatch(/(width|height|r)="-/);
      });
    }
  }

  /** The defining property: a funnel may only narrow as it descends. */
  it("never widens as it goes down", () => {
    for (const [label, n] of Object.entries(CASES)) {
      const markup = draw("ClassicFunnel", n);
      const widths = [...markup.matchAll(/d="M(-?[\d.]+),[\d.]+ L(-?[\d.]+),/g)].map(
        (m) => Number(m[2]) - Number(m[1]),
      );
      expect(widths, label).toHaveLength(7);
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i], `${label} band ${i}`).toBeLessThanOrEqual(widths[i - 1]);
      }
    }
  });

  it("labels every stage, so no band is anonymous", () => {
    const markup = draw("ConversionReport", CASES.live);
    for (const stage of [
      "In Discovery",
      "Approved by Functional Leader",
      "Under Construction",
      "In Testing",
      "Launched",
      "Qualified",
      "Confirmed Positive ROI",
    ]) {
      expect(markup).toContain(stage);
    }
  });

  it("shows no conversion into the stage records enter at", () => {
    const markup = draw("ConversionReport", CASES.live);
    // First row's step cell is an em dash, not a percentage of nothing.
    expect(markup).toContain("—");
  });
});
