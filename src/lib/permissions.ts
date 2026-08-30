/**
 * Permission rules — pure functions, unit-tested.
 *
 * Visibility rule: every page is visible to every authenticated user, with
 * three read exceptions — the adoption pulse charts on Goals (canViewPulse),
 * the Wins report (canViewWins), and Coach learnings
 * (canViewCoachLearnings). The other helpers govern writes (What's New
 * drafting/editing goes through canManageProgram-style admin checks in the
 * server actions).
 *
 * Note the Community submissions card on the dashboard is *not* a fourth
 * exception: it is chrome hidden from non-admins because it is a queue of
 * admin decisions, and every record on it is public in the casebook.
 */
import type { Role, UcStatus } from "./domain";

export interface SessionUser {
  id: string;
  role: Role;
}

export interface UseCaseOwnership {
  createdById: string;
  ownerUserId: string | null;
  authorUserIds: string[];
}

/**
 * Admins edit everything; AI Leads and employees edit their own (creator,
 * author, or owner). Viewers edit nothing — the early return is what routes
 * every writing role to the ownership check, so adding a role above viewer
 * needs no change here.
 */
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

/**
 * Everyone at Clever logs use cases — employees, AI Leads, admins. Only
 * viewers (signed-in guests who are not employees) stay out.
 *
 * Whether a record *counts* toward the program is a separate question, settled
 * once at creation by `inProgramAtCreation` and not by this helper.
 */
export function canCreateUseCase(role: Role): boolean {
  return role !== "viewer";
}

/**
 * Linking two workflows is open to every AI lead, on any two records —
 * ownership is deliberately not consulted. Spotting that two workflows are
 * the same thing, or that one builds on another, is program knowledge, and
 * the lead who spots it usually owns neither record.
 *
 * Employees stay out, and this is the one place they are narrower than an AI
 * Lead: a link asserts a relationship between records they may not own, which
 * is the program knowledge above. They can still remove a link from their own
 * record (canUnlinkUseCases → canEditUseCase). Viewers stay out entirely: a
 * link is record data, unlike a comment.
 */
export function canLinkUseCases(role: Role): boolean {
  return role === "admin" || role === "contributor";
}

/**
 * Removing a link: whoever made it, an admin, or anyone who can edit a record
 * at either end — an owner who doesn't want the link on their record can
 * always take it off.
 */
export function canUnlinkUseCases(
  user: SessionUser,
  link: { createdById: string },
  ends: UseCaseOwnership[],
): boolean {
  if (user.role === "admin") return true;
  if (link.createdById === user.id) return true;
  return ends.some((end) => canEditUseCase(user, end));
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

/**
 * The annual-ROI confirmation note (on the confirmed_positive_roi
 * transition) may carry dollar figures, which stay off open surfaces — see
 * canViewWins. Every history-emitting surface runs each entry's note through
 * this before showing it, so the /wins gate can't be walked around via a
 * record's History, the REST API, or the Coach. Other transition notes
 * (e.g. Qualified-gate rejections) are unaffected. Admins see everything.
 */
export function visibleHistoryNote(
  entry: { toStatus: UcStatus; note: string | null },
  role: Role,
): string | null {
  if (entry.toStatus === "confirmed_positive_roi" && !canViewWins(role)) {
    return null;
  }
  return entry.note;
}

/**
 * Coach learnings are admin-only — the third read exception, and the only one
 * gated for a reason other than dollars.
 *
 * The page reports how often the Coach guessed wrong and where the wizard
 * loses people. Everything on it is derived from someone's own intake session,
 * and being measured is a different thing from being helped: an open page
 * would make people wonder whether the Coach is a form or an audit. The data
 * is aggregate by construction (see coach-learnings.ts), which limits the
 * damage; this limits the audience. Note that dismiss reasons are attributed,
 * and the dismiss box says so.
 */
export function canViewCoachLearnings(role: Role): boolean {
  return role === "admin";
}

/**
 * Whether this person may act on a Coach conversation — read its stored
 * intent, continue it, or hang a Discovery checkpoint off it.
 *
 * `chatOwnerId` is the `user_id` on the chat row, or null/undefined when no
 * row exists yet. That second case is an allow, and it is not a hole: the
 * proposal card renders when the tool call completes, which is *before*
 * /api/coach writes the chat row on stream end, so a person who clicks
 * quickly has a chat id that owns nothing. A id nobody owns is nobody's to
 * take. What this stops is the case that matters — a chat id belonging to
 * somebody else.
 *
 * Both the route and the checkpoint write ask this, so the rule exists once.
 */
export function canUseChat(
  chatOwnerId: string | null | undefined,
  userId: string,
): boolean {
  return !chatOwnerId || chatOwnerId === userId;
}
