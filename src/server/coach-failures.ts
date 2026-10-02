import "server-only";
import { desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { coachFailures, users } from "@/db/schema";
import { failureLine, failureRecord } from "@/lib/ai/coach-error";

/**
 * The durable copy of a failed Coach turn. Like search-events and
 * coach-events, this module watches the feature, it is not part of it:
 * recording swallows its own errors, because a failure that can't be logged
 * must not become a second failure for the person looking at the first.
 */

export async function recordCoachFailure(entry: {
  ref: string;
  stage: "setup" | "turn" | "tool";
  kind: string;
  model: string;
  userId?: string;
  chatId?: string;
  intent?: string;
  messageCount?: number;
  err: unknown;
}): Promise<void> {
  try {
    await getDb()
      .insert(coachFailures)
      .values({
        ref: entry.ref,
        stage: entry.stage,
        kind: entry.kind,
        model: entry.model,
        userId: entry.userId ?? null,
        chatId: entry.chatId ?? null,
        intent: entry.intent ?? null,
        messageCount: entry.messageCount ?? null,
        ...failureRecord(entry.err),
      });
  } catch (err) {
    console.error(`coach failure ${entry.ref} not recorded`, err);
  }
}

export interface CoachFailureRow {
  id: string;
  ref: string;
  stage: string;
  kind: string;
  userName: string | null;
  intent: string | null;
  messageCount: number | null;
  /** One line, and absent where the error's own words stay off the page. */
  detail: string | null;
  createdAt: Date;
}

const WINDOW_DAYS = 30;

/** Newest first, the last 30 days. Admin-only surface — the caller checks the role. */
export async function listCoachFailures(): Promise<CoachFailureRow[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const rows = await getDb()
    .select({
      id: coachFailures.id,
      ref: coachFailures.ref,
      stage: coachFailures.stage,
      kind: coachFailures.kind,
      userName: users.name,
      intent: coachFailures.intent,
      messageCount: coachFailures.messageCount,
      errorName: coachFailures.errorName,
      errorMessage: coachFailures.errorMessage,
      createdAt: coachFailures.createdAt,
    })
    .from(coachFailures)
    .leftJoin(users, eq(coachFailures.userId, users.id))
    .where(gte(coachFailures.createdAt, since))
    .orderBy(desc(coachFailures.createdAt))
    .limit(100);
  return rows.map(({ errorName, errorMessage, ...row }) => ({
    ...row,
    detail: failureLine({ kind: row.kind, errorName, errorMessage }),
  }));
}
