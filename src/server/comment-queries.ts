import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { useCaseComments, users } from "@/db/schema";

export interface CommentRow {
  id: string;
  parentId: string | null;
  depth: number;
  body: string;
  authorId: string;
  authorName: string | null;
  mentionedUserIds: string[];
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

/** Every comment on a record, oldest first — the tree is shaped in buildCommentTree. */
export async function listComments(useCaseId: string): Promise<CommentRow[]> {
  const db = getDb();
  return db
    .select({
      id: useCaseComments.id,
      parentId: useCaseComments.parentId,
      depth: useCaseComments.depth,
      body: useCaseComments.body,
      authorId: useCaseComments.authorId,
      authorName: users.name,
      mentionedUserIds: useCaseComments.mentionedUserIds,
      createdAt: useCaseComments.createdAt,
      editedAt: useCaseComments.editedAt,
      deletedAt: useCaseComments.deletedAt,
    })
    .from(useCaseComments)
    .leftJoin(users, eq(useCaseComments.authorId, users.id))
    .where(eq(useCaseComments.useCaseId, useCaseId))
    .orderBy(asc(useCaseComments.createdAt));
}

export interface MentionableUser {
  id: string;
  name: string;
  /** Their directory row, when their login is linked — what a mention links to. */
  personId: string | null;
}

/**
 * Everyone who can be @-mentioned: sign-in users, not the wider people
 * directory — a mention has to reach an account for the bell to mean anything.
 * ~22 rows; ship the list to the composer directly.
 */
export async function listMentionableUsers(): Promise<MentionableUser[]> {
  const db = getDb();
  return db
    .select({ id: users.id, name: users.name, personId: users.personId })
    .from(users)
    .orderBy(asc(users.name));
}
