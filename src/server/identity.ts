import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { people, users } from "@/db/schema";
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
 */
export async function identityForPerson(
  personId: string,
): Promise<{ name: string; identity: Identity } | null> {
  const db = getDb();
  const [person] = await db
    .select({ name: people.name })
    .from(people)
    .where(eq(people.id, personId));
  if (!person) return null;

  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.personId, personId));

  return {
    name: person.name,
    identity: makeIdentity({
      personId,
      userId: user?.id ?? null,
      names: [person.name, user?.name],
    }),
  };
}
