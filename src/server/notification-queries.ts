import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notifications,
  useCaseComments,
  useCases,
  users,
} from "@/db/schema";

export interface NotificationRow {
  id: string;
  kind: "comment" | "reply" | "mention";
  useCaseId: string;
  commentId: string;
  actorName: string | null;
  useCaseTitle: string;
  readAt: Date | null;
  createdAt: Date;
}

/** How many rows the bell lists — recent, not complete. */
export const NOTIFICATION_LIMIT = 15;

/**
 * The bell's contents, newest first. One query: actor name and record title
 * are joined in. Notifications for removed comments are left out — the anchor
 * they point at is gone.
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
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(useCases, eq(notifications.useCaseId, useCases.id))
    .innerJoin(useCaseComments, eq(notifications.commentId, useCaseComments.id))
    .leftJoin(users, eq(notifications.actorId, users.id))
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(useCaseComments.deletedAt),
        isNull(useCases.deletedAt),
      ),
    )
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
    .innerJoin(useCaseComments, eq(notifications.commentId, useCaseComments.id))
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        isNull(useCaseComments.deletedAt),
        isNull(useCases.deletedAt),
      ),
    );
  return row?.count ?? 0;
}
