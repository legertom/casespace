import { describe, expect, it } from "vitest";
import {
  deriveLoginRole,
  deriveRequestRole,
  employeesOpen,
  isCleverEmail,
  loginAllowed,
  type LoginRoleInput,
  type RequestRoleInput,
} from "./login-role";

const base: LoginRoleInput = {
  aliases: [],
  adminEmails: [],
  isLead: false,
  openToEmployees: true,
};

describe("isCleverEmail", () => {
  it("accepts employee addresses, folding case and whitespace", () => {
    expect(isCleverEmail("tom.leger@clever.com")).toBe(true);
    expect(isCleverEmail("  Tom.Leger@Clever.COM ")).toBe(true);
  });

  it("matches the domain as a suffix, not anywhere in the string", () => {
    // The whole reason normalizeEmail + endsWith exists rather than includes.
    expect(isCleverEmail("someone@clever.com.evil.com")).toBe(false);
    expect(isCleverEmail("clever.com@gmail.com")).toBe(false);
    expect(isCleverEmail("someone@notclever.com")).toBe(false);
  });
});

describe("loginAllowed", () => {
  it("lets employees in without an allowlist row", () => {
    expect(loginAllowed("new.hire@clever.com", false)).toBe(true);
  });

  it("lets an allow-listed guest in", () => {
    expect(loginAllowed("tomleger@gmail.com", true)).toBe(true);
  });

  it("keeps out a stranger", () => {
    expect(loginAllowed("stranger@gmail.com", false)).toBe(false);
  });

  it("rejects anything that isn't an address", () => {
    expect(loginAllowed("not-an-email", true)).toBe(false);
  });
});

describe("employeesOpen", () => {
  it("is on when the row is absent or true — absent means on", () => {
    expect(employeesOpen(undefined)).toBe(true);
    expect(employeesOpen(true)).toBe(true);
  });

  it("treats every off-ish hand-written value as off", () => {
    // The row is written in SQL by hand; a switch that only recognizes the
    // exact JSON boolean would silently stay on for '"false"' or '0'.
    expect(employeesOpen(false)).toBe(false);
    expect(employeesOpen("false")).toBe(false);
    expect(employeesOpen("off")).toBe(false);
    expect(employeesOpen(0)).toBe(false);
    expect(employeesOpen("0")).toBe(false);
  });

  it("does not read arbitrary other values as off", () => {
    expect(employeesOpen("true")).toBe(true);
    expect(employeesOpen(1)).toBe(true);
    expect(employeesOpen({ enabled: false })).toBe(true);
  });
});

describe("deriveLoginRole", () => {
  it("walks the ladder top down", () => {
    const aliases = ["lead@clever.com"];
    expect(
      deriveLoginRole({
        ...base,
        aliases,
        adminEmails: ["lead@clever.com"],
        isLead: true,
      }),
    ).toBe("admin");
    expect(deriveLoginRole({ ...base, aliases, isLead: true })).toBe(
      "contributor",
    );
    expect(deriveLoginRole({ ...base, aliases })).toBe("employee");
  });

  it("is alias-based, so a guest address on an employee account still lands employee", () => {
    // Signing in with the gmail alias must not demote someone.
    expect(
      deriveLoginRole({
        ...base,
        aliases: ["someone@gmail.com", "someone@clever.com"],
      }),
    ).toBe("employee");
  });

  it("finds admin on any alias, not just the clever.com one", () => {
    expect(
      deriveLoginRole({
        ...base,
        aliases: ["tomleger@gmail.com", "tom.leger@clever.com"],
        adminEmails: ["tomleger@gmail.com"],
      }),
    ).toBe("admin");
  });

  it("folds case on both sides of the admin comparison", () => {
    expect(
      deriveLoginRole({
        ...base,
        aliases: [" Tom@Clever.com "],
        adminEmails: ["TOM@clever.COM"],
      }),
    ).toBe("admin");
  });

  it("leaves an allow-listed guest a viewer", () => {
    expect(
      deriveLoginRole({ ...base, aliases: ["contractor@gmail.com"] }),
    ).toBe("viewer");
  });

  it("holds employees at viewer while the kill switch is off", () => {
    expect(
      deriveLoginRole({
        ...base,
        aliases: ["someone@clever.com"],
        openToEmployees: false,
      }),
    ).toBe("viewer");
  });

  it("keeps admins and leads working while the kill switch is off", () => {
    // The switch governs the new role only — it must never lock out the program.
    expect(
      deriveLoginRole({
        ...base,
        aliases: ["lead@clever.com"],
        isLead: true,
        openToEmployees: false,
      }),
    ).toBe("contributor");
    expect(
      deriveLoginRole({
        ...base,
        aliases: ["kate@clever.com"],
        adminEmails: ["kate@clever.com"],
        openToEmployees: false,
      }),
    ).toBe("admin");
  });

  it("gives a lead contributor even when their roster email is not the clever.com one", () => {
    expect(
      deriveLoginRole({ ...base, aliases: ["lead@gmail.com"], isLead: true }),
    ).toBe("contributor");
  });
});

describe("deriveRequestRole", () => {
  const req: RequestRoleInput = {
    storedRole: "viewer",
    hasCleverAlias: false,
    openToEmployees: true,
  };

  it("promotes a stamp made before the app opened up", () => {
    // The bug this exists for: signed in on 2026-08-04, stamped viewer, still
    // holding that session on 2026-08-26 — and therefore no way to log a use
    // case, on a page that says everyone at Clever can.
    expect(deriveRequestRole({ ...req, hasCleverAlias: true })).toBe("employee");
  });

  it("keeps a guest a viewer, however open the app is", () => {
    expect(deriveRequestRole(req)).toBe("viewer");
  });

  it("takes an employee stamp as proof of a clever.com address", () => {
    // Employees skip the alias lookup, so this is the shape they arrive in.
    expect(deriveRequestRole({ ...req, storedRole: "employee" })).toBe(
      "employee",
    );
  });

  it("drops employees to viewer while the kill switch is off, promoting nobody", () => {
    expect(
      deriveRequestRole({
        ...req,
        storedRole: "employee",
        openToEmployees: false,
      }),
    ).toBe("viewer");
    expect(
      deriveRequestRole({
        ...req,
        hasCleverAlias: true,
        openToEmployees: false,
      }),
    ).toBe("viewer");
  });

  it("never touches admins and leads, switch either way", () => {
    // The two rungs this must not decide: they come from admin_emails and the
    // roster, which are sign-in questions. Nothing here can add power.
    for (const openToEmployees of [true, false]) {
      expect(
        deriveRequestRole({ ...req, storedRole: "admin", openToEmployees }),
      ).toBe("admin");
      expect(
        deriveRequestRole({
          ...req,
          storedRole: "contributor",
          openToEmployees,
        }),
      ).toBe("contributor");
    }
  });

  it("agrees with the sign-in ladder for the rungs it shares", () => {
    // Two derivations of one rule; they must not drift.
    const aliases = ["someone@clever.com"];
    for (const openToEmployees of [true, false]) {
      expect(
        deriveRequestRole({
          storedRole: "viewer",
          hasCleverAlias: true,
          openToEmployees,
        }),
      ).toBe(
        deriveLoginRole({
          aliases,
          adminEmails: [],
          isLead: false,
          openToEmployees,
        }),
      );
    }
  });
});
