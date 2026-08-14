import { describe, expect, it } from "vitest";
import { buildCommentTree, countLiveComments } from "./comment-tree";

const c = (id: string, parentId: string | null, deletedAt: Date | null = null) => ({
  id,
  parentId,
  deletedAt,
});

const ids = (nodes: ReturnType<typeof buildCommentTree>): string[] =>
  nodes.map((n) => n.comment.id);

describe("threading", () => {
  it("nests replies under their parents, oldest first", () => {
    const tree = buildCommentTree([
      c("a", null),
      c("b", null),
      c("a1", "a"),
      c("a2", "a"),
      c("a1a", "a1"),
    ]);
    expect(ids(tree)).toEqual(["a", "b"]);
    expect(ids(tree[0].children)).toEqual(["a1", "a2"]);
    expect(ids(tree[0].children[0].children)).toEqual(["a1a"]);
  });

  it("treats a comment with no findable parent as top level", () => {
    const tree = buildCommentTree([c("orphan", "gone")]);
    expect(ids(tree)).toEqual(["orphan"]);
  });

  it("handles an empty record", () => {
    expect(buildCommentTree([])).toEqual([]);
  });
});

describe("soft delete", () => {
  const gone = new Date("2026-08-13T00:00:00Z");

  it("removes a deleted leaf entirely", () => {
    const tree = buildCommentTree([c("a", null), c("a1", "a", gone)]);
    expect(ids(tree)).toEqual(["a"]);
    expect(tree[0].children).toEqual([]);
  });

  it("keeps a deleted comment that holds up replies, marked removed", () => {
    const tree = buildCommentTree([
      c("a", null, gone),
      c("a1", "a"),
    ]);
    expect(ids(tree)).toEqual(["a"]);
    expect(tree[0].removed).toBe(true);
    expect(ids(tree[0].children)).toEqual(["a1"]);
  });

  it("collapses a deleted branch once its last live reply goes too", () => {
    const tree = buildCommentTree([
      c("a", null),
      c("a1", "a", gone),
      c("a1a", "a1", gone),
    ]);
    expect(ids(tree)).toEqual(["a"]);
    expect(tree[0].children).toEqual([]);
  });

  it("keeps a chain of removed comments when something live hangs off the end", () => {
    const tree = buildCommentTree([
      c("a", null, gone),
      c("a1", "a", gone),
      c("a1a", "a1"),
    ]);
    expect(tree[0].removed).toBe(true);
    expect(tree[0].children[0].removed).toBe(true);
    expect(ids(tree[0].children[0].children)).toEqual(["a1a"]);
  });

  it("counts only comments that still stand", () => {
    expect(countLiveComments([c("a", null), c("b", null, gone)])).toBe(1);
  });
});
