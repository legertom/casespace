import type { CommentNode } from "@/lib/comment-tree";
import { canReplyAtDepth } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import type { CommentRow, MentionableUser } from "@/server/comment-queries";
import { CommentBody } from "./comment-body";
import { CommentControls } from "./comment-controls";

/**
 * One comment card — controls, markdown body, replies nested by depth —
 * rendered at its root's slot in the record's Activity stream. Comments are
 * public: anyone who can see the record can read and write them.
 */
export function Comment({
  node,
  useCaseId,
  people,
  currentUserId,
  isAdmin,
}: {
  node: CommentNode<CommentRow>;
  useCaseId: string;
  people: MentionableUser[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const c = node.comment;
  const mine = c.authorId === currentUserId;
  const mentioned = people.filter((p) => c.mentionedUserIds.includes(p.id));

  return (
    <li id={`comment-${c.id}`} className="scroll-mt-6 target:bg-accent-wash">
      {node.removed ? (
        <p className="text-sm italic text-ink-faint">Comment removed</p>
      ) : (
        <>
          <p className="text-sm text-ink-faint">
            <span className="text-ink">{c.authorName ?? "Someone"}</span>{" "}
            · {fmtDate(c.createdAt)}
            {c.editedAt && " · edited"}
          </p>
          <CommentControls
            commentId={c.id}
            useCaseId={useCaseId}
            body={c.body}
            mentioned={mentioned}
            canEdit={mine}
            canDelete={mine || isAdmin}
            canReply={canReplyAtDepth(c.depth)}
            people={people}
          >
            <CommentBody body={c.body} mentions={mentioned} />
          </CommentControls>
        </>
      )}

      {node.children.length > 0 && (
        <ol className="mt-4 space-y-4 border-l border-hairline pl-4">
          {node.children.map((child) => (
            <Comment
              key={child.comment.id}
              node={child}
              useCaseId={useCaseId}
              people={people}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </ol>
      )}
    </li>
  );
}
