import { describe, expect, it } from "vitest";
import { resolveEffectiveRole } from "./view-as";

describe("view as", () => {
  it("lets an admin step down to a lead or a viewer", () => {
    expect(resolveEffectiveRole("admin", "contributor")).toEqual({
      role: "contributor",
      viewingAs: "contributor",
    });
    expect(resolveEffectiveRole("admin", "viewer")).toEqual({
      role: "viewer",
      viewingAs: "viewer",
    });
  });

  it("leaves an admin alone with no preview set", () => {
    for (const requested of [null, undefined, ""]) {
      expect(resolveEffectiveRole("admin", requested)).toEqual({
        role: "admin",
        viewingAs: null,
      });
    }
  });

  it("never escalates a non-admin, whatever the cookie claims", () => {
    for (const requested of ["admin", "contributor", "viewer", "nonsense"]) {
      expect(resolveEffectiveRole("viewer", requested)).toEqual({
        role: "viewer",
        viewingAs: null,
      });
      expect(resolveEffectiveRole("contributor", requested)).toEqual({
        role: "contributor",
        viewingAs: null,
      });
    }
  });

  it("refuses 'admin' as a previewable role, so there is no way back up", () => {
    expect(resolveEffectiveRole("admin", "admin")).toEqual({
      role: "admin",
      viewingAs: null,
    });
  });

  it("ignores unrecognized values", () => {
    expect(resolveEffectiveRole("admin", "superuser")).toEqual({
      role: "admin",
      viewingAs: null,
    });
  });
});
