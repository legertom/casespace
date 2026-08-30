"use server";

import { requireUser } from "@/lib/current-user";
import { discoveryCheckpointSchema } from "@/lib/ai/discovery";
import type { ActionResult } from "./actions";
import { saveDiscoveryCheckpoint } from "./discovery-queries";
import { failure } from "./guards";

export interface SaveCheckpointResult extends ActionResult {
  id?: string;
}

/**
 * The human clicked "Save checkpoint" (or "Draft use case from this") — the
 * only path by which a Discovery checkpoint is written.
 *
 * The model has no `execute` for `propose_discovery_checkpoint`, so this
 * action is reached from a card click and nowhere else. What it re-derives
 * rather than accepts is the point of it:
 *
 * - `userId` comes from the session. The proposal has no user field, so there
 *   is nothing to spoof, and if one were ever added it would be ignored here.
 * - the linked use case comes from the chat's stored context, not from this
 *   call and not from the model.
 * - the checkpoint itself is re-validated against the same schema the tool
 *   declared, because what arrives here is a JSON blob from a browser, not the
 *   model's output.
 *
 * Every role can save one. A checkpoint is a note to yourself about a problem
 * you are thinking about; nothing about it touches the casebook or the
 * program's numbers, so `canCreateUseCase` is the wrong gate and a signed-in
 * guest working through an idea is a fine thing to allow.
 */
export async function saveDiscoveryCheckpointAction(
  chatId: string | null,
  raw: unknown,
): Promise<SaveCheckpointResult> {
  const user = await requireUser();
  const parsed = discoveryCheckpointSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "That checkpoint didn't validate, so nothing was saved." };
  }
  try {
    const id = await saveDiscoveryCheckpoint({
      userId: user.id,
      chatId: chatId || null,
      checkpoint: parsed.data,
    });
    return { id };
  } catch (err) {
    return failure(err);
  }
}
