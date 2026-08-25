/**
 * Who hears that a use case was logged — pure, so the rule is unit-tested
 * rather than inferred from a server action.
 *
 * Admins, because the program is theirs to steer: the count of documented use
 * cases is the thing they are accountable for, and a record they never saw
 * arrive is a record they can't qualify. Nobody else, because everyone else
 * already meets new records on the casebook.
 *
 * Community submissions are the exception: they do not ring the bell at all.
 * An open casebook means a volume no admin can triage from a 15-row list with
 * no digest and no per-kind filter, and a burst of them would evict the
 * comments, replies, and mentions that actually need an answer. They reach
 * admins as a counted card on the dashboard instead.
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
  /**
   * Whether the record counts toward the program. Read this from the saved
   * row, not from the submitted input — the stamp is the database's to make.
   */
  inProgram: boolean;
}

export function newUseCaseNotifications(
  audience: NewUseCaseAudience,
): { userId: string }[] {
  if (!audience.inProgram) return [];
  const seen = new Set<string>();
  for (const id of audience.adminUserIds) {
    if (!id || id === audience.actorId) continue;
    seen.add(id);
  }
  return [...seen].map((userId) => ({ userId }));
}
