/**
 * Who gets in, and what they become — the login role ladder as pure logic.
 *
 * This lives here rather than inside `auth-provision.ts` so the ladder is
 * unit-tested: it decides whether a stranger can write to the casebook, which
 * is the last rule in the app that should be inferred from a DB module.
 * `auth-provision.ts` keeps the I/O and calls these.
 */
import type { Role } from "./domain";

export const CLEVER_EMAIL_DOMAIN = "@clever.com";

/**
 * A Clever employee address. Suffix match, not `includes` — `@clever.com` has
 * to end the string, or `someone@clever.com.evil.com` would walk straight in.
 */
export function isCleverEmail(email: string): boolean {
  return normalizeEmail(email).endsWith(CLEVER_EMAIL_DOMAIN);
}

/** Lowercased and trimmed. Every comparison here goes through it. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * May this address sign in at all? Employees always; everyone else needs an
 * explicit `allowed_login_emails` row (contractors, parent-company folks, a
 * personal alias of someone who is also an employee).
 */
export function loginAllowed(email: string, allowlisted: boolean): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized.includes("@")) return false;
  return isCleverEmail(normalized) || allowlisted;
}

/**
 * Parse the `open_to_employees` app setting. Absent means on: the row exists
 * so the door can be closed, not so it has to be opened. The row is written
 * by hand in SQL, so every off-ish spelling an operator would plausibly
 * write — `false`, `"false"`, `"off"`, `0` — counts as off rather than
 * silently leaving the app open.
 */
export function employeesOpen(value: unknown): boolean {
  return !(
    value === false ||
    value === "false" ||
    value === "off" ||
    value === 0 ||
    value === "0"
  );
}

export interface LoginRoleInput {
  /** Every address on this account, from user_emails — not just the one used to sign in. */
  aliases: readonly string[];
  /** The admin_emails app setting. */
  adminEmails: readonly string[];
  /** Whether a roster row carries one of these aliases. */
  isLead: boolean;
  /** The open_to_employees app setting. Off means employees stay viewers. */
  openToEmployees: boolean;
}

/**
 * The one place a role is decided.
 *
 * Alias-based on purpose: Tom signing in with gmail still lands `admin`, and
 * a lead whose roster address differs from the one they used still lands
 * `contributor`. Checking only the sign-in address would silently demote
 * anyone with two addresses.
 *
 * `viewer` is the floor and it means something: signed in, but not a Clever
 * employee. With `openToEmployees` off, employees land there too — that is the
 * kill switch, and it restores the pre-2026-08 behaviour exactly.
 */
export function deriveLoginRole(input: LoginRoleInput): Role {
  const aliases = input.aliases.map(normalizeEmail);
  const adminEmails = input.adminEmails.map(normalizeEmail);
  if (aliases.some((a) => adminEmails.includes(a))) return "admin";
  if (input.isLead) return "contributor";
  if (input.openToEmployees && aliases.some(isCleverEmail)) return "employee";
  return "viewer";
}

export interface RequestRoleInput {
  /** The role stamped on the users row by the last sign-in. */
  storedRole: Role;
  /** Whether any alias on the account is a clever.com address. */
  hasCleverAlias: boolean;
  /** The open_to_employees app setting. */
  openToEmployees: boolean;
}

/**
 * The employee rung, re-derived on every request instead of trusted from the
 * stamp — the bottom two rungs only.
 *
 * A stamp is a fact about the last sign-in, and sessions outlive sign-ins by
 * weeks. That cuts both ways, and both ways have bitten:
 *
 * - Closing the kill switch has to take effect now, not at the next login.
 * - Opening the app to employees on 2026-08-25 left everyone who had signed
 *   in before it stamped `viewer` and therefore buttonless — no Log a use
 *   case, no writes — until they happened to sign in again. The same hole
 *   reopens every time the switch is turned back on.
 *
 * So `viewer` + a clever.com address is read as `employee` here, exactly as
 * `deriveLoginRole` would read it. Only the sign-in ladder promotes above
 * that: admin and contributor are stamped from `admin_emails` and the roster
 * and pass through untouched, so this can add no power the ladder wouldn't.
 */
export function deriveRequestRole(input: RequestRoleInput): Role {
  const { storedRole } = input;
  if (storedRole === "admin" || storedRole === "contributor") return storedRole;
  // An `employee` stamp is itself proof of a clever.com alias — it is the only
  // way to get one — which is what lets the caller skip the alias lookup for
  // the role most people hold.
  const isEmployee = storedRole === "employee" || input.hasCleverAlias;
  if (!isEmployee) return "viewer";
  return input.openToEmployees ? "employee" : "viewer";
}
