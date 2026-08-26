/**
 * Merging a record's status history and its comment thread into one Activity
 * stream — pure, so the ordering rules are tested rather than eyeballed.
 *
 * Oldest first, on purpose: the stream ends at the composer, so a reader
 * arrives at the box after the story instead of scrolling past it. Only
 * top-level comments take a slot — replies stay nested under their root,
 * at the root's position.
 */
import type {
  FieldChangeEntry,
  StatusChangeEntry,
} from "@/server/use-case-queries";
import type { CommentLike, CommentNode } from "./comment-tree";

type DatedComment = CommentLike & { createdAt: Date };

export type ActivityItem<C extends DatedComment> =
  | { kind: "status"; at: Date; entry: StatusChangeEntry }
  | { kind: "field"; at: Date; entry: FieldChangeEntry }
  | { kind: "comment"; at: Date; node: CommentNode<C> };

/**
 * Interleave status changes, field-change audit rows, and top-level
 * comments, ascending by time. Input order doesn't matter — history arrives
 * newest-first, comments oldest-first, and no query changes for this.
 */
export function buildActivity<C extends DatedComment>(
  history: readonly StatusChangeEntry[],
  fieldHistory: readonly FieldChangeEntry[],
  roots: readonly CommentNode<C>[],
): ActivityItem<C>[] {
  const items: ActivityItem<C>[] = [
    ...history.map((entry) => ({
      kind: "status" as const,
      at: entry.createdAt,
      entry,
    })),
    ...fieldHistory.map((entry) => ({
      kind: "field" as const,
      at: entry.createdAt,
      entry,
    })),
    ...roots.map((node) => ({
      kind: "comment" as const,
      at: node.comment.createdAt,
      node,
    })),
  ];
  return items.sort((a, b) => {
    const byTime = a.at.getTime() - b.at.getTime();
    if (byTime !== 0) return byTime;
    // Equal timestamps: status, then field changes (a promotion's auto-admit
    // reads as its consequence), then comments; ties break by id —
    // deterministic, so two renders never disagree about the order.
    if (a.kind !== b.kind) return kindRank(a.kind) - kindRank(b.kind);
    const [aId, bId] = [itemId(a), itemId(b)];
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });
}

function kindRank(kind: "status" | "field" | "comment"): number {
  return kind === "status" ? 0 : kind === "field" ? 1 : 2;
}

function itemId<C extends DatedComment>(item: ActivityItem<C>): string {
  return item.kind === "comment" ? item.node.comment.id : item.entry.id;
}
