"use client";

import { useId, useRef, useState } from "react";
import type { PersonRef } from "@/lib/use-case-input";

export interface PersonOption {
  id: string;
  name: string;
  title: string | null;
}

interface Props {
  label: string;
  hint?: string;
  people: PersonOption[];
  value: PersonRef[];
  onChange: (refs: PersonRef[]) => void;
  multiple?: boolean;
}

/**
 * Typeahead over the real company directory so credit lands on real people —
 * free text only as a last resort ("Add … as written").
 */
export function PeoplePicker({
  label,
  hint,
  people,
  value,
  onChange,
  multiple = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputId = useId();
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = query.trim().toLowerCase();
  const matches = q
    ? people
        .filter((p) => p.name.toLowerCase().includes(q))
        .filter((p) => !value.some((v) => v.personId === p.id))
        .slice(0, 8)
    : [];
  const exact = people.some((p) => p.name.toLowerCase() === q);

  function add(ref: PersonRef) {
    onChange(multiple ? [...value, ref] : [ref]);
    setQuery("");
    setOpen(false);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <li
              key={`${v.personId ?? v.displayName}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border border-hairline-strong bg-surface py-0.5 pl-2.5 pr-1 text-sm"
            >
              {v.displayName}
              {!v.personId && (
                <span className="text-xs text-ink-faint">(as written)</span>
              )}
              <button
                type="button"
                aria-label={`Remove ${v.displayName}`}
                onClick={() => remove(i)}
                className="rounded-full px-1 text-ink-faint hover:text-accent"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {(multiple || value.length === 0) && (
        <div className="relative mt-2">
          <input
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open && (matches.length > 0 || q.length > 0)}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            placeholder="Type a name…"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
          {open && q.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-surface shadow-sm"
            >
              {matches.map((p) => (
                <li key={p.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      add({ personId: p.id, userId: null, displayName: p.name })
                    }
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent-wash"
                  >
                    <span>{p.name}</span>
                    <span className="truncate text-xs text-ink-faint">
                      {p.title}
                    </span>
                  </button>
                </li>
              ))}
              {!exact && (
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      add({
                        personId: null,
                        userId: null,
                        displayName: query.trim(),
                      })
                    }
                    className="w-full border-t border-hairline px-3 py-2 text-left text-sm text-ink-muted hover:bg-accent-wash"
                  >
                    Add &ldquo;{query.trim()}&rdquo; as written
                  </button>
                </li>
              )}
              {matches.length === 0 && exact && (
                <li className="px-3 py-2 text-sm text-ink-faint">
                  Already added
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
