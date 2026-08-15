/**
 * One human turns up under several handles: a directory row ("Tom Léger"), a
 * login ("Tom Leger"), and whatever a colleague typed by hand in the credit
 * box. Every view that asks "whose record is this?" goes through here, so the
 * answer is the same on all of them.
 */

/**
 * The form names are compared in — case and diacritics folded, whitespace
 * collapsed. This is not fuzzy matching: "Tom Leger" and "Tom Léger" are the
 * same string once the accent is off, while "Tom Legere" still isn't.
 */
export function foldName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The ids and spellings that all point at one person. */
export interface Identity {
  personId: string | null;
  userId: string | null;
  /** Folded, deduped: the directory spelling, the login spelling, … */
  foldedNames: string[];
}

export function makeIdentity(parts: {
  personId?: string | null;
  userId?: string | null;
  names?: (string | null | undefined)[];
}): Identity {
  const folded = new Set<string>();
  for (const n of parts.names ?? []) {
    const f = n ? foldName(n) : "";
    if (f) folded.add(f);
  }
  return {
    personId: parts.personId ?? null,
    userId: parts.userId ?? null,
    foldedNames: [...folded],
  };
}

/** One credited slot on a record: an author row, or the owner fields. */
export interface CreditRef {
  personId: string | null;
  userId: string | null;
  displayName: string | null;
}

/**
 * A slot carrying an id is judged on that id alone — an explicit link is never
 * second-guessed by a name that merely looks the same. A slot with no id is
 * free text, and the name is the only evidence there is.
 */
export function refCredits(ref: CreditRef, id: Identity): boolean {
  if (ref.personId || ref.userId) {
    return (
      (id.personId !== null && ref.personId === id.personId) ||
      (id.userId !== null && ref.userId === id.userId)
    );
  }
  return !!ref.displayName && id.foldedNames.includes(foldName(ref.displayName));
}

export interface CreditedRecord {
  ownerPersonId: string | null;
  ownerUserId: string | null;
  ownerName: string | null;
  authors: CreditRef[];
}

/** True when the record names this person as its owner or one of its authors. */
export function creditsIdentity(row: CreditedRecord, id: Identity): boolean {
  const owner: CreditRef = {
    personId: row.ownerPersonId,
    userId: row.ownerUserId,
    displayName: row.ownerName,
  };
  return refCredits(owner, id) || row.authors.some((a) => refCredits(a, id));
}
