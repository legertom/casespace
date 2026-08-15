"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  notifications,
  useCaseAuthors,
  useCaseComments,
  useCases,
  users,
} from "@/db/schema";
import { commentNotifications, newMentions } from "@/lib/comment-notifications";
import { requireUser } from "@/lib/current-user";
import { canReplyAtDepth } from "@/lib/domain";
import { canComment, canManageProgram } from "@/lib/permissions";
import type { ActionResult } from "./actions";

const MAX_BODY = 10_000;

/**
 * Post a comment (or a reply) and tell the people who should hear about it.
 * Fan-out happens right here: recipients come from a handful of columns and
 * one small query, so there is no queue and nothing to drain.
 */
export async function addCommentAction(
  useCaseId: string,
  body: string,
  parentId: string | null,
  mentionedUserIds: string[] = [],
): Promise<ActionResult & { id?: string }> {
  const user = await requireUser();
  if (!canComment(user.role)) return { error: "You can't comment." };

  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > MAX_BODY) return { error: "That comment is too long." };

  const db = getDb();
  const [record] = await db
    .select({
      id: useCases.id,
      ownerUserId: useCases.ownerUserId,
      createdById: useCases.createdById,
    })
    .from(useCases)
    .where(and(eq(useCases.id, useCaseId), isNull(useCases.deletedAt)));
  if (!record) return { error: "That record no longer exists." };

  let depth = 0;
  let parentAuthorId: string | null = null;
  if (parentId) {
    const [parent] = await db
      .select({
        id: useCaseComments.id,
        useCaseId: useCaseComments.useCaseId,
        authorId: useCaseComments.authorId,
        depth: useCaseComments.depth,
        deletedAt: useCaseComments.deletedAt,
      })
      .from(useCaseComments)
      .where(eq(useCaseComments.id, parentId));
    if (!parent || parent.useCaseId !== useCaseId) {
      return { error: "That comment no longer exists." };
    }
    if (parent.deletedAt) return { error: "That comment was removed." };
    if (!canReplyAtDepth(parent.depth)) {
      return { error: "This thread is as deep as it goes — reply higher up." };
    }
    depth = parent.depth + 1;
    parentAuthorId = parent.authorId;
  }

  // Ids come from the picker, but a stale page could still send one that no
  // longer resolves — notifications carry a foreign key, so check them.
  const mentioned = [...new Set(mentionedUserIds)].filter(Boolean);
  const validMentions = mentioned.length
    ? (
        await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, mentioned))
      ).map((u) => u.id)
    : [];

  const [comment] = await db
    .insert(useCaseComments)
    .values({
      useCaseId,
      authorId: user.id,
      parentId,
      depth,
      body: text,
      mentionedUserIds: validMentions,
    })
    .returning({ id: useCaseComments.id });

  const priorCommenters = await db
    .selectDistinct({ authorId: useCaseComments.authorId })
    .from(useCaseComments)
    .where(
      and(
        eq(useCaseComments.useCaseId, useCaseId),
        ne(useCaseComments.id, comment.id),
      ),
    );
  const authorLinks = await db
    .select({ userId: useCaseAuthors.userId })
    .from(useCaseAuthors)
    .where(eq(useCaseAuthors.useCaseId, useCaseId));

  const recipients = commentNotifications({
    actorId: user.id,
    mentionedUserIds: validMentions,
    parentAuthorId,
    ownerUserId: record.ownerUserId,
    authorUserIds: authorLinks.map((a) => a.userId),
    createdById: record.createdById,
    priorCommenterIds: priorCommenters.map((p) => p.authorId),
  });

  if (recipients.length > 0) {
    await db.insert(notifications).values(
      recipients.map((r) => ({
        userId: r.userId,
        kind: r.kind,
        useCaseId,
        commentId: comment.id,
        actorId: user.id,
      })),
    );
  }

  revalidatePath(`/use-cases/${useCaseId}`);
  return { id: comment.id };
}

/**
 * Editing is the author's alone. The edit trail is the "edited" marker.
 *
 * An edit can name someone who wasn't named when the comment was posted, and
 * that person hears about it — a mention added on the second pass is still a
 * mention. Anyone already named stays quiet, and removing a name notifies
 * nobody: the notification already sent was true when it was sent.
 */
export async function editCommentAction(
  commentId: string,
  body: string,
  mentionedUserIds: string[] = [],
): Promise<ActionResult> {
  const user = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Write something first." };
  if (text.length > MAX_BODY) return { error: "That comment is too long." };

  const db = getDb();
  const [comment] = await db
    .select({
      authorId: useCaseComments.authorId,
      useCaseId: useCaseComments.useCaseId,
      mentionedUserIds: useCaseComments.mentionedUserIds,
      deletedAt: useCaseComments.deletedAt,
    })
    .from(useCaseComments)
    .where(eq(useCaseComments.id, commentId));
  if (!comment || comment.deletedAt) {
    return { error: "That comment no longer exists." };
  }
  if (comment.authorId !== user.id) {
    return { error: "Only the author can edit a comment." };
  }

  const mentioned = [...new Set(mentionedUserIds)].filter(Boolean);
  const validMentions = mentioned.length
    ? (
        await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.id, mentioned))
      ).map((u) => u.id)
    : [];

  await db
    .update(useCaseComments)
    .set({
      body: text,
      editedAt: new Date(),
      mentionedUserIds: validMentions,
    })
    .where(eq(useCaseComments.id, commentId));

  const newly = newMentions(comment.mentionedUserIds, validMentions, user.id);
  if (newly.length > 0) {
    // Someone already told about this comment for a weaker reason gets that
    // row upgraded and re-surfaced rather than a second bell for one comment.
    const existing = await db
      .select({ userId: notifications.userId })
      .from(notifications)
      .where(
        and(
          eq(notifications.commentId, commentId),
          inArray(notifications.userId, newly),
        ),
      );
    const known = new Set(existing.map((n) => n.userId));

    if (known.size > 0) {
      await db
        .update(notifications)
        .set({ kind: "mention", readAt: null })
        .where(
          and(
            eq(notifications.commentId, commentId),
            inArray(notifications.userId, [...known]),
          ),
        );
    }
    const fresh = newly.filter((id) => !known.has(id));
    if (fresh.length > 0) {
      await db.insert(notifications).values(
        fresh.map((userId) => ({
          userId,
          kind: "mention" as const,
          useCaseId: comment.useCaseId,
          commentId,
          actorId: user.id,
        })),
      );
    }
  }

  revalidatePath(`/use-cases/${comment.useCaseId}`);
  return {};
}

/**
 * Soft delete — the author's call, or an admin's for moderation. Never a hard
 * delete: a comment with replies stays on screen as a placeholder so the
 * thread below it doesn't orphan.
 */
export async function deleteCommentAction(
  commentId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const db = getDb();
  const [comment] = await db
    .select({
      authorId: useCaseComments.authorId,
      useCaseId: useCaseComments.useCaseId,
      deletedAt: useCaseComments.deletedAt,
    })
    .from(useCaseComments)
    .where(eq(useCaseComments.id, commentId));
  if (!comment) return { error: "That comment no longer exists." };
  if (comment.deletedAt) return {};
  if (comment.authorId !== user.id && !canManageProgram(user.role)) {
    return { error: "Only the author or an admin can remove a comment." };
  }

  await db
    .update(useCaseComments)
    .set({ deletedAt: new Date() })
    .where(eq(useCaseComments.id, commentId));

  revalidatePath(`/use-cases/${comment.useCaseId}`);
  return {};
}
