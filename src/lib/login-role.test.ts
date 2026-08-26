import { describe, expect, it } from "vitest";
import {
  deriveLoginRole,
  employeesOpen,
  isCleverEmail,
  loginAllowed,
  type LoginRoleInput,
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
