import { describe, expect, it } from "vitest";
import { newUseCaseNotifications } from "./new-use-case-notifications";

describe("who hears that a use case was logged", () => {
  it("tells every admin", () => {
    const out = newUseCaseNotifications({
      actorId: "contributor",
      adminUserIds: ["kate", "tom"],
    });
    expect(out.map((r) => r.userId).sort()).toEqual(["kate", "tom"]);
  });

  it("never tells the person who logged it", () => {
    const out = newUseCaseNotifications({
      actorId: "tom",
      adminUserIds: ["kate", "tom"],
    });
    expect(out.map((r) => r.userId)).toEqual(["kate"]);
  });

  it("drops nulls rather than writing a row with no recipient", () => {
    const out = newUseCaseNotifications({
      actorId: "someone",
      adminUserIds: [null, undefined, "kate"],
    });
    expect(out).toEqual([{ userId: "kate" }]);
  });

  it("tells each admin once, however many times they appear", () => {
    const out = newUseCaseNotifications({
      actorId: "someone",
      adminUserIds: ["kate", "kate"],
    });
    expect(out).toEqual([{ userId: "kate" }]);
  });

  it("returns nothing when the only admin is the one logging", () => {
    expect(
      newUseCaseNotifications({ actorId: "tom", adminUserIds: ["tom"] }),
    ).toEqual([]);
  });
});
