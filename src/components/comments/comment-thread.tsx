import { buildCommentTree, type CommentNode } from "@/lib/comment-tree";
import { canReplyAtDepth } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import type { CommentRow, MentionableUser } from "@/server/comment-queries";
import { CommentBody } from "./comment-body";
import { CommentComposer } from "./comment-composer";
import { CommentControls } from "./comment-controls";

interface Props {
  useCaseId: string;
  comments: CommentRow[];
  people: MentionableUser[];
  currentUserId: string;
  isAdmin: boolean;
}

/**
 * The record's discussion: server-rendered, nested by depth, markdown bodies.
 * Comments are public — anyone who can see the record can read and write them.
 */
export function CommentThread({
  useCaseId,
  comments,
  people,
  currentUserId,
  isAdmin,
}: Props) {
  const tree = buildCommentTree(comments);
  const live = comments.filter((c) => !c.deletedAt).length;

  return (
    <section>
      <h2 className="font-serif text-2xl">
        Comments{live > 0 ? ` · ${live}` : ""}
      </h2>

      <div className="mt-4 max-w-prose">
        <CommentComposer useCaseId={useCaseId} people={people} />
      </div>

      {tree.length > 0 ? (
        <ol className="mt-8 max-w-prose space-y-6">
          {tree.map((node) => (
            <Comment
              key={node.comment.id}
              node={node}
              useCaseId={useCaseId}
              people={people}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          No comments yet. Questions, ideas, and requests all belong here.
        </p>
      )}
    </section>
  );
}

function Comment({
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
