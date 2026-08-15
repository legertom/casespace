"use server";

import { requireUser } from "@/lib/current-user";
import type { DiffInput } from "@/lib/coach-learnings";
import {
  addDismissReason,
  recordDecision,
  recordProposed,
  type Door,
} from "./coach-events";

/**
 * The client's view of coach learnings: three calls the proposal card makes as
 * the human decides. The recording itself lives in `coach-events.ts`, which
 * the server-side save path calls directly.
 */

export async function recordProposedAction(args: {
  proposalRef: string;
  chatId?: string | null;
  door: Door;
  proposed: DiffInput;
}): Promise<void> {
  const user = await requireUser();
  await recordProposed({ ...args, userId: user.id });
}

export async function recordDecisionAction(args: {
  proposalRef: string;
  chatId?: string | null;
  door: Door;
  kind: "accepted" | "dismissed";
  useCaseId?: string | null;
}): Promise<void> {
  const user = await requireUser();
  await recordDecision({ ...args, userId: user.id });
}

export async function addDismissReasonAction(
  proposalRef: string,
  note: string,
): Promise<void> {
  const user = await requireUser();
  await addDismissReason({ proposalRef, note, userId: user.id });
}
