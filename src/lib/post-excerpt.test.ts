import { describe, expect, it } from "vitest";
import { postExcerpt } from "./post-excerpt";

const POST = `## The week in one line

The program crossed **30 documented** workflows, and [two more](/use-cases)
entered testing.

Kate confirmed positive ROI on the CSS triage workflow — the fifth of the
fifteen, and the first from outside Engineering.

- Meeting-notes summarizer: Launched
- Invoice matching: In Testing

A quieter week for the pulse metrics; the next survey lands Friday.`;

describe("postExcerpt", () => {
  it("takes whole prose paragraphs, skipping headings and lists", () => {
    const out = postExcerpt(POST, 260);
    expect(out).toContain("crossed 30 documented workflows");
    expect(out).toContain("two more entered testing");
    expect(out).toContain("Kate confirmed positive ROI");
    expect(out).not.toContain("##");
    expect(out).not.toContain("**");
    expect(out).not.toContain("Meeting-notes summarizer");
    expect(out.endsWith("…")).toBe(true);
  });

  it("keeps a short post whole, without an ellipsis", () => {
    expect(postExcerpt("One short line.")).toBe("One short line.");
  });

  it("strips links to their text", () => {
    expect(postExcerpt("See [the casebook](/use-cases).")).toBe(
      "See the casebook.",
    );
  });

  it("cuts an oversized first paragraph at a word boundary", () => {
    const long = "word ".repeat(200).trim();
    const out = postExcerpt(long, 100);
    expect(out.length).toBeLessThanOrEqual(102);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/wor …$/);
  });
});
