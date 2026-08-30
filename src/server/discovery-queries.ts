import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { coachChats, discoveryCheckpoints, useCases } from "@/db/schema";
import type { DiscoveryCheckpoint } from "@/lib/ai/discovery";
import type { DiscoveryConstraint } from "@/lib/domain";
import { canUseChat } from "@/lib/permissions";
import { ForbiddenError } from "./use-case-service";

/**
 * Discovery checkpoints: the write, and the user's own read of their history.
 *
 * Everything here is scoped to one person. A Discovery conversation is
 * somebody thinking out loud about a problem they have not solved yet, and
 * there is no admin surface over this table on purpose — the aggregate the
 * program learns from is `coach_events`, which holds fields and outcomes and
 * never anybody's reasoning.
 *
 * Two rules the caller cannot opt out of: `userId` comes from the session, and
 * `useCaseId` comes from the chat's own stored context. Neither is ever taken
 * from the model's proposal, because a proposal is text a conversation talked
 * the model into producing.
 */

export interface CheckpointRow {
  id: string;
  chatId: string | null;
  useCaseId: string | null;
  useCaseTitle: string | null;
  workingTitle: string;
  statedProblem: string | null;
  refinedProblem: string;
  baseline: string | null;
  failurePoint: string | null;
  dominantConstraint: DiscoveryConstraint;
  dominantConstraintDetail: string;
  nextAction: string;
  expectedLearning: string;
  whyThisStep: string;
  ownerName: string | null;
  returnCondition: string | null;
  unresolvedQuestions: string[];
  createdAt: Date;
}

/** The most a `get_discovery_history` call will ever return. */
export const CHECKPOINT_HISTORY_LIMIT = 10;

/**
 * Save one checkpoint, as the signed-in user.
 *
 * The ownership rule matches `POST /api/coach` exactly: a chat that exists and
 * belongs to somebody else is a hard stop; a chat id with no row yet belongs
 * to nobody, so it is theirs. That second case is not a loophole, it is the
 * streaming race — the card renders when the tool call completes, which is
 * before the route writes the chat row on stream end, and a human who clicks
 * quickly should not lose their checkpoint.
 *
 * The linked use case is read off the chat row and nowhere else. In the same
 * narrow race the link is simply absent, and that is the right trade: a
 * checkpoint missing its record link is a small loss, while taking the link
 * from the request would mean the model's conversation could choose which
 * record a checkpoint claims to be about.
 *
 * Appends. There is no update path, and adding one would erase the sequence
 * that makes the table worth having.
 */
export async function saveDiscoveryCheckpoint(args: {
  userId: string;
  chatId: string | null;
  checkpoint: DiscoveryCheckpoint;
}): Promise<string> {
  const db = getDb();

  let useCaseId: string | null = null;
  if (args.chatId) {
    const [chat] = await db
      .select({
        userId: coachChats.userId,
        useCaseId: coachChats.useCaseId,
      })
      .from(coachChats)
      .where(eq(coachChats.id, args.chatId));
    if (!canUseChat(chat?.userId, args.userId)) {
      throw new ForbiddenError("That conversation isn't yours.");
    }
    useCaseId = chat?.useCaseId ?? null;
  }

  const c = args.checkpoint;
  const [row] = await db
    .insert(discoveryCheckpoints)
    .values({
      chatId: args.chatId,
      userId: args.userId,
      useCaseId,
      workingTitle: c.workingTitle,
      statedProblem: c.statedProblem ?? null,
      refinedProblem: c.refinedProblem,
      baseline: c.baseline ?? null,
      failurePoint: c.failurePoint ?? null,
      dominantConstraint: c.dominantConstraint,
      dominantConstraintDetail: c.dominantConstraintDetail,
      nextAction: c.nextAction,
      expectedLearning: c.expectedLearning,
      whyThisStep: c.whyThisStep,
      ownerName: c.owner ?? null,
      returnCondition: c.returnCondition ?? null,
      unresolvedQuestions: c.unresolvedQuestions ?? [],
    })
    .returning({ id: discoveryCheckpoints.id });

  return row.id;
}

/**
 * One person's recent checkpoints, newest first — what `get_discovery_history`
 * reads and what a returning conversation orients around.
 *
 * The `userId` filter is not a convenience, it is the authorization: there is
 * no argument that widens it, so no phrasing can talk the Coach into reading
 * somebody else's.
 */
export async function listDiscoveryCheckpoints(args: {
  userId: string;
  useCaseId?: string | null;
  chatId?: string | null;
  limit?: number;
}): Promise<CheckpointRow[]> {
  const db = getDb();
  const limit = Math.min(
    Math.max(args.limit ?? CHECKPOINT_HISTORY_LIMIT, 1),
    CHECKPOINT_HISTORY_LIMIT,
  );

  const filters = [eq(discoveryCheckpoints.userId, args.userId)];
  if (args.useCaseId) {
    filters.push(eq(discoveryCheckpoints.useCaseId, args.useCaseId));
  }
  if (args.chatId) filters.push(eq(discoveryCheckpoints.chatId, args.chatId));

  const rows = await db
    .select({
      id: discoveryCheckpoints.id,
      chatId: discoveryCheckpoints.chatId,
      useCaseId: discoveryCheckpoints.useCaseId,
      useCaseTitle: useCases.title,
      workingTitle: discoveryCheckpoints.workingTitle,
      statedProblem: discoveryCheckpoints.statedProblem,
      refinedProblem: discoveryCheckpoints.refinedProblem,
      baseline: discoveryCheckpoints.baseline,
      failurePoint: discoveryCheckpoints.failurePoint,
      dominantConstraint: discoveryCheckpoints.dominantConstraint,
      dominantConstraintDetail: discoveryCheckpoints.dominantConstraintDetail,
      nextAction: discoveryCheckpoints.nextAction,
      expectedLearning: discoveryCheckpoints.expectedLearning,
      whyThisStep: discoveryCheckpoints.whyThisStep,
      ownerName: discoveryCheckpoints.ownerName,
      returnCondition: discoveryCheckpoints.returnCondition,
      unresolvedQuestions: discoveryCheckpoints.unresolvedQuestions,
      createdAt: discoveryCheckpoints.createdAt,
    })
    .from(discoveryCheckpoints)
    .leftJoin(useCases, eq(useCases.id, discoveryCheckpoints.useCaseId))
    .where(and(...filters))
    .orderBy(desc(discoveryCheckpoints.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    unresolvedQuestions: Array.isArray(r.unresolvedQuestions)
      ? (r.unresolvedQuestions as string[])
      : [],
  }));
}

/**
 * The title of a live use case, or null.
 *
 * Used to validate the `useCase` query parameter before it is stored as a
 * chat's context: an id that names nothing gets dropped rather than
 * remembered, and the title is what the Coach is told it is looking at.
 */
export async function useCaseContext(
  id: string,
): Promise<{ id: string; title: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: useCases.id, title: useCases.title })
    .from(useCases)
    .where(and(eq(useCases.id, id), isNull(useCases.deletedAt)));
  return row ?? null;
}
