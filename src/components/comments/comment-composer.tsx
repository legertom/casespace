"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MentionableUser } from "@/server/comment-queries";
import { addCommentAction } from "@/server/actions-comments";
import { MentionTextarea, mentionedIds } from "./mention-textarea";

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

/** Writing a comment or a reply. The box itself is MentionTextarea. */
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
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!value.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await addCommentAction(
        useCaseId,
        value,
        parentId,
        mentionedIds(value, mentioned),
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setValue("");
      setMentioned([]);
      onPosted?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <MentionTextarea
        label={parentId ? "Reply" : "Comment"}
        value={value}
        onChange={setValue}
        people={people}
        mentioned={mentioned}
        onMentionedChange={setMentioned}
        onSubmit={submit}
        placeholder={placeholder}
        rows={parentId ? 3 : 4}
        autoFocus={autoFocus}
      />
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
