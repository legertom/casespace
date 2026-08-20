"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/current-user";

/**
 * Open a notification: mark it read and land on what it is about — the
 * comment itself, the record's Related workflows, or for a newly logged
 * record, the record itself. Reading and navigating are one act, so they're
 * one action.
 */
export async function openNotificationAction(id: string): Promise<void> {
  const user = await requireUser();
  const db = getDb();
  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
    .returning({
      kind: notifications.kind,
      useCaseId: notifications.useCaseId,
      commentId: notifications.commentId,
    });
  if (!row) redirect("/");
  revalidatePath("/", "layout");

  const record = `/use-cases/${row.useCaseId}`;
  if (row.commentId) redirect(`${record}#comment-${row.commentId}`);
  // A new record is its own news — the top of the page, not a section of it.
  redirect(row.kind === "link" ? `${record}#related` : record);
}

/** Clear the badge without reading each one. Used as a form action. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();
  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
    );
  revalidatePath("/", "layout");
}
