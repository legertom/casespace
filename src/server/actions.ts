"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import type { UcStatus } from "@/lib/domain";
import {
  useCaseCreateSchema,
  useCaseUpdateSchema,
  type UseCaseCreateInput,
  type UseCaseUpdateInput,
} from "@/lib/use-case-input";
import { recordProposalEdit } from "./coach-events";
import {
  createUseCase,
  ForbiddenError,
  NotFoundError,
  rejectAtQualifiedGate,
  setStatus,
  softDeleteUseCase,
  updateUseCase,
  ValidationError,
} from "./use-case-service";

export interface ActionResult {
  /** The line a person reads. */
  error?: string;
  /** The underlying failure, verbatim — what makes a bug report actionable. */
  detail?: string;
  /** Ties what the user sees to the server log line. */
  ref?: string;
}

/** Short, sayable-over-a-desk, and unique enough to grep the logs for. */
function errorRef() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function detailOf(err: unknown): string {
  if (err instanceof ZodError) {
    return err.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Expected failures explain themselves. Anything else gets a reference and
 * the real message: an internal tool with five users is better served by a
 * specific error the reporter can paste than by a reassuring vague one.
 */
function failure(err: unknown): ActionResult {
  if (
    err instanceof ForbiddenError ||
    err instanceof NotFoundError ||
    err instanceof ValidationError
  ) {
    return { error: err.message };
  }
  if (err instanceof ZodError) {
    return {
      error: "That didn't pass validation, so nothing was saved.",
      detail: detailOf(err),
    };
  }
  const ref = errorRef();
  console.error(`[casespace error ${ref}]`, err);
  return {
    error: "Something went wrong — nothing was saved.",
    detail: detailOf(err),
    ref,
  };
}

/**
 * `learning` is set only when this save came from an AI proposal the human
 * edited first. It has to be recorded here rather than by the caller: this
 * action redirects on success, so nothing downstream of it ever runs.
 */
export interface ProposalLearning {
  proposalRef: string;
  proposed: Partial<UseCaseCreateInput>;
  proposedTeamName?: string | null;
}

export async function createUseCaseAction(
  raw: UseCaseCreateInput,
  source: "form" | "wizard" | "notes" = "form",
  learning?: ProposalLearning,
): Promise<ActionResult> {
  const user = await requireUser();
  let id: string;
  let input: UseCaseCreateInput;
  try {
    input = useCaseCreateSchema.parse(raw);
    id = await createUseCase({ id: user.id, role: user.role }, input, source);
  } catch (err) {
    return failure(err);
  }
  if (learning && (source === "wizard" || source === "notes")) {
    await recordProposalEdit({
      proposalRef: learning.proposalRef,
      userId: user.id,
      door: source,
      useCaseId: id,
      proposed: learning.proposed,
      proposedTeamName: learning.proposedTeamName,
      saved: input,
    });
  }
  revalidatePath("/use-cases");
  redirect(`/use-cases/${id}`);
}

export async function updateUseCaseAction(
  id: string,
  raw: UseCaseUpdateInput,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const input = useCaseUpdateSchema.parse(raw);
    await updateUseCase({ id: user.id, role: user.role }, id, input);
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/use-cases");
  revalidatePath(`/use-cases/${id}`);
  redirect(`/use-cases/${id}`);
}

/**
 * One field at a time, from the record page. Same validation and permissions
 * as the full form — it just stays where it is instead of redirecting, so the
 * reader keeps their place on the page.
 */
export async function patchUseCaseAction(
  id: string,
  raw: UseCaseUpdateInput,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const input = useCaseUpdateSchema.parse(raw);
    await updateUseCase({ id: user.id, role: user.role }, id, input);
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/use-cases");
  revalidatePath(`/use-cases/${id}`);
  return {};
}

export async function setStatusAction(
  id: string,
  to: UcStatus,
  note?: string,
): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await setStatus({ id: user.id, role: user.role }, id, to, note);
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/use-cases");
  revalidatePath(`/use-cases/${id}`);
  return {};
}

export async function rejectGateAction(
  id: string,
  reason: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!reason.trim()) return { error: "A reason is required to reject." };
  try {
    await rejectAtQualifiedGate({ id: user.id, role: user.role }, id, reason.trim());
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/use-cases");
  revalidatePath(`/use-cases/${id}`);
  return {};
}

export async function deleteUseCaseAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await softDeleteUseCase({ id: user.id, role: user.role }, id);
  } catch (err) {
    return failure(err);
  }
  revalidatePath("/use-cases");
  redirect("/use-cases");
}
