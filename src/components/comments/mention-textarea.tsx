"use client";

import { useRef, useState } from "react";
import type { MentionableUser } from "@/server/comment-queries";
import { MENTIONABLE_LIMIT } from "@/lib/domain";

interface Props {
  /** For screen readers — "Comment", "Reply", "Edit comment". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Everyone the picker can offer. */
  people: MentionableUser[];
  /** Who the picker has written into the text so far. */
  mentioned: MentionableUser[];
  onMentionedChange: (next: MentionableUser[]) => void;
  /** ⌘↵ / Ctrl↵. */
  onSubmit: () => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}

/** Where the caret sits inside an unfinished `@name` the box is tracking. */
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
 * A textarea that knows about people — the honest version of Jira's box.
 * Typing `@` opens the people list; picking someone writes their name into
 * the text and hands their id back, which is what actually notifies them.
 *
 * Writing a comment and editing one are the same act as far as mentions are
 * concerned, so both boxes are this one.
 */
export function MentionTextarea({
  label,
  value,
  onChange,
  people,
  mentioned,
  onMentionedChange,
  onSubmit,
  placeholder,
  rows = 4,
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState<MentionQuery | null>(null);
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
  // A capped list arrives at exactly the limit. When a search then finds
  // nobody, the person may exist past the cutoff — say so rather than
  // presenting "no account" as fact.
  const maybeTruncated = people.length >= MENTIONABLE_LIMIT;

  function insert(person: MentionableUser) {
    if (!query) return;
    const next = `${value.slice(0, query.start)}@${person.name} ${value.slice(query.end)}`;
    const caret = query.start + person.name.length + 2;
    onChange(next);
    if (!mentioned.some((p) => p.id === person.id)) {
      onMentionedChange([...mentioned, person]);
    }
    setQuery(null);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={textarea}
        aria-label={label}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && query) {
            e.preventDefault();
            setQuery(null);
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
      />
      {query && matches.length === 0 && maybeTruncated && q.length > 0 && (
        <div className="absolute z-10 mt-1 w-64 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink-muted shadow-sm">
          Nobody listed matches — but not everyone is listed. If someone seems
          missing, they may still have an account.
        </div>
      )}
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
  );
}

/**
 * The ids to send with a body: whoever the picker recorded and whose name is
 * still written in the text. Nobody should hear about a mention the author
 * backspaced away before saving.
 */
export function mentionedIds(
  body: string,
  mentioned: MentionableUser[],
): string[] {
  return mentioned.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id);
}
