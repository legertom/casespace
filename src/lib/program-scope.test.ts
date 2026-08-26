import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROGRAM_SCOPE,
  PROGRAM_SCOPE_LABELS,
  PROGRAM_SCOPES,
  parseProgramScope,
  scopeToFilter,
} from "./program-scope";

describe("parseProgramScope", () => {
  it("round-trips every valid scope", () => {
    for (const scope of PROGRAM_SCOPES) {
      expect(parseProgramScope(scope)).toBe(scope);
    }
  });

  it("falls back rather than throwing on junk", () => {
    for (const junk of [undefined, null, "", "nonsense", 0, {}, []]) {
      expect(parseProgramScope(junk)).toBe(DEFAULT_PROGRAM_SCOPE);
    }
  });

  it("honours an explicit fallback", () => {
    expect(parseProgramScope("nonsense", "all")).toBe("all");
  });

  it("defaults the casebook to the program view", () => {
    expect(DEFAULT_PROGRAM_SCOPE).toBe("program");
  });
});

describe("scopeToFilter", () => {
  // These three assertions are the point of the module: callers must test
  // `!== undefined`, and `false` (community only) is exactly the value a
  // truthy check would drop.
  it("maps program to true", () => {
    expect(scopeToFilter("program")).toBe(true);
  });

  it("maps community to false, not undefined", () => {
    expect(scopeToFilter("community")).toBe(false);
  });

  it("maps all to undefined, meaning do not filter", () => {
    expect(scopeToFilter("all")).toBeUndefined();
  });

  it("never returns undefined for a narrowing scope", () => {
    expect(scopeToFilter("program")).not.toBeUndefined();
    expect(scopeToFilter("community")).not.toBeUndefined();
  });
});

describe("labels", () => {
  it("names every scope", () => {
    for (const scope of PROGRAM_SCOPES) {
      expect(PROGRAM_SCOPE_LABELS[scope]).toBeTruthy();
    }
  });
});
