/**
 * "View as" lets an admin preview the app with reduced permissions, to see
 * what an AI Lead, an employee, or a guest actually sees. Pure logic only —
 * cookie I/O lives in current-user.ts (read) and actions-view-as.ts (write).
 *
 * The security property, unit-tested: this can only ever step an admin DOWN.
 * A forged cookie on a non-admin account changes nothing, and "admin" is not
 * a previewable value, so there is no path back up through this mechanism.
 */
import type { Role } from "./domain";

export const VIEW_AS_COOKIE = "casespace_view_as";

/** Roles an admin may preview. Deliberately excludes "admin". */
export const VIEW_AS_ROLES = ["contributor", "employee", "viewer"] as const;

export type ViewAsRole = (typeof VIEW_AS_ROLES)[number];

export const VIEW_AS_LABELS: Record<ViewAsRole, string> = {
  contributor: "AI Lead",
  employee: "Employee",
  viewer: "Viewer",
};

/** Same labels with their article, for use mid-sentence. */
export const VIEW_AS_PROSE: Record<ViewAsRole, string> = {
  contributor: "an AI Lead",
  employee: "an Employee",
  viewer: "a Viewer",
};

export interface EffectiveRole {
  /** The role every permission check should use. */
  role: Role;
  /** Non-null while an admin is previewing; drives the banner and exit link. */
  viewingAs: ViewAsRole | null;
}

/**
 * Resolve the role to act as, given the database role and a requested preview.
 * Anything unrecognized, or requested by a non-admin, is ignored.
 */
export function resolveEffectiveRole(
  realRole: Role,
  requested: string | null | undefined,
): EffectiveRole {
  if (realRole !== "admin") return { role: realRole, viewingAs: null };
  const match = VIEW_AS_ROLES.find((r) => r === requested);
  if (!match) return { role: realRole, viewingAs: null };
  return { role: match, viewingAs: match };
}
