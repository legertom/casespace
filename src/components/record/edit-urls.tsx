"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions";
import { patchUseCaseAction } from "@/server/actions";
import type { UseCaseUrlEntry } from "@/server/use-case-queries";
import { ErrorNote } from "@/components/error-note";
import { cleanUrls, toRows, UrlRows } from "@/components/use-case-url-rows";

/**
 * Edit the whole list at once, then save it whole — the same replace-wholesale
 * contract updateUseCase has for authors. No new server action: patching a
 * record already validates with useCaseUpdateSchema, so a bad URL comes back
 * as the schema's own message.
 */
export function EditUrls({
  useCaseId,
  urls,
}: {
  useCaseId: string;
  urls: UseCaseUrlEntry[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => toRows(urls));
  const [error, setError] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    // Discard the draft: reopening should show what's saved, not what was
    // abandoned.
    setRows(toRows(urls));
    setError(null);
    setOpen(false);
  }

  function save() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await patchUseCaseAction(useCaseId, {
        urls: cleanUrls(rows),
      });
      if (res?.error) {
        setError(res);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setRows(toRows(urls));
          setOpen(true);
        }}
        className="mt-4 rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
      >
        {urls.length === 0 ? "Add a link" : "Edit links"}
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-prose rounded-md border border-hairline bg-surface p-4">
      <UrlRows value={rows} onChange={setRows} />
      {error && <ErrorNote result={error} className="mt-2" />}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save links"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
