import { describe, expect, it } from "vitest";
import type { LinkKind } from "./domain";
import { existingLinkLabel, groupLinks, type RecordLink } from "./use-case-links";

const link = (
  id: string,
  kind: LinkKind,
  outgoing: boolean,
): RecordLink => ({
  id,
  kind,
  outgoing,
  createdById: "someone",
  otherId: `uc-${id}`,
  otherTitle: `Workflow ${id}`,
  otherOwnerName: null,
});

describe("a record's links, under their headings", () => {
  it("reads the inverse label at the far end", () => {
    const groups = groupLinks([
      link("a", "builds_on", true),
      link("b", "builds_on", false),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Builds on", "Built on by"]);
    expect(groups[0].links.map((l) => l.id)).toEqual(["a"]);
    expect(groups[1].links.map((l) => l.id)).toEqual(["b"]);
  });

  it("puts both ends of a symmetric link under one heading", () => {
    const groups = groupLinks([
      link("a", "relates_to", true),
      link("b", "relates_to", false),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Relates to");
    expect(groups[0].links.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("drops headings with nothing under them", () => {
    expect(groupLinks([])).toEqual([]);
    expect(groupLinks([link("a", "duplicates", false)]).map((g) => g.label)).toEqual(
      ["Duplicated by"],
    );
  });

  it("keeps headings in a fixed order regardless of link order", () => {
    const groups = groupLinks([
      link("a", "relates_to", true),
      link("b", "duplicates", true),
      link("c", "builds_on", true),
    ]);
    expect(groups.map((g) => g.label)).toEqual([
      "Builds on",
      "Duplicates",
      "Relates to",
    ]);
  });
});

describe("naming a link that already exists", () => {
  it("names it from the asking record's side", () => {
    expect(existingLinkLabel({ kind: "builds_on", outgoing: true })).toBe(
      "Builds on",
    );
    expect(existingLinkLabel({ kind: "builds_on", outgoing: false })).toBe(
      "Built on by",
    );
    expect(existingLinkLabel({ kind: "relates_to", outgoing: false })).toBe(
      "Relates to",
    );
  });
});
