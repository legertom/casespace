import { describe, expect, it } from "vitest";
import type { StatusChangeEntry } from "@/server/use-case-queries";
import { buildActivity } from "./activity";
import type { CommentNode } from "./comment-tree";

const status = (id: string, at: string): StatusChangeEntry => ({
  id,
  fromStatus: null,
  toStatus: "in_discovery",
  note: null,
  createdAt: new Date(at),
  changedByName: null,
});

type TestComment = { id: string; parentId: string | null; deletedAt: Date | null; createdAt: Date };

const root = (
  id: string,
  at: string,
  children: CommentNode<TestComment>[] = [],
): CommentNode<TestComment> => ({
  comment: { id, parentId: null, deletedAt: null, createdAt: new Date(at) },
  removed: false,
  children,
});

/** `kind:id` per item — enough to assert both order and provenance. */
const shape = (items: ReturnType<typeof buildActivity<TestComment>>) =>
  items.map((i) => `${i.kind}:${i.kind === "status" ? i.entry.id : i.node.comment.id}`);

describe("buildActivity", () => {
  it("returns nothing when both inputs are empty", () => {
    expect(buildActivity([], [])).toEqual([]);
  });

  it("reverses a newest-first history into oldest-first, with no comments", () => {
    // Mirrors the real inputs: the history query returns newest first.
    const items = buildActivity(
      [status("s2", "2026-08-10"), status("s1", "2026-08-01")],
      [],
    );
    expect(shape(items)).toEqual(["status:s1", "status:s2"]);
  });

  it("keeps comments oldest-first when history is empty", () => {
    const items = buildActivity([], [root("c1", "2026-08-02"), root("c2", "2026-08-05")]);
    expect(shape(items)).toEqual(["comment:c1", "comment:c2"]);
  });

  it("interleaves status changes and comments by time", () => {
    const items = buildActivity(
      [status("s2", "2026-08-08"), status("s1", "2026-08-01")],
      [root("c1", "2026-08-03"), root("c2", "2026-08-12")],
    );
    expect(shape(items)).toEqual([
      "status:s1",
      "comment:c1",
      "status:s2",
      "comment:c2",
    ]);
  });

  it("keeps a reply under its root, not at its own timestamp", () => {
    // The reply is newer than s2, but only the root takes a slot.
    const reply: CommentNode<TestComment> = {
      comment: { id: "c1a", parentId: "c1", deletedAt: null, createdAt: new Date("2026-08-20") },
      removed: false,
      children: [],
    };
    const items = buildActivity(
      [status("s2", "2026-08-08"), status("s1", "2026-08-01")],
      [root("c1", "2026-08-03", [reply])],
    );
    expect(shape(items)).toEqual(["status:s1", "comment:c1", "status:s2"]);
    expect(items[1].kind === "comment" && items[1].node.children[0].comment.id).toBe("c1a");
  });

  it("breaks a timestamp tie with status first, then id", () => {
    const at = "2026-08-04T12:00:00Z";
    const items = buildActivity(
      [status("s-b", at), status("s-a", at)],
      [root("c-b", at), root("c-a", at)],
    );
    expect(shape(items)).toEqual([
      "status:s-a",
      "status:s-b",
      "comment:c-a",
      "comment:c-b",
    ]);
  });
});
