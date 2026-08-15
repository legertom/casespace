/**
 * Who hears about a new link between two workflows — pure, like
 * commentNotifications, so the de-dupe rule is unit-tested rather than
 * inferred from a server action.
 *
 * Anyone credited on either record hears about it: linking is something a
 * lead can do to a record they don't own, so the people who do own it are
 * told. Each person gets exactly one notification, pointed at the record
 * they're credited on.
 */

export interface LinkSide {
  /** The record. Where a recipient credited on this side lands. */
  useCaseId: string;
  /** Owner, authors, and whoever logged it. Unlinked people arrive as null. */
  creditedUserIds: readonly (string | null | undefined)[];
}

export interface LinkAudience {
  /** Who made the link. Never notified about their own doing. */
  actorId: string;
  /** The record the link was made from. */
  from: LinkSide;
  /** The record it was linked to. */
  to: LinkSide;
}

export interface LinkRecipient {
  userId: string;
  /** The record this person is credited on — the one the bell opens. */
  useCaseId: string;
}

/**
 * One notification per person, de-duplicated. Someone credited on both
 * records is pointed at the record the link was made from, which is where
 * the person who made it was looking.
 */
export function linkNotifications(audience: LinkAudience): LinkRecipient[] {
  const seen = new Map<string, string>();

  const add = (side: LinkSide) => {
    for (const userId of side.creditedUserIds) {
      if (!userId || userId === audience.actorId) continue;
      if (seen.has(userId)) continue;
      seen.set(userId, side.useCaseId);
    }
  };

  add(audience.from);
  add(audience.to);

  return [...seen].map(([userId, useCaseId]) => ({ userId, useCaseId }));
}
