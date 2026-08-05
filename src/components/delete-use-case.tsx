"use client";

import { useState, useTransition } from "react";
import { deleteUseCaseAction } from "@/server/actions";

export function DeleteUseCase({ id, title }: { id: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-ink-faint underline-offset-2 hover:text-accent hover:underline"
      >
        Delete this use case
      </button>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <p>
        Remove <strong>{title}</strong> from the casebook? It&rsquo;s a soft
        delete — an admin can restore it from the database.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteUseCaseAction(id);
              if (res?.error) setError(res.error);
            })
          }
          className="rounded-md bg-accent px-3 py-1.5 text-white hover:bg-accent-deep disabled:opacity-60"
        >
          {pending ? "Removing…" : "Yes, remove it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-hairline-strong px-3 py-1.5"
        >
          Keep it
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
