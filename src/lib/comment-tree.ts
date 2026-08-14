/**
 * Shaping a flat comment list into the thread the page renders — pure, so the
 * soft-delete rules are tested rather than eyeballed on screen.
 *
 * A removed comment with replies still occupies its place, or the thread
 * below it would orphan; a removed leaf simply goes away.
 */

export interface CommentLike {
  id: string;
  parentId: string | null;
  deletedAt: Date | null;
}

export interface CommentNode<T extends CommentLike> {
  comment: T;
  /** True when the comment was removed but its replies keep it on screen. */
  removed: boolean;
  children: CommentNode<T>[];
}

/**
 * Nest comments under their parents, oldest first (input order is preserved).
 * Deleted comments survive only as placeholders holding up live replies.
 */
export function buildCommentTree<T extends CommentLike>(
  rows: readonly T[],
): CommentNode<T>[] {
  const nodes = new Map<string, CommentNode<T>>();
  for (const comment of rows) {
    nodes.set(comment.id, { comment, removed: !!comment.deletedAt, children: [] });
  }

  const roots: CommentNode<T>[] = [];
  for (const comment of rows) {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
    // An orphan (parent hard-deleted out from under it) reads as top level.
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return prune(roots);
}

/** Drop removed comments that hold nothing up. */
function prune<T extends CommentLike>(
  nodes: CommentNode<T>[],
): CommentNode<T>[] {
  const kept: CommentNode<T>[] = [];
  for (const node of nodes) {
    node.children = prune(node.children);
    if (!node.removed || node.children.length > 0) kept.push(node);
  }
  return kept;
}

/** Comments actually on screen, placeholders included — for the section heading. */
export function countLiveComments<T extends CommentLike>(
  rows: readonly T[],
): number {
  return rows.filter((r) => !r.deletedAt).length;
}
