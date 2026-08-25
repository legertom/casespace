import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  aiLeads,
  allowedLoginEmails,
  appSettings,
  userEmails,
  users,
} from "@/db/schema";
import type { Role } from "@/lib/domain";
import { deriveLoginRole, loginAllowed } from "@/lib/login-role";

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
 * take effect on next sign-in with no migration, and the open_to_employees
 * switch below is a genuine kill switch rather than a one-way door.
 */
export async function provisionLogin(
  rawEmail: string,
  profile: { name?: string | null; image?: string | null },
): Promise<ProvisionedLogin | null> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) return null;
  const db = getDb();

  const [allowlisted] = await db
    .select()
    .from(allowedLoginEmails)
    .where(eq(allowedLoginEmails.email, email));
  if (!loginAllowed(email, Boolean(allowlisted))) return null;

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
    await db
      .insert(userEmails)
      .values({ email, userId })
      .onConflictDoNothing();
  }

  const myAliases = (
    await db.select().from(userEmails).where(eq(userEmails.userId, userId))
  ).map((a) => a.email);

  // Admin from the configurable allowlist.
  const [adminSetting] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "admin_emails"));
  const adminEmails = Array.isArray(adminSetting?.value)
    ? (adminSetting.value as string[])
    : [];

  // The kill switch for opening the app to everyone at Clever. Absent means
  // on: the setting exists so it can be turned off in one row without a
  // deploy, not so the feature has to be turned on in one.
  const [openSetting] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "open_to_employees"));
  const openToEmployees = openSetting?.value !== false;

  // Contributor when a roster row carries one of this user's emails.
  let leadPersonId: string | null = null;
  let isLead = false;
  for (const a of myAliases) {
    const [lead] = await db.select().from(aiLeads).where(eq(aiLeads.email, a));
    if (lead) {
      isLead = true;
      leadPersonId = lead.personId;
      if (lead.userId !== userId) {
        await db
          .update(aiLeads)
          .set({ userId })
          .where(eq(aiLeads.id, lead.id));
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
