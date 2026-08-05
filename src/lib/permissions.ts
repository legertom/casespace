/**
 * Permission rules — pure functions, unit-tested.
 *
 * Visibility rule: everyone sees everything except What's New (admin-only).
 * These helpers govern writes.
 */
import type { Role } from "./domain";

export interface SessionUser {
  id: string;
  role: Role;
}

export interface UseCaseOwnership {
  createdById: string;
  ownerUserId: string | null;
  authorUserIds: string[];
}

/** Admins edit everything; contributors edit their own (creator, author, or owner). */
export function canEditUseCase(
  user: SessionUser,
  uc: UseCaseOwnership,
): boolean {
  if (user.role === "admin") return true;
  if (user.role === "viewer") return false;
  return (
    uc.createdById === user.id ||
    uc.ownerUserId === user.id ||
    uc.authorUserIds.includes(user.id)
  );
}

export function canCreateUseCase(role: Role): boolean {
  return role === "admin" || role === "contributor";
}

/** Only an admin can promote to (or demote from) Qualified — it records Kate's decision. */
export function canQualify(role: Role): boolean {
  return role === "admin";
}

export function canManageProgram(role: Role): boolean {
  return role === "admin";
}

/** What's New is the one gated surface in the app. */
export function canViewWhatsNew(role: Role): boolean {
  return role === "admin";
}
