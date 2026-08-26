import { describe, expect, it } from "vitest";
import {
  looksLikePersonQuery,
  matchPeople,
  parseSearch,
  type PersonName,
} from "./search-parse";

const PEOPLE: PersonName[] = [
  { id: "p1", name: "Patricia Henriquez" },
  { id: "p2", name: "Tom Léger" },
  { id: "p3", name: "Lotte Petersen-Buckley" },
  { id: "p4", name: "Patrick Doyle" },
];

describe("matchPeople", () => {
  it("matches a name-part prefix", () => {
    expect(matchPeople("lotte", PEOPLE)).toEqual([PEOPLE[2]]);
  });

  it('matches "pati" as an abbreviation, not just a prefix', () => {
    // "Patricia" is Pat-R-icia; people abbreviate it "Pati" anyway. Patrick
    // also answers (P-A-T-r-I), and offering both is the point: the typeahead
    // shows every candidate and the human picks.
    expect(matchPeople("pati", PEOPLE)).toEqual([PEOPLE[0], PEOPLE[3]]);
  });

  it("folds accents the same way mine=1 does", () => {
    expect(matchPeople("leger", PEOPLE)).toEqual([PEOPLE[1]]);
  });

  it("matches surnames, not just first names", () => {
    expect(matchPeople("henriquez", PEOPLE)).toEqual([PEOPLE[0]]);
  });

  it("returns every candidate for an ambiguous token", () => {
    expect(matchPeople("pat", PEOPLE)).toEqual([PEOPLE[0], PEOPLE[3]]);
  });

  it("does not subsequence-match short tokens", () => {
    // "pa" prefixes both Pat* names but must not subsequence into anything else.
    expect(matchPeople("pa", PEOPLE)).toEqual([PEOPLE[0], PEOPLE[3]]);
    expect(matchPeople("pz", PEOPLE)).toEqual([]);
  });
});

describe("parseSearch", () => {
  it("reads status, department, and person out of one phrase", () => {
    expect(parseSearch("launched in css by henri", PEOPLE)).toEqual({
      status: "launched",
      department: "css",
      person: PEOPLE[0],
    });
  });

  it("maps department aliases", () => {
    expect(parseSearch("stuff in ops", PEOPLE)).toEqual({
      department: "business_operations",
    });
    expect(parseSearch("shipped by engineering", PEOPLE)).toEqual({
      status: "launched",
      department: "engineering",
    });
  });

  it('knows the program vocabulary — "documented" is the 45\'s slice', () => {
    expect(parseSearch("documented in mss", PEOPLE)).toEqual({
      status: "documented",
      department: "mss",
    });
  });

  it("reads mine and program scope", () => {
    expect(parseSearch("my launched things", PEOPLE)).toEqual({
      status: "launched",
      mine: true,
    });
    expect(parseSearch("community discovery", PEOPLE)).toEqual({
      status: "in_discovery",
      program: "community",
    });
  });

  it("drops an ambiguous person instead of guessing", () => {
    // "pat" could be Patricia or Patrick — no person filter.
    expect(parseSearch("launched by pat", PEOPLE)).toEqual({
      status: "launched",
    });
  });

  it("returns null for a single word — that is the typeahead's job", () => {
    expect(parseSearch("launched", PEOPLE)).toBeNull();
    expect(parseSearch("patricia", PEOPLE)).toBeNull();
  });

  it("returns null when nothing matched", () => {
    expect(parseSearch("sftp sync troubleshooting", PEOPLE)).toBeNull();
  });
});

describe("looksLikePersonQuery", () => {
  it('spots "by …" phrasing', () => {
    expect(looksLikePersonQuery("by zorp")).toBe(true);
    expect(looksLikePersonQuery("launched by someone")).toBe(true);
    expect(looksLikePersonQuery("bypass caching")).toBe(false);
  });
});
