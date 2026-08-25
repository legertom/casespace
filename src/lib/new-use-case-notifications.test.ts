import { describe, expect, it } from "vitest";
import { newUseCaseNotifications } from "./new-use-case-notifications";

describe("who hears that a use case was logged", () => {
  it("tells every admin", () => {
    const out = newUseCaseNotifications({
      actorId: "contributor",
      adminUserIds: ["kate", "tom"],
      inProgram: true,
    });
    expect(out.map((r) => r.userId).sort()).toEqual(["kate", "tom"]);
  });

  it("never tells the person who logged it", () => {
    const out = newUseCaseNotifications({
      actorId: "tom",
      adminUserIds: ["kate", "tom"],
      inProgram: true,
    });
    expect(out.map((r) => r.userId)).toEqual(["kate"]);
  });

  it("drops nulls rather than writing a row with no recipient", () => {
    const out = newUseCaseNotifications({
      actorId: "someone",
      adminUserIds: [null, undefined, "kate"],
      inProgram: true,
    });
    expect(out).toEqual([{ userId: "kate" }]);
  });

  it("tells each admin once, however many times they appear", () => {
    const out = newUseCaseNotifications({
      actorId: "someone",
      adminUserIds: ["kate", "kate"],
      inProgram: true,
    });
    expect(out).toEqual([{ userId: "kate" }]);
  });

  it("stays silent for a community submission, however many admins there are", () => {
    // These reach admins as a dashboard count instead — a burst of them would
    // evict the comments and mentions from a 15-row bell.
    expect(
      newUseCaseNotifications({
        actorId: "employee",
        adminUserIds: ["kate", "tom"],
        inProgram: false,
      }),
    ).toEqual([]);
  });

  it("stays silent for a community submission logged by an admin", () => {
    // The program rule wins outright; it is not "actor rule, then program rule".
    expect(
      newUseCaseNotifications({
        actorId: "tom",
        adminUserIds: ["kate", "tom"],
        inProgram: false,
      }),
    ).toEqual([]);
  });

  it("returns nothing when the only admin is the one logging", () => {
    expect(
      newUseCaseNotifications({
        actorId: "tom",
        adminUserIds: ["tom"],
        inProgram: true,
      }),
    ).toEqual([]);
  });
});
