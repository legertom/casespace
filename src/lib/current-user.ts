import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import type { Role } from "@/lib/domain";
import { employeeStanding } from "@/lib/auth-provision";
import {
  VIEW_AS_COOKIE,
  resolveEffectiveRole,
  type ViewAsRole,
} from "@/lib/view-as";

export type CurrentUser = typeof users.$inferSelect & {
  /** The role stored in the database, unaffected by "view as". */
  realRole: Role;
  /** Set while an admin is previewing the app with reduced permissions. */
  viewingAs: ViewAsRole | null;
};

/**
 * The signed-in user with their role read fresh from the database (the JWT
 * only carries the id, so role changes apply immediately). Cached per
 * request.
 *
 * `role` is the *effective* role — an admin previewing as an AI Lead or viewer
 * gets the reduced role here, so every permission check downstream honors the
 * preview without knowing about it. `realRole` keeps the true one.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return null;

  // The employee rung is re-derived here, not only at sign-in: provisionLogin
  // stamps the role, but a session can outlive that stamp by weeks, in both
  // directions — see deriveRequestRole. Admins and AI Leads skip the reads
  // entirely; employees pay one single-row settings read; only viewers, the
  // smallest group, also pay the alias lookup that can promote them.
  const storedRole = await employeeStanding(user.id, user.role);

  const jar = await cookies();
  const { role, viewingAs } = resolveEffectiveRole(
    storedRole,
    jar.get(VIEW_AS_COOKIE)?.value,
  );
  return { ...user, role, realRole: storedRole, viewingAs };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/** Admin-only surfaces 404 for everyone else (per spec: What's New). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
