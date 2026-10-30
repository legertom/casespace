/**
 * Ready to confirm: a Qualified program record whose ROI evidence checklist
 * is complete. Nothing is left for the people on the record to do — the next
 * move is Kate's, to Confirmed Positive ROI (the 15) or not. Pure, so the
 * rule, the bell's trigger, and its audience are unit-tested rather than
 * inferred from a server action.
 *
 * "Complete" is roiGaps coming back empty, the same list the record page
 * shows — so the badge appears exactly when that list has nothing left in
 * it, and the Coach's door switches to "Review the ROI for confirmation"
 * (roiCoachAction) at the same moment.
 *
 * Program membership is part of the rule. The 15 counts only program
 * records, and a Qualified record is in the program unless an admin took it
 * out on purpose — a record she excluded should not keep asking for her
 * decision.
 *
 * Derived, never stored: the badge reads it live from the record, so it
 * cannot disagree with the record. Only the bell needs to know when it
 * *changed*, and readyToConfirmBell answers that from the record before and
 * after a write.
 */
import { roiGaps, type RoiFields, type UcStatus } from "./domain";

export interface ReadinessFields extends RoiFields {
  status: UcStatus;
  inProgram: boolean;
}

export function isReadyToConfirm(uc: ReadinessFields): boolean {
  return uc.inProgram && uc.status === "qualified" && roiGaps(uc).length === 0;
}

export interface ReadyBellInput {
  /** The record as it stood before the write. */
  before: ReadinessFields;
  /** The record as the write left it — read back from the saved row. */
  after: ReadinessFields;
  /** Who made the write. Never told about their own doing. */
  actorId: string;
  /** Every admin's user id; unlinked or missing ones arrive as null. */
  adminUserIds: readonly (string | null | undefined)[];
}

/**
 * What one write does to the bell.
 *
 * - "ring": the record just became ready. Replace whatever ready rows it has
 *   with one fresh, unread row per recipient — a record that leaves and comes
 *   back rings again, but never stacks a second row for the same admin.
 * - "settle": it just stopped being ready — confirmed, demoted, rejected, a
 *   checklist item reopened, or taken out of the program. Mark its unread
 *   ready rows read: the decision they asked for is made or withdrawn, and
 *   an admin who confirmed from the badge must not still see the bell lit.
 * - null: readiness did not change. A later save of a record that is still
 *   ready is not news.
 */
export type ReadyBellPlan =
  | { kind: "ring"; recipients: string[] }
  | { kind: "settle" }
  | null;

export function readyToConfirmBell(input: ReadyBellInput): ReadyBellPlan {
  const was = isReadyToConfirm(input.before);
  const is = isReadyToConfirm(input.after);
  if (was === is) return null;
  if (!is) return { kind: "settle" };
  const seen = new Set<string>();
  for (const id of input.adminUserIds) {
    if (!id || id === input.actorId) continue;
    seen.add(id);
  }
  return { kind: "ring", recipients: [...seen] };
}
