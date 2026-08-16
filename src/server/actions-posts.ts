"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { postRevisions, posts } from "@/db/schema";
import { generateWhatsNew } from "./whats-new";
import type { ActionResult } from "./actions";
import { failure, requireAdminActor } from "./guards";

export async function regeneratePostAction(
  weekStart: string,
): Promise<ActionResult & { id?: string }> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return { error: "Bad week start date." };
  }
  try {
    const result = await generateWhatsNew(weekStart, gate.user.id);
    revalidatePath("/whats-new");
    return { id: result.id };
  } catch (err) {
    // A gateway-configuration problem explains itself — keep its message as
    // the headline, as before. Everything else takes the standard shape.
    if (err instanceof Error && err.message.includes("AI_GATEWAY")) {
      console.error(err);
      return { error: err.message };
    }
    return failure(err);
  }
}

export async function updatePostAction(
  id: string,
  patch: { title: string; body: string },
): Promise<ActionResult> {
  const gate = await requireAdminActor();
  if (gate.denied) return gate.denied;
  const user = gate.user;
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
