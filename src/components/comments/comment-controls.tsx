"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MentionableUser } from "@/server/comment-queries";
import {
  deleteCommentAction,
  editCommentAction,
} from "@/server/actions-comments";
import { CommentComposer } from "./comment-composer";

interface Props {
  commentId: string;
  useCaseId: string;
  /** Raw markdown, for the edit box. */
  body: string;
  canEdit: boolean;
  canDelete: boolean;
  /** False at the deepest level — there is nowhere left to nest. */
  canReply: boolean;
  people: MentionableUser[];
  /** The server-rendered markdown body. */
  children: React.ReactNode;
}

/**
 * The interactive shell around one comment: reply, edit, remove. The body
 * itself stays server-rendered and arrives as children.
 */
export function CommentControls({
  commentId,
  useCaseId,
  body,
  canEdit,
  canDelete,
  canReply,
  people,
  children,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!draft.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await editCommentAction(commentId, draft);
      if (res.error) setError(res.error);
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCommentAction(commentId);
      if (res.error) setError(res.error);
      else {
        setConfirming(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            aria-label="Edit comment"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.trim()}
              className="rounded-md bg-ink px-3 py-1.5 text-sm text-paper hover:bg-ink/85 disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(body);
                setEditing(false);
              }}
              className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        children
      )}

      {!editing && (
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
          {canReply && !replying && (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="underline-offset-2 hover:text-accent hover:underline"
            >
              Reply
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setDraft(body);
                setEditing(true);
              }}
              className="underline-offset-2 hover:text-accent hover:underline"
            >
              Edit
            </button>
          )}
          {canDelete &&
            (confirming ? (
              <span className="inline-flex items-center gap-2">
                Remove it?
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className="underline underline-offset-2 hover:text-accent disabled:opacity-60"
                >
                  {pending ? "Removing…" : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="underline underline-offset-2 hover:text-accent"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="underline-offset-2 hover:text-accent hover:underline"
              >
                Remove
              </button>
            ))}
        </div>
      )}

      {replying && (
        <div className="mt-3">
          <CommentComposer
            useCaseId={useCaseId}
            parentId={commentId}
            people={people}
            placeholder="Reply. Markdown works; type @ to mention someone."
            submitLabel="Reply"
            autoFocus
            onCancel={() => setReplying(false)}
            onPosted={() => setReplying(false)}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-flag">
          {error}
        </p>
      )}
    </>
  );
}
