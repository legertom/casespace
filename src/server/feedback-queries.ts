import "server-only";
import { desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { feedback, users } from "@/db/schema";

export interface FeedbackRow {
  id: string;
  message: string;
  path: string | null;
  errorRef: string | null;
  errorDetail: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  reporterName: string | null;
}

/** Newest first. Admin-only surface — the caller checks the role. */
export async function listFeedback(openOnly = false): Promise<FeedbackRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: feedback.id,
      message: feedback.message,
      path: feedback.path,
      errorRef: feedback.errorRef,
      errorDetail: feedback.errorDetail,
      resolvedAt: feedback.resolvedAt,
      createdAt: feedback.createdAt,
      reporterName: users.name,
    })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .where(openOnly ? isNull(feedback.resolvedAt) : undefined)
    .orderBy(desc(feedback.createdAt))
    .limit(200);
  return rows;
}

export async function countOpenFeedback(): Promise<number> {
  const rows = await getDb()
    .select({ id: feedback.id })
    .from(feedback)
    .where(isNull(feedback.resolvedAt));
  return rows.length;
}
