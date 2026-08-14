"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { askAboutField, askCoach } from "@/lib/coach-bus";
import { RATING_FIELDS, type Department, type RatingKey } from "@/lib/domain";
import type { PersonRef, UseCaseUpdateInput } from "@/lib/use-case-input";
import { patchUseCaseAction } from "@/server/actions";
import { PeoplePicker, type PersonOption } from "@/components/people-picker";

export interface Choice {
  value: string;
  label: string;
}

export interface TeamChoice extends Choice {
  department: Department;
}

export type FieldEditor =
  | { kind: "text" }
  | { kind: "textarea"; rows?: number }
  /** One item per line — steps. */
  | { kind: "lines"; rows?: number }
  /** Comma-separated — AI tools. */
  | { kind: "tags" }
  | { kind: "number"; step?: string }
  | { kind: "date" }
  | { kind: "select"; options: Choice[]; empty?: string }
  | { kind: "checkboxes"; options: Choice[] }
  /** Yes / no / not assessed. */
  | { kind: "tri"; yes: string; no: string; unset: string }
  | { kind: "people"; people: PersonOption[]; multiple?: boolean }
  /** All seven worksheet ratings at once — they're read as a set. */
  | { kind: "ratings" }
  /** Department and team together, so the pair can't drift apart. */
  | { kind: "team"; departments: Choice[]; teams: TeamChoice[] };

type Value = string | number | boolean | string[] | null;

interface Props {
  record: { id: string; title: string };
  /** The column this edits. Ignored by the "ratings" and "team" editors. */
  field?: keyof UseCaseUpdateInput;
  label: string;
  value?: Value;
  ratings?: Record<RatingKey, number | null>;
  people?: PersonRef[];
  department?: Department | null;
  teamId?: string | null;
  editor: FieldEditor;
  canEdit: boolean;
  /** Refuse to save an empty value — title and description. */
  required?: boolean;
  /** What the Coach button quotes. Defaults to the value as text. */
  coachText?: string;
  className?: string;
  children: React.ReactNode;
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="currentColor">
      <path d="M11.6 1.6a1.4 1.4 0 0 1 2 2l-.8.8-2-2 .8-.8ZM10 3.1l2 2-6.6 6.6-2.6.6.6-2.6L10 3.1Z" />
    </svg>
  );
}

function toDraft(editor: FieldEditor, value: Value): string {
  if (value === null || value === undefined) return "";
  if (editor.kind === "lines") return (value as string[]).join("\n");
  if (editor.kind === "tags") return (value as string[]).join(", ");
  if (editor.kind === "tri") return value === true ? "yes" : value === false ? "no" : "";
  return String(value);
}

export function InlineField({
  record,
  field,
  label,
  value = null,
  ratings,
  people = [],
  department = null,
  teamId = null,
  editor,
  canEdit,
  required = false,
  coachText,
  className,
  children,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState(() => toDraft(editor, value));
  const [list, setList] = useState<string[]>(
    editor.kind === "checkboxes" ? ((value as string[]) ?? []) : [],
  );
  const [refs, setRefs] = useState<PersonRef[]>(people);
  const [ratingDraft, setRatingDraft] = useState(
    () => ratings ?? ({} as Record<RatingKey, number | null>),
  );
  const [dept, setDept] = useState<string>(department ?? "");
  const [team, setTeam] = useState<string>(teamId ?? "");
  const firstRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) firstRef.current?.focus();
  }, [editing]);

  function open() {
    setDraft(toDraft(editor, value));
    setList(editor.kind === "checkboxes" ? ((value as string[]) ?? []) : []);
    setRefs(people);
    setRatingDraft(ratings ?? ({} as Record<RatingKey, number | null>));
    setDept(department ?? "");
    setTeam(teamId ?? "");
    setError(null);
    setEditing(true);
  }

  /** The draft as the patch the server expects, or a message if it can't be. */
  function buildPatch(): UseCaseUpdateInput | string {
    const text = draft.trim();
    if (required && !text && editor.kind !== "people") {
      return `${label} can't be empty.`;
    }
    switch (editor.kind) {
      case "ratings":
        return Object.fromEntries(
          RATING_FIELDS.map(([k]) => [k, ratingDraft[k] ?? null]),
        ) as UseCaseUpdateInput;
      case "team":
        return {
          department: (dept || null) as Department | null,
          teamId: team || null,
        } as UseCaseUpdateInput;
      case "people": {
        const value = editor.multiple ? refs : (refs[0] ?? null);
        return { [field!]: value } as unknown as UseCaseUpdateInput;
      }
      case "checkboxes":
        return { [field!]: list } as unknown as UseCaseUpdateInput;
      case "lines":
        return {
          [field!]: draft.split("\n").map((s) => s.trim()).filter(Boolean),
        } as unknown as UseCaseUpdateInput;
      case "tags":
        return {
          [field!]: draft.split(",").map((s) => s.trim()).filter(Boolean),
        } as unknown as UseCaseUpdateInput;
      case "number": {
        if (!text) return { [field!]: null } as unknown as UseCaseUpdateInput;
        const n = Number(text);
        if (!Number.isFinite(n)) return `${label} has to be a number.`;
        return { [field!]: n } as unknown as UseCaseUpdateInput;
      }
      case "tri":
        return {
          [field!]: text === "yes" ? true : text === "no" ? false : null,
        } as unknown as UseCaseUpdateInput;
      default:
        return { [field!]: text || null } as unknown as UseCaseUpdateInput;
    }
  }

  function save() {
    const patch = buildPatch();
    if (typeof patch === "string") {
      setError(patch);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await patchUseCaseAction(record.id, patch);
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      setEditing(false);
    }
    const multiline = editor.kind === "textarea" || editor.kind === "lines";
    if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  }

  const inputCls =
    "w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm";

  if (!canEdit) return <div className={className}>{children}</div>;

  return (
    <div className={`group relative ${className ?? ""}`}>
      {editing ? (
        <div onKeyDown={onKeyDown} className="max-w-prose">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            {label}
          </p>
          <div className="mt-1.5">
            {editor.kind === "text" && (
              <input
                ref={firstRef as React.Ref<HTMLInputElement>}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={inputCls}
              />
            )}
            {(editor.kind === "textarea" || editor.kind === "lines") && (
              <textarea
                ref={firstRef as React.Ref<HTMLTextAreaElement>}
                rows={editor.rows ?? 4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={`${inputCls} resize-y`}
              />
            )}
            {editor.kind === "tags" && (
              <input
                ref={firstRef as React.Ref<HTMLInputElement>}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Comma-separated"
                className={inputCls}
              />
            )}
            {editor.kind === "number" && (
              <input
                ref={firstRef as React.Ref<HTMLInputElement>}
                type="number"
                step={editor.step ?? "any"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={inputCls}
              />
            )}
            {editor.kind === "date" && (
              <input
                ref={firstRef as React.Ref<HTMLInputElement>}
                type="date"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={inputCls}
              />
            )}
            {editor.kind === "select" && (
              <select
                ref={firstRef as React.Ref<HTMLSelectElement>}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={inputCls}
              >
                {editor.empty !== undefined && (
                  <option value="">{editor.empty}</option>
                )}
                {editor.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            {editor.kind === "tri" && (
              <select
                ref={firstRef as React.Ref<HTMLSelectElement>}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={inputCls}
              >
                <option value="">{editor.unset}</option>
                <option value="yes">{editor.yes}</option>
                <option value="no">{editor.no}</option>
              </select>
            )}
            {editor.kind === "checkboxes" && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {editor.options.map((o) => (
                  <label key={o.value} className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={list.includes(o.value)}
                      onChange={(e) =>
                        setList((prev) =>
                          editor.options
                            .map((x) => x.value)
                            .filter((v) =>
                              v === o.value ? e.target.checked : prev.includes(v),
                            ),
                        )
                      }
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            )}
            {editor.kind === "people" && (
              <PeoplePicker
                label={label}
                people={editor.people}
                value={refs}
                onChange={setRefs}
                multiple={editor.multiple}
              />
            )}
            {editor.kind === "ratings" && (
              <div className="space-y-1">
                {RATING_FIELDS.map(([key, name]) => (
                  <div
                    key={key}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline py-1.5 last:border-0"
                  >
                    <span className="text-sm">{name}</span>
                    <div role="radiogroup" aria-label={name} className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={ratingDraft[key] === n}
                          onClick={() =>
                            setRatingDraft((r) => ({
                              ...r,
                              [key]: r[key] === n ? null : n,
                            }))
                          }
                          className={`size-7 rounded-md border text-sm ${
                            ratingDraft[key] === n
                              ? "border-accent bg-accent text-white"
                              : "border-hairline-strong bg-surface hover:border-accent"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-ink-faint">
                  1 low – 5 high. Click a number again to clear it.
                </p>
              </div>
            )}
            {editor.kind === "team" && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  ref={firstRef as React.Ref<HTMLSelectElement>}
                  aria-label="Department"
                  value={dept}
                  onChange={(e) => {
                    setDept(e.target.value);
                    setTeam("");
                  }}
                  className={inputCls}
                >
                  <option value="">No department</option>
                  {editor.departments.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Team"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className={inputCls}
                >
                  <option value="">No team</option>
                  {editor.teams
                    .filter((t) => !dept || t.department === dept)
                    .map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-sm text-flag">
              {error}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper hover:bg-ink/85 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
            >
              Cancel
            </button>
            <span className="text-xs text-ink-faint">
              {editor.kind === "textarea" || editor.kind === "lines"
                ? "⌘↵ saves · Esc cancels"
                : "↵ saves · Esc cancels"}
            </span>
          </div>
        </div>
      ) : (
        <>
          {children}
          <span className="absolute right-0 top-0 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={open}
              aria-label={`Edit ${label}`}
              title={`Edit ${label}`}
              className="rounded-md border border-hairline-strong bg-paper p-1.5 text-ink-muted hover:text-accent"
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              onClick={() =>
                askCoach(
                  askAboutField(
                    record,
                    label,
                    coachText ?? toDraft(editor, value),
                  ),
                )
              }
              aria-label={`Ask the Coach about ${label}`}
              title={`Ask the Coach about ${label}`}
              className="rounded-md border border-hairline-strong bg-paper px-2 py-1.5 text-xs text-ink-muted hover:text-accent"
            >
              Coach
            </button>
          </span>
        </>
      )}
    </div>
  );
}
