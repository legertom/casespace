"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";
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
  await db
    .update(posts)
    .set({
      title: patch.title.trim(),
      body: patch.body,
      editedAt: new Date(),
    })
    .where(eq(posts.id, id));
  revalidatePath("/whats-new");
  return {};
}
