/**
 * Who hears about a new comment — pure, so the de-dupe and priority rules are
 * unit-tested rather than inferred from a server action.
 *
 * The model is Jira's: everyone on the record, plus everyone already talking
 * on it, hears the conversation continue. Each person gets exactly one
 * notification carrying the most specific reason they have.
 */

export type NotificationKind = "comment" | "reply" | "mention";

export interface CommentAudience {
  /** Who wrote the comment. Never notified about their own words. */
  actorId: string;
  /** Ids written by the @-mention picker. Names are never parsed out of the body. */
  mentionedUserIds?: readonly string[];
  /** Author of the comment being replied to, when this is a reply. */
  parentAuthorId?: string | null;
  /** The record's owner — may be unlinked to a user. */
  ownerUserId?: string | null;
  /** Linked authors credited on the record; unlinked ones arrive as null. */
  authorUserIds?: readonly (string | null | undefined)[];
  /** Whoever logged the record. */
  createdById?: string | null;
  /** Everyone who has already commented on this record. */
  priorCommenterIds?: readonly (string | null | undefined)[];
}

export interface CommentRecipient {
  userId: string;
  kind: NotificationKind;
}

/** Most specific wins when someone qualifies more than one way. */
const RANK: Record<NotificationKind, number> = {
  mention: 3,
  reply: 2,
  comment: 1,
};

/**
 * The recipient list for one new comment, de-duplicated by user with the
 * most specific kind kept. Mentions outrank replies, replies outrank
 * participation. The actor is always excluded; unlinked people (nulls) are
 * dropped.
 */
export function commentNotifications(
  audience: CommentAudience,
): CommentRecipient[] {
  const best = new Map<string, NotificationKind>();

  const add = (userId: string | null | undefined, kind: NotificationKind) => {
    if (!userId || userId === audience.actorId) return;
    const current = best.get(userId);
    if (current && RANK[current] >= RANK[kind]) return;
    best.set(userId, kind);
  };

  // Weakest first; add() upgrades in place as stronger reasons arrive.
  for (const id of audience.priorCommenterIds ?? []) add(id, "comment");
  for (const id of audience.authorUserIds ?? []) add(id, "comment");
  add(audience.ownerUserId, "comment");
  add(audience.createdById, "comment");
  add(audience.parentAuthorId, "reply");
  for (const id of audience.mentionedUserIds ?? []) add(id, "mention");

  return [...best].map(([userId, kind]) => ({ userId, kind }));
}

/**
 * Who an edit newly names. Editing a comment can add a mention that wasn't
 * there when it was posted, and being named is worth hearing about whenever
 * it happens — but only once: anyone already named keeps their peace, and
 * the author never hears about naming themselves.
 *
 * Removing a mention notifies nobody. The notification already sent stands;
 * it was true when it was sent.
 */
export function newMentions(
  previous: readonly string[],
  next: readonly string[],
  actorId: string,
): string[] {
  const had = new Set(previous);
  return [...new Set(next)].filter((id) => id !== actorId && !had.has(id));
}
