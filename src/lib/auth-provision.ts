import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  aiLeads,
  allowedLoginEmails,
  appSettings,
  userEmails,
  users,
} from "@/db/schema";
import type { Role } from "@/lib/domain";
import {
  deriveLoginRole,
  employeesOpen,
  isCleverEmail,
  loginAllowed,
  normalizeEmail,
} from "@/lib/login-role";

export interface ProvisionedLogin {
  userId: string;
  role: Role;
}

/**
 * Gate + find-or-create for a sign-in email.
 *
 * - Allowed when the domain is clever.com or the email is on the explicit
 *   allowlist.
 * - Aliases resolve to one user via user_emails (Tom's gmail + clever.com
 *   land in the same account).
 * - Role is derived on every login, by deriveLoginRole: admin_emails setting →
 *   admin; roster match → contributor (and the roster row links to this
 *   login); any clever.com alias → employee; otherwise viewer. The ladder
 *   itself is pure and unit-tested in lib/login-role.ts — this function is the
 *   I/O around it.
 *
 * Because the role is recomputed every time, roster and admin_emails changes
 * take effect on next sign-in with no migration. The open_to_employees switch
 * is also re-checked on every request in getCurrentUser — a session can
 * outlive a sign-in by weeks, so enforcing it only here would leave the door
 * open long after it was closed.
 */
export async function provisionLogin(
  rawEmail: string,
  profile: { name?: string | null; image?: string | null },
): Promise<ProvisionedLogin | null> {
  const email = normalizeEmail(rawEmail);
  if (!email.includes("@")) return null;
  const db = getDb();

  // Employees are admitted by domain alone, so the allowlist lookup only
  // matters for everyone else — the majority path skips the query.
  const allowlisted = isCleverEmail(email)
    ? false
    : Boolean(
        (
          await db
            .select()
            .from(allowedLoginEmails)
            .where(eq(allowedLoginEmails.email, email))
        )[0],
      );
  if (!loginAllowed(email, allowlisted)) return null;

  // Resolve or create the user via the alias table.
  const [alias] = await db
    .select()
    .from(userEmails)
    .where(eq(userEmails.email, email));

  let userId: string;
  if (alias) {
    userId = alias.userId;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name: profile.name?.trim() || email.split("@")[0],
        primaryEmail: email,
        image: profile.image ?? null,
      })
      .onConflictDoUpdate({
        target: users.primaryEmail,
        set: { updatedAt: new Date() },
      })
      .returning();
    userId = created.id;
    await db.insert(userEmails).values({ email, userId }).onConflictDoNothing();
  }

  const myAliases = (
    await db.select().from(userEmails).where(eq(userEmails.userId, userId))
  ).map((a) => a.email);

  // Both settings in one read: admin from the configurable allowlist, and
  // the kill switch for opening the app to everyone at Clever. The switch
  // can be turned off in one row without a deploy; employeesOpen parses it
  // defensively because the row is written by hand.
  const settingRows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, ["admin_emails", "open_to_employees"]));
  const adminValue = settingRows.find((r) => r.key === "admin_emails")?.value;
  const adminEmails = Array.isArray(adminValue) ? (adminValue as string[]) : [];
  const openToEmployees = employeesOpen(
    settingRows.find((r) => r.key === "open_to_employees")?.value,
  );

  // Contributor when a roster row carries one of this user's emails.
  let leadPersonId: string | null = null;
  let isLead = false;
  for (const a of myAliases) {
    const [lead] = await db.select().from(aiLeads).where(eq(aiLeads.email, a));
    if (lead) {
      isLead = true;
      leadPersonId = lead.personId;
      if (lead.userId !== userId) {
        await db.update(aiLeads).set({ userId }).where(eq(aiLeads.id, lead.id));
      }
    }
  }

  const role: Role = deriveLoginRole({
    aliases: myAliases,
    adminEmails,
    isLead,
    openToEmployees,
  });

  const [current] = await db.select().from(users).where(eq(users.id, userId));
  const patch: Partial<typeof users.$inferInsert> = {};
  if (current.role !== role) patch.role = role;
  if (profile.image && current.image !== profile.image)
    patch.image = profile.image;
  if (profile.name?.trim() && current.name !== profile.name.trim())
    patch.name = profile.name.trim();
  if (!current.personId && leadPersonId) patch.personId = leadPersonId;
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
  }

  return { userId, role };
}
