"use client";

import { useState } from "react";
import { URL_KINDS, URL_KIND_HINTS, URL_KIND_LABELS, type UrlKind } from "@/lib/domain";
import type { UseCaseUrlInput } from "@/lib/use-case-input";

/**
 * The repeatable link editor, shared by the full form and the record page —
 * the same arrangement PeoplePicker has, and for the same reason: two copies
 * of this would drift.
 *
 * Rows carry a client-only key rather than being keyed by index. Removing a
 * row from the middle of an index-keyed list makes React reuse the wrong input
 * element, and the text visibly jumps up a row.
 */
type Row = UseCaseUrlInput & { key: string };

const inputCls =
  "w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm";

function blankRow(): Row {
  return { key: crypto.randomUUID(), kind: "live", label: null, url: "" };
}

export function toRows(urls: readonly UseCaseUrlInput[]): Row[] {
  return urls.map((u) => ({ ...u, key: crypto.randomUUID() }));
}

/** Trim, drop the blanks, forget the client-only keys. */
export function cleanUrls(rows: readonly Row[]): UseCaseUrlInput[] {
  return rows
    .map((r) => ({
      kind: r.kind,
      label: r.label?.trim() || null,
      url: r.url.trim(),
    }))
    .filter((r) => r.url !== "");
}

export function UrlRows({
  value,
  onChange,
}: {
  value: Row[];
  onChange: (rows: Row[]) => void;
}) {
  // Only for the aria-live count; the rows themselves are controlled above.
  const [announce, setAnnounce] = useState("");

  function patch(i: number, next: Partial<Row>) {
    onChange(value.map((r, j) => (j === i ? { ...r, ...next } : r)));
  }

  function remove(i: number) {
    setAnnounce(`Removed link ${i + 1}.`);
    onChange(value.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((r, i) => (
            <li
              key={r.key}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr_auto] sm:items-start"
            >
              <select
                aria-label={`Link ${i + 1} kind`}
                value={r.kind}
                onChange={(e) => patch(i, { kind: e.target.value as UrlKind })}
                className={inputCls}
              >
                {URL_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {URL_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <div className="space-y-2">
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  aria-label={`${URL_KIND_LABELS[r.kind]} URL`}
                  value={r.url}
                  onChange={(e) => patch(i, { url: e.target.value })}
                  className={inputCls}
                />
                {/* The kind names the link on its own for the other three. */}
                {r.kind === "other" && (
                  <input
                    placeholder="What is it? e.g. Runbook"
                    aria-label={`Link ${i + 1} label`}
                    value={r.label ?? ""}
                    onChange={(e) => patch(i, { label: e.target.value })}
                    className={inputCls}
                  />
                )}
                <p className="text-xs text-ink-faint">{URL_KIND_HINTS[r.kind]}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove link ${i + 1}`}
                className="justify-self-start pt-2 text-xs text-ink-faint underline-offset-2 hover:text-accent hover:underline sm:justify-self-auto"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => onChange([...value, blankRow()])}
        className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
      >
        Add a link
      </button>
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </div>
  );
}
