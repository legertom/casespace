/**
 * Permission rules — pure functions, unit-tested.
 *
 * Visibility rule: every page is visible to every authenticated user, with
 * two read exceptions — the adoption pulse charts on Goals (canViewPulse)
 * and the Wins report (canViewWins). The other helpers govern writes
 * (What's New drafting/editing goes through canManageProgram-style admin
 * checks in the server actions).
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

/**
 * The adoption pulse charts (survey readings on Goals) are admin-only.
 * The casebook — every use case and where it stands — stays open to all.
 */
export function canViewPulse(role: Role): boolean {
  return role === "admin";
}

/**
 * Everyone comments, viewers included — the app's first viewer-permitted
 * write, and a deliberate one. Commentary is not record data, and the point
 * of comments is that people who don't build workflows still get a voice on
 * them. Editing a comment is the author's alone; deleting is the author's or
 * an admin's (moderation, via canManageProgram).
 */
export function canComment(_role: Role): boolean {
  return true;
}

/**
 * The Wins report is admin-only: annual-ROI confirmation notes may contain
 * dollar figures, and dollars never appear on an open surface.
 */
export function canViewWins(role: Role): boolean {
  return role === "admin";
}
