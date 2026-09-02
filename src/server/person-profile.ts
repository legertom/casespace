import "server-only";
import { asc, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { aiLeadTeams, aiLeads, teams, users } from "@/db/schema";
import type { Department } from "@/lib/domain";
import type { Identity } from "@/lib/people-match";
import { identityForPerson, identityForUser } from "@/server/identity";

export interface ProfileLead {
  department: Department;
  state: string;
  email: string;
  emailUnverified: boolean;
  teams: { id: string; name: string }[];
}

/** One person, as their own page presents them. */
export interface PersonProfile {
  /** Null only for a login that was never linked to a directory row. */
  personId: string | null;
  name: string;
  title: string | null;
  email: string | null;
  /** Who this page's records are matched against — the same matcher "Mine" uses. */
  identity: Identity;
  /** Their roster row, when they have one. Most of Clever does not. */
  lead: ProfileLead | null;
}

/**
 * The roster row for a person, found by either link. `personId` is how the
 * directory knows them and `userId` is stamped when they first sign in; a
 * lead added by hand may carry only one of the two.
 */
async function leadFor(ids: {
  personId: string | null;
  userId: string | null;
}): Promise<ProfileLead | null> {
  const db = getDb();
  const matches = [
    ids.personId ? eq(aiLeads.personId, ids.personId) : null,
    ids.userId ? eq(aiLeads.userId, ids.userId) : null,
  ].filter((m) => m !== null);
  if (matches.length === 0) return null;

  const [lead] = await db
    .select()
    .from(aiLeads)
    .where(matches.length === 1 ? matches[0] : or(...matches));
  if (!lead) return null;

  const leadTeams = await db
    .select({ id: teams.id, name: teams.name })
    .from(aiLeadTeams)
    .innerJoin(teams, eq(aiLeadTeams.teamId, teams.id))
    .where(eq(aiLeadTeams.leadId, lead.id))
    .orderBy(asc(teams.name));

  return {
    department: lead.department,
    state: lead.state,
    email: lead.email,
    emailUnverified: lead.emailUnverified,
    teams: leadTeams,
  };
}

/** A directory person's profile. Null when the id matches no one. */
export async function personProfile(
  personId: string,
): Promise<PersonProfile | null> {
  const found = await identityForPerson(personId);
  if (!found) return null;

  const db = getDb();
  const [user] = found.identity.userId
    ? await db
        .select({ email: users.primaryEmail })
        .from(users)
        .where(eq(users.id, found.identity.userId))
    : [];
  const lead = await leadFor({ personId, userId: found.identity.userId });

  return {
    personId,
    name: found.name,
    title: found.title,
    email: lead?.email ?? user?.email ?? null,
    identity: found.identity,
    lead,
  };
}

/**
 * Your own profile. Everyone at Clever can sign in, but only AI Leads are
 * linked to a directory row — so `/people/me` falls back to the login itself
 * rather than 404ing on the majority of the company.
 */
export async function myProfile(user: {
  id: string;
  name: string;
  primaryEmail: string;
  personId: string | null;
}): Promise<PersonProfile> {
  if (user.personId) {
    const profile = await personProfile(user.personId);
    if (profile) return profile;
  }
  return {
    personId: null,
    name: user.name,
    title: null,
    email: user.primaryEmail,
    identity: await identityForUser(user),
    lead: await leadFor({ personId: null, userId: user.id }),
  };
}
