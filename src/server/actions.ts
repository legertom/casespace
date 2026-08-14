"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import type { UcStatus } from "@/lib/domain";
import {
  useCaseCreateSchema,
  useCaseUpdateSchema,
  type UseCaseCreateInput,
  type UseCaseUpdateInput,
} from "@/lib/use-case-input";
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
  error?: string;
}

function messageFor(err: unknown): string {
  if (
    err instanceof ForbiddenError ||
    err instanceof NotFoundError ||
    err instanceof ValidationError
  ) {
    return err.message;
  }
  console.error(err);
  return "Something went wrong. Try again.";
}

export async function createUseCaseAction(
  raw: UseCaseCreateInput,
  source: "form" | "wizard" | "notes" = "form",
): Promise<ActionResult> {
  const user = await requireUser();
  let id: string;
  try {
    const input = useCaseCreateSchema.parse(raw);
    id = await createUseCase({ id: user.id, role: user.role }, input, source);
  } catch (err) {
    return { error: messageFor(err) };
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
    return { error: messageFor(err) };
  }
  revalidatePath("/use-cases");
  revalidatePath(`/use-cases/${id}`);
  redirect(`/use-cases/${id}`);
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
    return { error: messageFor(err) };
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
    return { error: messageFor(err) };
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
    return { error: messageFor(err) };
  }
  revalidatePath("/use-cases");
  redirect("/use-cases");
}
