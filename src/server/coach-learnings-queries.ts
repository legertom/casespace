import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { coachChats, coachEvents, users } from "@/db/schema";
import {
  dropOffByStep,
  summarizeCorrections,
  summarizeOutcomes,
  type DropOff,
  type FieldChange,
  type FieldStat,
  type OutcomeSummary,
} from "@/lib/coach-learnings";

/**
 * The admin read of `coach_events` — aggregate by construction.
 *
 * Nothing here returns a transcript or a proposal's contents in bulk. The
 * corrections carry short before/after strings because a count without an
 * example teaches nothing, and dismiss reasons carry a name because the point
 * is to be able to go and ask. Everything else is arithmetic.
 */

export interface DismissReason {
  proposalRef: string;
  note: string;
  personName: string;
  at: Date;
}

export interface CoachLearnings {
  windowDays: number;
  outcomes: OutcomeSummary;
  corrections: FieldStat[];
  dismissals: DismissReason[];
  dropOff: { buckets: DropOff[]; abandoned: number; unattributed: number };
  wizardChats: number;
  /** True before anything has happened — the page says so rather than lying with zeros. */
  empty: boolean;
}

const DEFAULT_WINDOW_DAYS = 90;

export async function getCoachLearnings(
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<CoachLearnings> {
  const db = getDb();
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [kindRows, diffRows, dismissRows, chatRows] = await Promise.all([
    db
      .select({ kind: coachEvents.kind, count: sql<number>`count(*)::int` })
      .from(coachEvents)
      .where(gte(coachEvents.createdAt, since))
      .groupBy(coachEvents.kind),

    db
      .select({ diff: coachEvents.diff })
      .from(coachEvents)
      .where(
        and(
          eq(coachEvents.kind, "edited_then_saved"),
          gte(coachEvents.createdAt, since),
        ),
      )
      .orderBy(desc(coachEvents.createdAt)),

    db
      .select({
        proposalRef: coachEvents.proposalRef,
        note: coachEvents.note,
        personName: users.name,
        at: coachEvents.createdAt,
      })
      .from(coachEvents)
      .innerJoin(users, eq(users.id, coachEvents.userId))
      .where(
        and(
          eq(coachEvents.kind, "dismissed"),
          gte(coachEvents.createdAt, since),
          sql`${coachEvents.note} is not null`,
        ),
      )
      .orderBy(desc(coachEvents.createdAt))
      .limit(50),

    db
      .select({ messages: coachChats.messages })
      .from(coachChats)
      .where(
        and(eq(coachChats.intent, "wizard"), gte(coachChats.updatedAt, since)),
      ),
  ]);

  const countOf = (kind: string) =>
    kindRows.find((r) => r.kind === kind)?.count ?? 0;

  const diffs = diffRows.map((r) =>
    Array.isArray(r.diff) ? (r.diff as FieldChange[]) : [],
  );
  const accepted = countOf("accepted");
  const editedThenSaved = countOf("edited_then_saved");

  const outcomes = summarizeOutcomes({
    proposed: countOf("proposed"),
    accepted,
    editedThenSaved,
    dismissed: countOf("dismissed"),
    // A draft carried through the form untouched is as clean as an outright
    // accept — the notes door just has no button that says so.
    savedUnchanged: accepted + diffs.filter((d) => d.length === 0).length,
  });

  return {
    windowDays,
    outcomes,
    corrections: summarizeCorrections(diffs),
    dismissals: dismissRows.flatMap((r) =>
      r.note
        ? [
            {
              proposalRef: r.proposalRef,
              note: r.note,
              personName: r.personName,
              at: r.at,
            },
          ]
        : [],
    ),
    dropOff: dropOffByStep(chatRows),
    wizardChats: chatRows.length,
    empty: outcomes.proposed === 0 && chatRows.length === 0,
  };
}
