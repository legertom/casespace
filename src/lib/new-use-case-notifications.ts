/**
 * Who hears that a use case was logged — pure, so the rule is unit-tested
 * rather than inferred from a server action.
 *
 * Admins, because the program is theirs to steer: the count of documented use
 * cases is the thing they are accountable for, and a record they never saw
 * arrive is a record they can't qualify. Nobody else, because everyone else
 * already meets new records on the casebook.
 *
 * Unlike comment fan-out, there is no "most specific reason" to resolve — one
 * admin, one row. The only rule is that logging a record never notifies the
 * person who logged it.
 */

export interface NewUseCaseAudience {
  /** Who logged the record. Never told about their own. */
  actorId: string;
  /** Every admin's user id; unlinked or missing ones arrive as null. */
  adminUserIds: readonly (string | null | undefined)[];
}

export function newUseCaseNotifications(
  audience: NewUseCaseAudience,
): { userId: string }[] {
  const seen = new Set<string>();
  for (const id of audience.adminUserIds) {
    if (!id || id === audience.actorId) continue;
    seen.add(id);
  }
  return [...seen].map((userId) => ({ userId }));
}
