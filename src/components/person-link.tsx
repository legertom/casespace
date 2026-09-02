import Link from "next/link";

const linkCls =
  "underline decoration-hairline-strong underline-offset-2 hover:text-accent hover:decoration-accent";

/**
 * A person's name, linked to their profile when we know which directory row
 * they are. Names that were typed free-hand (no personId) render as plain text
 * — there's nothing honest to point at.
 */
export function PersonLink({
  name,
  personId,
}: {
  name: string;
  personId: string | null;
}) {
  if (!personId) return <>{name}</>;
  return (
    <Link href={`/people/${personId}`} className={linkCls}>
      {name}
    </Link>
  );
}

/** Comma-separated people, each linked where possible. */
export function PersonLinks({
  people,
  empty = "—",
}: {
  people: { displayName: string; personId: string | null }[];
  empty?: string;
}) {
  if (people.length === 0) return <>{empty}</>;
  return (
    <>
      {people.map((p, i) => (
        <span key={p.personId ?? `${p.displayName}-${i}`}>
          {i > 0 && ", "}
          <PersonLink name={p.displayName} personId={p.personId} />
        </span>
      ))}
    </>
  );
}
