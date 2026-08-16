"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { postRevisions, posts } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { generateWhatsNew } from "./whats-new";
import type { ActionResult } from "./actions";

export async function regeneratePostAction(
  weekStart: string,
): Promise<ActionResult & { id?: string }> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Admins only." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return { error: "Bad week start date." };
  }
  try {
    const result = await generateWhatsNew(weekStart, user.id);
    revalidatePath("/whats-new");
    return { id: result.id };
  } catch (err) {
    console.error(err);
    return {
      error:
        err instanceof Error && err.message.includes("AI_GATEWAY")
          ? err.message
          : "Drafting failed. Try again.",
    };
  }
}

export async function updatePostAction(
  id: string,
  patch: { title: string; body: string },
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Admins only." };
  if (!patch.title.trim() || !patch.body.trim()) {
    return { error: "Title and body are required." };
  }
  const db = getDb();
  const title = patch.title.trim();

  // The outgoing version is archived in the same transaction as the edit —
  // an edit that saved without its revision would be a quiet overwrite.
  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(posts).where(eq(posts.id, id));
    if (!existing) return;
    if (existing.title === title && existing.body === patch.body) return;
    await tx.insert(postRevisions).values({
      postId: existing.id,
      title: existing.title,
      body: existing.body,
      model: existing.model,
      generatedAt: existing.generatedAt,
      editedAt: existing.editedAt,
      reason: "edited",
      replacedById: user.id,
    });
    await tx
      .update(posts)
      .set({ title, body: patch.body, editedAt: new Date() })
      .where(eq(posts.id, id));
  });
  revalidatePath("/whats-new");
  return {};
}
