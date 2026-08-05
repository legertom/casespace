import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";

export type CurrentUser = typeof users.$inferSelect;

/**
 * The signed-in user with their role read fresh from the database (the JWT
 * only carries the id, so role changes apply immediately). Cached per
 * request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
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
