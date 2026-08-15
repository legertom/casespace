import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { addDays, entriesInWeek, parseChangelog } from "./changelog";

const CHANGELOG = path.resolve(
  import.meta.dirname,
  "../../docs/changelog.md",
);

const SAMPLE = `
Preamble prose that is not an entry.

## The format

Entries look like this:

\`\`\`markdown
## 2099-01-01

### An example that must not be parsed
Requested by: Nobody

This lives inside a fence.
\`\`\`

## 2026-08-14

### A changelog the weekly letter can read
Requested by: Tom Leger

Casespace keeps a record of its own improvements.
The Monday post writes them up.

### Something nobody asked for

Shipped anyway.

## 2026-08-07

### An older thing
Requested by: Kate Schaff
Feedback: abc-123

From last week.
`;

describe("parseChangelog", () => {
  const entries = parseChangelog(SAMPLE);

  it("reads entries under their date heading", () => {
    expect(entries).toHaveLength(3);
    expect(entries[0].date).toBe("2026-08-14");
    expect(entries[0].title).toBe("A changelog the weekly letter can read");
    expect(entries[2].date).toBe("2026-08-07");
  });

  it("credits the requester when there is one", () => {
    expect(entries[0].requestedBy).toBe("Tom Leger");
    expect(entries[2].requestedBy).toBe("Kate Schaff");
  });

  it("leaves the requester null rather than guessing", () => {
    expect(entries[1].requestedBy).toBeNull();
  });

  it("reads a feedback reference when present", () => {
    expect(entries[2].feedbackId).toBe("abc-123");
    expect(entries[0].feedbackId).toBeNull();
  });

  it("joins the summary and drops the attribution lines", () => {
    expect(entries[0].summary).toBe(
      "Casespace keeps a record of its own improvements. The Monday post writes them up.",
    );
    expect(entries[0].summary).not.toContain("Requested by");
  });

  it("ignores the fenced example of the format", () => {
    expect(entries.map((e) => e.title)).not.toContain(
      "An example that must not be parsed",
    );
    expect(entries.every((e) => e.date !== "2099-01-01")).toBe(true);
  });

  it("ignores an entry that has no date heading above it", () => {
    expect(parseChangelog("### Orphan\n\nNo date.\n")).toEqual([]);
  });

  it("drops an entry with a title and no summary", () => {
    expect(parseChangelog("## 2026-08-14\n\n### Bare\n")).toEqual([]);
  });

  it("returns nothing for an empty file", () => {
    expect(parseChangelog("")).toEqual([]);
  });
});

describe("entriesInWeek", () => {
  const entries = parseChangelog(SAMPLE);

  it("takes the seven days from the Monday, inclusive", () => {
    const week = entriesInWeek(entries, "2026-08-10");
    expect(week.map((e) => e.date)).toEqual(["2026-08-14", "2026-08-14"]);
  });

  it("stops before the eighth day", () => {
    // 08-07 through 08-13 — the 08-14 entries belong to the next week.
    expect(entriesInWeek(entries, "2026-08-07").map((e) => e.date)).toEqual([
      "2026-08-07",
    ]);
  });

  it("excludes entries shipped before the week began", () => {
    expect(entriesInWeek(entries, "2026-08-15")).toEqual([]);
  });

  it("is empty for a quiet week", () => {
    expect(entriesInWeek(entries, "2026-07-06")).toEqual([]);
  });
});

describe("addDays", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("does not drift across a DST change", () => {
    expect(addDays("2026-11-01", 7)).toBe("2026-11-08");
  });
});

describe("the real changelog", () => {
  const entries = parseChangelog(readFileSync(CHANGELOG, "utf8"));

  it("parses", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("gives every entry a real calendar date", () => {
    const bad = entries.filter(
      (e) => Number.isNaN(Date.parse(`${e.date}T00:00:00Z`)),
    );
    expect(bad).toEqual([]);
  });

  it("gives every entry a title and a summary", () => {
    const thin = entries
      .filter((e) => !e.title.trim() || e.summary.length < 20)
      .map((e) => e.title);
    expect(thin).toEqual([]);
  });

  it("never ships an entry dated in the future", () => {
    const today = new Date().toISOString().slice(0, 10);
    const ahead = entries.filter((e) => e.date > today).map((e) => e.title);
    expect(ahead).toEqual([]);
  });

  it("keeps dates in descending order, newest first", () => {
    const dates = entries.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("mentions no dollar figures", () => {
    const withDollars = entries
      .filter((e) => /\$\s?\d|\bdollars?\b/i.test(e.summary))
      .map((e) => e.title);
    expect(withDollars).toEqual([]);
  });
});
