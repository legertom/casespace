/**
 * Shared server-action helpers. This module is deliberately NOT "use server":
 * everything actions.ts exports must be an async server action, so the
 * helpers the action files share live here instead — importable by all of
 * them, callable by none of the client.
 */
import "server-only";
import { ZodError } from "zod";
import { requireUser, type CurrentUser } from "@/lib/current-user";
import type { ActionResult } from "./actions";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "./use-case-service";

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
 * Every action catch shapes its error through this, so ErrorNote's
 * "quote this reference" report flow works on every path.
 */
export function failure(err: unknown): ActionResult {
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
 * The action-level admin gate. Unlike the page-level requireAdmin (which
 * 404s), this denies with the ActionResult error shape the action returns
 * as-is: `if (gate.denied) return gate.denied`. When not denied, `user` is
 * the admin, saving the caller a second requireUser.
 */
export async function requireAdminActor(): Promise<
  { denied: ActionResult; user: null } | { denied: null; user: CurrentUser }
> {
  const user = await requireUser();
  if (user.role !== "admin") {
    return { denied: { error: "Admins only." }, user: null };
  }
  return { denied: null, user };
}
