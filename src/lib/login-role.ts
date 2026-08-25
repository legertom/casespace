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
