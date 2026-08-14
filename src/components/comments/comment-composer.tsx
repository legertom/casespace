"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MentionableUser } from "@/server/comment-queries";
import { addCommentAction } from "@/server/actions-comments";

interface Props {
  useCaseId: string;
  /** Null for a top-level comment. */
  parentId?: string | null;
  people: MentionableUser[];
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  /** Rendered as a Cancel button when present (reply boxes). */
  onCancel?: () => void;
  onPosted?: () => void;
}

/** Where the caret sits inside an unfinished `@name` the composer is tracking. */
interface MentionQuery {
  /** Index of the `@`. */
  start: number;
  /** Caret position. */
  end: number;
  text: string;
}

// A name may carry one space ("Kate Sch…"), so the picker keeps matching past it.
const MENTION_RE = /(?:^|\s)@([A-Za-z'.-]*(?: [A-Za-z'.-]*)?)$/;

/**
 * A textarea that renders rich — the honest version of Jira's box. Typing `@`
 * opens the people list; picking someone writes their name into the body and
 * their id into mentionedUserIds, which is what actually notifies them.
 */
export function CommentComposer({
  useCaseId,
  parentId = null,
  people,
  placeholder = "Add a comment. Markdown works; type @ to mention someone.",
  submitLabel = "Comment",
  autoFocus = false,
  onCancel,
  onPosted,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const [mentioned, setMentioned] = useState<MentionableUser[]>([]);
  const [query, setQuery] = useState<MentionQuery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  function track(text: string, caret: number) {
    const match = MENTION_RE.exec(text.slice(0, caret));
    if (!match) return setQuery(null);
    setQuery({
      start: caret - match[1].length - 1,
      end: caret,
      text: match[1],
    });
  }

  const q = query?.text.trim().toLowerCase() ?? "";
  const matches = query
    ? people.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 6)
    : [];

  function insert(person: MentionableUser) {
    if (!query) return;
    const next = `${value.slice(0, query.start)}@${person.name} ${value.slice(query.end)}`;
    const caret = query.start + person.name.length + 2;
    setValue(next);
    setMentioned((m) => (m.some((p) => p.id === person.id) ? m : [...m, person]));
    setQuery(null);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(caret, caret);
    });
  }

  function submit() {
    if (!value.trim() || pending) return;
    setError(null);
    // Ids are the source of truth, but drop anyone whose name the author
    // backspaced away — nobody should hear about a mention that isn't there.
    const ids = mentioned
      .filter((p) => value.includes(`@${p.name}`))
      .map((p) => p.id);
    startTransition(async () => {
      const res = await addCommentAction(useCaseId, value, parentId, ids);
      if (res.error) {
        setError(res.error);
        return;
      }
      setValue("");
      setMentioned([]);
      setQuery(null);
      onPosted?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          ref={textarea}
          aria-label={parentId ? "Reply" : "Comment"}
          rows={parentId ? 3 : 4}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            track(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && query) {
              e.preventDefault();
              setQuery(null);
            } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
          className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
        />
        {query && matches.length > 0 && (
          <ul
            role="listbox"
            aria-label="Mention someone"
            className="absolute z-10 mt-1 w-64 overflow-hidden rounded-md border border-hairline bg-surface shadow-sm"
          >
            {matches.map((p) => (
              <li key={p.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insert(p)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent-wash"
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value.trim()}
          className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Posting…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="border-l-2 border-accent bg-accent-wash px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
