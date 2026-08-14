"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedback } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/current-user";
import type { ActionResult } from "./actions";

export interface FeedbackInput {
  message: string;
  /** Where they were when it happened. */
  path?: string;
  /** Set when the report came out of an error banner. */
  errorRef?: string;
  errorDetail?: string;
}

/**
 * Product feedback, filed from wherever it was felt. Deliberately unvalidated
 * beyond "there are words in it" — the point is that reporting costs nothing.
 */
export async function submitFeedbackAction(
  input: FeedbackInput,
): Promise<ActionResult> {
  const user = await requireUser();
  const message = input.message.trim();
  if (!message) return { error: "Tell us what happened first." };
  try {
    await getDb()
      .insert(feedback)
      .values({
        userId: user.id,
        message,
        path: input.path?.slice(0, 500) ?? null,
        errorRef: input.errorRef ?? null,
        errorDetail: input.errorDetail?.slice(0, 2000) ?? null,
      });
  } catch (err) {
    console.error("[casespace feedback]", err);
    return {
      error: "The report didn't save.",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  revalidatePath("/feedback");
  return {};
}

export async function resolveFeedbackAction(
  id: string,
  resolved: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  await getDb()
    .update(feedback)
    .set({ resolvedAt: resolved ? new Date() : null })
    .where(eq(feedback.id, id));
  revalidatePath("/feedback");
  return {};
}
