import "server-only";
import { eq } from "drizzle-orm";
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
