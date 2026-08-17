import { buildActivity } from "@/lib/activity";
import { buildCommentTree, countLiveComments } from "@/lib/comment-tree";
import { STATUS_LABELS } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import type { CommentRow, MentionableUser } from "@/server/comment-queries";
import type { StatusChangeEntry } from "@/server/use-case-queries";
import { Comment } from "@/components/comments/comment-thread";
import { CommentComposer } from "@/components/comments/comment-composer";

interface Props {
  useCaseId: string;
  /** Already redacted — the page maps visibleHistoryNote before the merge. */
  history: StatusChangeEntry[];
  comments: CommentRow[];
  people: MentionableUser[];
  currentUserId: string;
  isAdmin: boolean;
}

/**
 * The record's story in one stream: status changes and comments interleaved,
 * oldest first, ending at the composer — the box is where the eye lands, not
 * something to scroll past on the way to the discussion. Replies stay nested
 * under their root comment, at the root's position.
 */
export function RecordActivity({
  useCaseId,
  history,
  comments,
  people,
  currentUserId,
  isAdmin,
}: Props) {
  const tree = buildCommentTree(comments);
  const items = buildActivity(history, tree);
  const live = countLiveComments(comments);

  return (
    <section>
      <h2 className="font-serif text-2xl">
        Activity{live > 0 ? ` · ${live}` : ""}
      </h2>

      <ol className="mt-4 max-w-prose space-y-5">
        {items.map((item) =>
          item.kind === "status" ? (
            <StatusEvent key={item.entry.id} h={item.entry} />
          ) : (
            <Comment
              key={item.node.comment.id}
              node={item.node}
              useCaseId={useCaseId}
              people={people}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ),
        )}
      </ol>

      {tree.length === 0 && (
        <p className="mt-6 text-sm text-ink-muted">
          No comments yet. Questions, ideas, and requests all belong here.
        </p>
      )}

      <div className="mt-6 max-w-prose">
        <CommentComposer useCaseId={useCaseId} people={people} />
      </div>
    </section>
  );
}

function StatusEvent({ h }: { h: StatusChangeEntry }) {
  return (
    <li className="flex gap-4 text-sm">
      <span className="w-24 shrink-0 text-ink-faint">
        {fmtDate(h.createdAt)}
      </span>
      <span>
        {h.fromStatus === null ? (
          <>Logged into the casebook at {STATUS_LABELS[h.toStatus]}</>
        ) : (
          <>
            {STATUS_LABELS[h.fromStatus]} → {STATUS_LABELS[h.toStatus]}
          </>
        )}
        {h.changedByName && (
          <span className="text-ink-faint"> · {h.changedByName}</span>
        )}
        {h.note && <span className="block text-ink-muted">{h.note}</span>}
      </span>
    </li>
  );
}
