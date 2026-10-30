/**
 * Why a record is or isn't in the program, read off its own trail — pure, so
 * the Coach is handed the facts instead of reconstructing them.
 *
 * Membership is stamped once, from the owner the record had when it was
 * logged (inProgramAtCreation in domain.ts); after that only an admin moves
 * it. A reader who applies that rule to the *current* owner gets it wrong
 * whenever the owner changed later — which is how the Coach filed a record
 * behaving exactly as designed as a bug (2026-10-30: logged with a non-lead
 * owner, handed to the AI Lead a month on, still community).
 *
 * The owner at logging comes from the audit trail: the earliest owner
 * change's "from" value, or the current owner if it never changed.
 */
import type { FieldChangeEntry } from "@/server/use-case-queries";
import { describeFieldChange } from "./field-audit";

/**
 * When owner changes started being recorded — field_changes shipped the
 * evening of 2026-08-25. A record logged before then may have changed owner
 * without a trace, so its owner at logging can't be told, and credit must
 * not guess.
 */
export const OWNER_AUDIT_BEGAN = new Date("2026-08-26T01:22:26Z");

export type OwnerWhenLogged =
  | { known: true; owner: string | null }
  | { known: false };

export function ownerWhenLogged(uc: {
  ownerName: string | null;
  createdAt: Date;
  fieldHistory: readonly FieldChangeEntry[];
}): OwnerWhenLogged {
  if (uc.createdAt < OWNER_AUDIT_BEGAN) return { known: false };
  const ownerChanges = uc.fieldHistory
    .filter((h) => h.field === "owner")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return {
    known: true,
    owner: ownerChanges.length ? ownerChanges[0].fromValue : uc.ownerName,
  };
}

export interface MembershipTrail {
  inProgram: boolean;
  /** One sentence: when, by whom, and whose the record was at that moment. */
  logged: string;
  /** Owner and membership changes since logging, oldest first. */
  changes: { when: string; change: string; by: string | null }[];
}

export function membershipTrail(uc: {
  inProgram: boolean;
  ownerName: string | null;
  createdAt: Date;
  createdByName: string | null;
  fieldHistory: readonly FieldChangeEntry[];
}): MembershipTrail {
  const when = uc.createdAt.toISOString().slice(0, 10);
  const by = uc.createdByName ? ` by ${uc.createdByName}` : "";
  const then = ownerWhenLogged(uc);
  const owner = !then.known
    ? "before owner changes were recorded, so the owner it had then is not on record"
    : then.owner === null
      ? "with no owner named, so membership followed whoever logged it"
      : `owned then by ${then.owner}`;

  return {
    inProgram: uc.inProgram,
    logged: `${when}${by}, ${owner}`,
    changes: uc.fieldHistory
      .filter((h) => h.field === "owner" || h.field === "in_program")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((h) => ({
        when: h.createdAt.toISOString().slice(0, 10),
        change: describeFieldChange(h.field, h.fromValue, h.toValue),
        by: h.changedByName,
      })),
  };
}
