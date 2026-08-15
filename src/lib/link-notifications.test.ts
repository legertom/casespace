import { describe, expect, it } from "vitest";
import { linkNotifications } from "./link-notifications";

const audience = {
  actorId: "actor",
  from: { useCaseId: "uc-from", creditedUserIds: ["owner-a", "author-a"] },
  to: { useCaseId: "uc-to", creditedUserIds: ["owner-b", "creator-b"] },
};

describe("who hears about a new link", () => {
  it("notifies the people credited on both records", () => {
    const out = linkNotifications(audience);
    expect(out.map((r) => r.userId).sort()).toEqual([
      "author-a",
      "creator-b",
      "owner-a",
      "owner-b",
    ]);
  });

  it("lands each person on the record they are credited on", () => {
    const out = linkNotifications(audience);
    const at = (userId: string) =>
      out.find((r) => r.userId === userId)?.useCaseId;
    expect(at("owner-a")).toBe("uc-from");
    expect(at("owner-b")).toBe("uc-to");
  });

  it("never notifies whoever made the link", () => {
    const out = linkNotifications({
      ...audience,
      from: { useCaseId: "uc-from", creditedUserIds: ["actor", "owner-a"] },
      to: { useCaseId: "uc-to", creditedUserIds: ["actor"] },
    });
    expect(out.map((r) => r.userId)).toEqual(["owner-a"]);
  });

  it("gives someone credited on both records one notification, on the from side", () => {
    const out = linkNotifications({
      ...audience,
      from: { useCaseId: "uc-from", creditedUserIds: ["both"] },
      to: { useCaseId: "uc-to", creditedUserIds: ["both"] },
    });
    expect(out).toEqual([{ userId: "both", useCaseId: "uc-from" }]);
  });

  it("drops people whose logins aren't linked", () => {
    const out = linkNotifications({
      actorId: "actor",
      from: { useCaseId: "uc-from", creditedUserIds: [null, undefined] },
      to: { useCaseId: "uc-to", creditedUserIds: [null, "owner-b"] },
    });
    expect(out).toEqual([{ userId: "owner-b", useCaseId: "uc-to" }]);
  });

  it("de-dupes someone credited twice on the same record", () => {
    const out = linkNotifications({
      actorId: "actor",
      from: { useCaseId: "uc-from", creditedUserIds: ["owner-a", "owner-a"] },
      to: { useCaseId: "uc-to", creditedUserIds: [] },
    });
    expect(out).toEqual([{ userId: "owner-a", useCaseId: "uc-from" }]);
  });
});
