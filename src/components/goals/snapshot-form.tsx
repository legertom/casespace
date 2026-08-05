"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPulseSnapshotAction } from "@/server/actions-goals";

export function SnapshotForm({ metricKey }: { metricKey: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [takenOn, setTakenOn] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addPulseSnapshotAction({
            metricKey,
            value: Number(value),
            takenOn,
          });
          if (res.error) setError(res.error);
          else {
            setValue("");
            setTakenOn("");
            router.refresh();
          }
        });
      }}
    >
      <label className="text-xs text-ink-muted">
        New reading (%)
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 block w-24 rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <label className="text-xs text-ink-muted">
        Survey date
        <input
          type="date"
          required
          value={takenOn}
          onChange={(e) => setTakenOn(e.target.value)}
          className="mt-1 block rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-sm text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper disabled:opacity-60"
      >
        {pending ? "Saving…" : "Record"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-accent">
          {error}
        </p>
      )}
    </form>
  );
}
