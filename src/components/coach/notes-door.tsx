"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { proposalToCreateInput } from "@/lib/ai/proposal";
import { parseNotesAction } from "@/server/actions-ai";

export function NotesDoor() {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await parseNotesAction(notes);
          if (res.error) {
            setError(res.error);
            return;
          }
          if (res.proposal) {
            sessionStorage.setItem(
              "casespace-prefill",
              JSON.stringify({
                input: proposalToCreateInput(res.proposal),
                source: "notes",
              }),
            );
            router.push("/use-cases/new/review");
          }
        });
      }}
    >
      <label htmlFor="notes" className="block text-sm font-medium">
        Your notes
      </label>
      <textarea
        id="notes"
        rows={12}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Paste anything — the messier the better. Names, tools, numbers, steps…"
        className="mt-1.5 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm leading-relaxed"
      />
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || notes.trim().length < 20}
          className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
        >
          {pending ? "Reading your notes…" : "Parse into a draft"}
        </button>
        {pending && (
          <span className="text-sm text-ink-faint" role="status">
            Extracting only what the notes support — no invented numbers.
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 border-l-2 border-accent bg-accent-wash px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </form>
  );
}
