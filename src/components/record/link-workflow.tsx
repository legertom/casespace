"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LINK_KINDS, LINK_PHRASES, type LinkKind } from "@/lib/domain";
import type { ActionResult } from "@/server/actions";
import {
  linkUseCasesAction,
  unlinkUseCasesAction,
} from "@/server/actions-links";
import type { LinkableUseCase } from "@/server/use-case-link-queries";
import { ErrorNote } from "@/components/error-note";

interface Props {
  useCaseId: string;
  /** Every other live record; ~45 at the program's target, so it filters here. */
  candidates: LinkableUseCase[];
  /** Records already linked to this one — offering them again would only fail. */
  linkedIds: string[];
}

/**
 * "This workflow builds on …" — the sentence the picker completes. Any AI
 * lead can point at any record, including ones they had nothing to do with.
 */
export function LinkWorkflow({ useCaseId, candidates, linkedIds }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LinkKind>("relates_to");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<LinkableUseCase | null>(null);
  const [error, setError] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inputId = useId();
  const listId = useId();

  const q = query.trim().toLowerCase();
  const matches = q
    ? candidates
        .filter((c) => !linkedIds.includes(c.id))
        .filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.ownerName ?? "").toLowerCase().includes(q),
        )
        .slice(0, 8)
    : [];

  function reset() {
    setOpen(false);
    setQuery("");
    setPicked(null);
    setError(null);
  }

  function submit() {
    if (!picked || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await linkUseCasesAction(useCaseId, picked.id, kind);
      if (res.error) {
        setError(res);
        return;
      }
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
      >
        Link a workflow
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-prose rounded-md border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>This workflow</span>
        <select
          aria-label="How the two are related"
          value={kind}
          onChange={(e) => setKind(e.target.value as LinkKind)}
          className="rounded-md border border-hairline-strong bg-paper px-2 py-1.5 text-sm"
        >
          {LINK_KINDS.map((k) => (
            <option key={k} value={k}>
              {LINK_PHRASES[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="relative mt-2">
        <label htmlFor={inputId} className="sr-only">
          Which workflow
        </label>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus
          placeholder="Type a workflow title or owner…"
          value={picked ? picked.title : query}
          onChange={(e) => {
            setPicked(null);
            setQuery(e.target.value);
          }}
          className="w-full rounded-md border border-hairline-strong bg-paper px-3 py-2 text-sm"
        />
        {!picked && matches.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-surface shadow-sm"
          >
            {matches.map((c) => (
              <li key={c.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPicked(c);
                    setQuery("");
                  }}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-wash"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {c.ownerName ?? "no owner"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!picked && q.length > 0 && matches.length === 0 && (
          <p className="mt-1.5 text-xs text-ink-faint">
            No other workflow matches that.
          </p>
        )}
      </div>

      {error && <ErrorNote result={error} className="mt-2" />}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!picked || pending}
          className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Linking…" : "Link"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Removing a link takes it off both records — it was only ever stored once. */
export function UnlinkButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await unlinkUseCasesAction(id);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        aria-label={`Unlink ${title}`}
        className="text-xs text-ink-faint underline-offset-2 hover:text-accent hover:underline disabled:opacity-60"
      >
        {pending ? "Removing…" : "Unlink"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-flag">
          {error}
        </span>
      )}
    </>
  );
}
