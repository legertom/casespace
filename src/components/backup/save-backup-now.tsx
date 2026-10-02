"use client";

import { useState, useTransition } from "react";
import { ErrorNote } from "@/components/error-note";
import type { ActionResult } from "@/server/actions";
import { saveBackupNowAction } from "@/server/actions-backup";

export function SaveBackupNow() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(await saveBackupNowAction());
          })
        }
        className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save one now"}
      </button>
      {result && !result.error && (
        <span className="ml-3 text-sm text-ink-muted" role="status">
          Saved.
        </span>
      )}
      {result?.error && <ErrorNote result={result} className="mt-3" />}
    </div>
  );
}
