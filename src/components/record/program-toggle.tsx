"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorNote } from "@/components/error-note";
import {
  setProgramMembershipAction,
  type ActionResult,
} from "@/server/actions";

/**
 * Whether this record counts toward the 45 and the 15 — admin only.
 *
 * One boolean, so the checkbox is the editor, like GateToggle. It is a separate
 * component rather than a reuse of GateToggle because that one writes through
 * patchUseCaseAction, which is gated by canEditUseCase — routing membership
 * through it would hand the switch to every record's owner.
 */
export function ProgramToggle({
  id,
  inProgram,
}: {
  id: string;
  inProgram: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionResult | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await setProgramMembershipAction(id, next);
      if (res.error) setError(res);
      else router.refresh();
    });
  }

  return (
    <div className="text-sm">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={inProgram}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          aria-label="Counts toward the program"
          className="mt-0.5"
        />
        <span className={inProgram ? "" : "text-ink-muted"}>
          Counts toward the program
        </span>
      </label>
      <p className="mt-1 text-xs text-ink-muted">
        {inProgram
          ? "Included in the 45, the 15, and every number on the dashboard."
          : "A community submission. In the casebook, but counted nowhere — tick this to take it on."}
      </p>
      {error && <ErrorNote result={error} className="mt-1" />}
    </div>
  );
}
