import { describe, expect, it } from "vitest";
import { commentNotifications } from "./comment-notifications";

const kindFor = (
  recipients: { userId: string; kind: string }[],
  userId: string,
) => recipients.find((r) => r.userId === userId)?.kind;

describe("who hears about a new comment", () => {
  it("notifies the record's people and every prior commenter", () => {
    const out = commentNotifications({
      actorId: "actor",
      ownerUserId: "owner",
      authorUserIds: ["author-1", "author-2"],
      createdById: "creator",
      priorCommenterIds: ["talker"],
    });
    expect(out.map((r) => r.userId).sort()).toEqual([
      "author-1",
      "author-2",
      "creator",
      "owner",
      "talker",
    ]);
    expect(out.every((r) => r.kind === "comment")).toBe(true);
  });

  it("calls out the parent comment's author as a reply", () => {
    const out = commentNotifications({
      actorId: "actor",
      parentAuthorId: "parent-author",
      ownerUserId: "owner",
    });
    expect(kindFor(out, "parent-author")).toBe("reply");
    expect(kindFor(out, "owner")).toBe("comment");
  });

  it("calls out mentioned people as mentions", () => {
    const out = commentNotifications({
      actorId: "actor",
      mentionedUserIds: ["kate"],
    });
    expect(out).toEqual([{ userId: "kate", kind: "mention" }]);
  });
});

describe("one notification per person, most specific kind", () => {
  it("mention beats reply beats comment", () => {
    const out = commentNotifications({
      actorId: "actor",
      mentionedUserIds: ["kate"],
      parentAuthorId: "kate",
      ownerUserId: "kate",
      createdById: "kate",
      priorCommenterIds: ["kate"],
    });
    expect(out).toEqual([{ userId: "kate", kind: "mention" }]);
  });

  it("reply beats comment", () => {
    const out = commentNotifications({
      actorId: "actor",
      parentAuthorId: "kate",
      ownerUserId: "kate",
      priorCommenterIds: ["kate"],
    });
    expect(out).toEqual([{ userId: "kate", kind: "reply" }]);
  });

  it("a mention never gets downgraded by a later weaker reason", () => {
    const out = commentNotifications({
      actorId: "actor",
      mentionedUserIds: ["kate", "kate"],
      priorCommenterIds: ["kate", "kate"],
      authorUserIds: ["kate"],
    });
    expect(out).toEqual([{ userId: "kate", kind: "mention" }]);
  });

  it("collapses someone who is owner, author, creator, and prior commenter", () => {
    const out = commentNotifications({
      actorId: "actor",
      ownerUserId: "solo",
      authorUserIds: ["solo"],
      createdById: "solo",
      priorCommenterIds: ["solo", "solo"],
    });
    expect(out).toEqual([{ userId: "solo", kind: "comment" }]);
  });
});

describe("the actor never notifies themselves", () => {
  it("drops the actor however they qualify", () => {
    const out = commentNotifications({
      actorId: "actor",
      mentionedUserIds: ["actor"],
      parentAuthorId: "actor",
      ownerUserId: "actor",
      authorUserIds: ["actor"],
      createdById: "actor",
      priorCommenterIds: ["actor"],
    });
    expect(out).toEqual([]);
  });

  it("keeps everyone else when the actor is also on the record", () => {
    const out = commentNotifications({
      actorId: "actor",
      ownerUserId: "actor",
      createdById: "creator",
    });
    expect(out).toEqual([{ userId: "creator", kind: "comment" }]);
  });
});

describe("unlinked people", () => {
  it("drops nulls and undefineds without inventing recipients", () => {
    const out = commentNotifications({
      actorId: "actor",
      ownerUserId: null,
      createdById: null,
      parentAuthorId: null,
      authorUserIds: [null, undefined, "author"],
      priorCommenterIds: [null, undefined],
    });
    expect(out).toEqual([{ userId: "author", kind: "comment" }]);
  });

  it("returns an empty list when nobody is left", () => {
    expect(commentNotifications({ actorId: "actor" })).toEqual([]);
    expect(
      commentNotifications({
        actorId: "actor",
        ownerUserId: null,
        authorUserIds: [],
        priorCommenterIds: [],
        mentionedUserIds: [],
      }),
    ).toEqual([]);
  });
});
