"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedback } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/current-user";
import {
  composeFeedback,
  feedbackProposalSchema,
  type FeedbackProposal,
} from "@/lib/ai/feedback-proposal";
import type { ActionResult } from "./actions";
import { failure } from "./guards";

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
    return failure(err);
  }
  revalidatePath("/feedback");
  return {};
}

/**
 * File a feedback report the Coach drafted, once the human has clicked.
 *
 * The reporter's role is read from the session, never from the proposal: the
 * "filed by" line is the one part of the message an admin reads as fact, so it
 * cannot come from anything the model can be talked into.
 */
export async function acceptFeedbackProposalAction(
  proposal: FeedbackProposal,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = feedbackProposalSchema.safeParse(proposal);
  if (!parsed.success) return { error: "That report is missing something." };

  const { message, path } = composeFeedback(parsed.data, user.role);
  return submitFeedbackAction({ message, path: path ?? undefined });
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
