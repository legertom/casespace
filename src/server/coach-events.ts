import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { coachEvents, teams } from "@/db/schema";
import { diffProposal, type DiffInput } from "@/lib/coach-learnings";
import type { UseCaseCreateInput } from "@/lib/use-case-input";

/**
 * Recording what the AI doors proposed and what the human did about it.
 *
 * Every function here swallows its own errors and returns void. A learning
 * that fails to save must never take a use case down with it — this module
 * watches the write path, it is not part of it.
 */

export type Door = "wizard" | "notes";

const MAX_NOTE_CHARS = 500;

/** The Coach put a proposal on screen. The denominator for everything else. */
export async function recordProposed(args: {
  proposalRef: string;
  chatId?: string | null;
  userId: string;
  door: Door;
  proposed: DiffInput;
}): Promise<void> {
  try {
    const db = getDb();
    // The card re-renders while the response streams; the first one wins.
    const [existing] = await db
      .select({ id: coachEvents.id })
      .from(coachEvents)
      .where(
        and(
          eq(coachEvents.proposalRef, args.proposalRef),
          eq(coachEvents.kind, "proposed"),
        ),
      )
      .limit(1);
    if (existing) return;

    await db.insert(coachEvents).values({
      proposalRef: args.proposalRef,
      chatId: args.chatId ?? null,
      userId: args.userId,
      kind: "proposed",
      door: args.door,
      proposed: args.proposed,
    });
  } catch (err) {
    console.error("coach learning (proposed) not recorded", err);
  }
}

/** "Log it" or "Dismiss" on the card — the two decisions made in the chat. */
export async function recordDecision(args: {
  proposalRef: string;
  chatId?: string | null;
  userId: string;
  door: Door;
  kind: "accepted" | "dismissed";
  useCaseId?: string | null;
  note?: string | null;
}): Promise<void> {
  try {
    const db = getDb();
    await db.insert(coachEvents).values({
      proposalRef: args.proposalRef,
      chatId: args.chatId ?? null,
      userId: args.userId,
      kind: args.kind,
      door: args.door,
      useCaseId: args.useCaseId ?? null,
      note: args.note?.trim() ? args.note.trim().slice(0, MAX_NOTE_CHARS) : null,
    });
  } catch (err) {
    console.error("coach learning (decision) not recorded", err);
  }
}

/**
 * The one line on what was wrong, typed after the dismissal is already
 * recorded. Two steps on purpose: a dismissal that only counted once someone
 * explained it would undercount the impatient, who are worth hearing from.
 */
export async function addDismissReason(args: {
  proposalRef: string;
  userId: string;
  note: string;
}): Promise<void> {
  const note = args.note.trim();
  if (!note) return;
  try {
    const db = getDb();
    await db
      .update(coachEvents)
      .set({ note: note.slice(0, MAX_NOTE_CHARS) })
      .where(
        and(
          eq(coachEvents.proposalRef, args.proposalRef),
          eq(coachEvents.kind, "dismissed"),
          eq(coachEvents.userId, args.userId),
        ),
      );
  } catch (err) {
    console.error("coach learning (dismiss reason) not recorded", err);
  }
}

/**
 * The human took the proposal to the form, edited it, and saved — the richest
 * signal there is, because the edit is a labelled correction.
 *
 * Teams arrive as ids from the form and as a name from the proposal; both
 * become names before the diff, since ids would score the picker rather than
 * the Coach.
 */
export async function recordProposalEdit(args: {
  proposalRef: string;
  userId: string;
  door: Door;
  useCaseId: string;
  proposed: Partial<UseCaseCreateInput>;
  proposedTeamName?: string | null;
  saved: UseCaseCreateInput;
}): Promise<void> {
  try {
    const db = getDb();
    const teamIds = [args.saved.teamId, args.proposed.teamId].filter(
      (id): id is string => typeof id === "string",
    );
    const teamNames = new Map<string, string>();
    if (teamIds.length > 0) {
      const rows = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(inArray(teams.id, teamIds));
      for (const row of rows) teamNames.set(row.id, row.name);
    }
    const nameFor = (id: string | null | undefined) =>
      id ? (teamNames.get(id) ?? null) : null;

    const proposed: DiffInput = {
      ...args.proposed,
      teamName: args.proposedTeamName ?? nameFor(args.proposed.teamId),
    };
    const saved: DiffInput = {
      ...args.saved,
      teamName: nameFor(args.saved.teamId),
    };

    await db.insert(coachEvents).values({
      proposalRef: args.proposalRef,
      userId: args.userId,
      kind: "edited_then_saved",
      door: args.door,
      useCaseId: args.useCaseId,
      diff: diffProposal(proposed, saved),
    });
  } catch (err) {
    console.error("coach learning (edit) not recorded", err);
  }
}
