import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { people, users } from "@/db/schema";
import { isUuid } from "@/lib/ids";
import { makeIdentity, type Identity } from "@/lib/people-match";

/**
 * Everything we know a signed-in user answers to. Their login name and their
 * directory name are often spelled differently (Tom logs in as "Tom Leger",
 * the org chart calls him "Tom Léger"), and credit typed by hand uses
 * whichever one the writer reached for.
 */
export async function identityForUser(user: {
  id: string;
  name: string;
  personId: string | null;
}): Promise<Identity> {
  const db = getDb();
  let directoryName: string | null = null;
  if (user.personId) {
    const [person] = await db
      .select({ name: people.name })
      .from(people)
      .where(eq(people.id, user.personId));
    directoryName = person?.name ?? null;
  }
  return makeIdentity({
    userId: user.id,
    personId: user.personId,
    names: [user.name, directoryName],
  });
}

/**
 * A directory person plus the login that belongs to them, so `?person=` finds
 * records credited under either. Null when the id matches no one.
 *
 * Person ids travel in URLs — `/people/<id>` and `?person=` — so a caller can
 * hand us something that is not a uuid at all. That is "no such person", not
 * an error, and it is rejected here rather than by Postgres so a page can 404
 * on it without also swallowing a real database failure.
 */
export async function identityForPerson(
  personId: string,
): Promise<{ name: string; title: string | null; identity: Identity } | null> {
  if (!isUuid(personId)) return null;
  const db = getDb();
  const [person] = await db
    .select({ name: people.name, title: people.title })
    .from(people)
    .where(eq(people.id, personId));
  if (!person) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.personId, personId));

  return {
    name: person.name,
    title: person.title,
    identity: makeIdentity({
      personId,
      userId: user?.id ?? null,
      names: [person.name, user?.name],
    }),
  };
}

/**
 * Roster rows as people: everything each AI Lead answers to, keyed by lead
 * id. A superset of what their own page matches — the directory name and
 * the login linked to that directory row (identityForPerson), plus the
 * roster spelling and a login linked to the roster row directly — so a
 * record on a lead's page is never missing from a count of their work.
 */
export async function identitiesForLeads(
  leads: readonly {
    id: string;
    name: string;
    personId: string | null;
    userId: string | null;
  }[],
): Promise<Map<string, Identity>> {
  const personIds = leads.flatMap((l) => (l.personId ? [l.personId] : []));
  const userIds = leads.flatMap((l) => (l.userId ? [l.userId] : []));
  const db = getDb();
  const [directory, loginsByPerson, loginsById] = await Promise.all([
    personIds.length
      ? db
          .select({ id: people.id, name: people.name })
          .from(people)
          .where(inArray(people.id, personIds))
      : [],
    personIds.length
      ? db
          .select({ id: users.id, name: users.name, personId: users.personId })
          .from(users)
          .where(inArray(users.personId, personIds))
      : [],
    userIds.length
      ? db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds))
      : [],
  ]);
  const directoryName = new Map(directory.map((p) => [p.id, p.name]));
  const personLogin = new Map(loginsByPerson.map((u) => [u.personId, u]));
  const loginName = new Map(loginsById.map((u) => [u.id, u.name]));

  return new Map(
    leads.map((l) => {
      const login = l.personId ? personLogin.get(l.personId) : undefined;
      return [
        l.id,
        makeIdentity({
          personId: l.personId,
          userId: login?.id ?? l.userId,
          names: [
            l.name,
            l.personId ? directoryName.get(l.personId) : null,
            login?.name,
            l.userId ? loginName.get(l.userId) : null,
          ],
        }),
      ];
    }),
  );
}
