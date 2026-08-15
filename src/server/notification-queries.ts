import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import {
  notifications,
  useCaseComments,
  useCaseLinks,
  useCases,
  users,
} from "@/db/schema";

export interface NotificationRow {
  id: string;
  kind: "comment" | "reply" | "mention" | "link";
  useCaseId: string;
  commentId: string | null;
  actorName: string | null;
  useCaseTitle: string;
  /** The workflow at the far end of the link, for "link" rows. */
  linkedTitle: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/** How many rows the bell lists — recent, not complete. */
export const NOTIFICATION_LIMIT = 15;

/** The workflow at the far end of a link — whichever end isn't the recipient's. */
const linkedUseCase = alias(useCases, "linked_use_case");

/** Rows whose anchor is gone are left out: a removed comment leaves nothing to open. */
const alive = and(isNull(useCaseComments.deletedAt), isNull(useCases.deletedAt));

/**
 * The bell's contents, newest first. One query: actor name, record title, and
 * the far end of a link are joined in. Comment and link rows live in the same
 * list, so both joins are outer — exactly one of them matches per row.
 */
export async function listNotifications(
  userId: string,
  limit = NOTIFICATION_LIMIT,
): Promise<NotificationRow[]> {
  const db = getDb();
  return db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      useCaseId: notifications.useCaseId,
      commentId: notifications.commentId,
      actorName: users.name,
      useCaseTitle: useCases.title,
      linkedTitle: linkedUseCase.title,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(useCases, eq(notifications.useCaseId, useCases.id))
    .leftJoin(useCaseComments, eq(notifications.commentId, useCaseComments.id))
    .leftJoin(useCaseLinks, eq(notifications.linkId, useCaseLinks.id))
    .leftJoin(
      linkedUseCase,
      or(
        and(
          eq(useCaseLinks.fromUseCaseId, notifications.useCaseId),
          eq(linkedUseCase.id, useCaseLinks.toUseCaseId),
        ),
        and(
          eq(useCaseLinks.toUseCaseId, notifications.useCaseId),
          eq(linkedUseCase.id, useCaseLinks.fromUseCaseId),
        ),
      ),
    )
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(and(eq(notifications.userId, userId), alive))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

/** The badge number. Counts the same rows the dropdown would show. */
export async function unreadNotificationCount(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .innerJoin(useCases, eq(notifications.useCaseId, useCases.id))
    .leftJoin(useCaseComments, eq(notifications.commentId, useCaseComments.id))
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), alive));
  return row?.count ?? 0;
}
