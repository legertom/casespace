import { describe, expect, it } from "vitest";
import { STATUSES } from "./domain";
import { roiCoachAction } from "./roi";
import {
  isReadyToConfirm,
  readyToConfirmBell,
  type ReadinessFields,
} from "./ready-to-confirm";

const ready: ReadinessFields = {
  status: "qualified",
  inProgram: true,
  successCriterion: "Ticket first-response time under 2 hours",
  successCriterionMet: "yes",
  baselineMetric: "Median first-response time",
  baselineValue: 6.5,
  postValue: 1.4,
  measurementMethod: "Zendesk report, trailing 4 weeks, same queue",
  netImpactStatement:
    "First responses now land in a quarter of the time with no quality drop.",
  isPositive: true,
  roiStatus: "complete",
};

const notYet: ReadinessFields = { ...ready, roiStatus: "in_progress" };

describe("ready to confirm", () => {
  it("is a Qualified program record with nothing left on the ROI checklist", () => {
    expect(isReadyToConfirm(ready)).toBe(true);
  });

  it("is Qualified only — not before the gate, not after confirmation", () => {
    for (const status of STATUSES) {
      expect(isReadyToConfirm({ ...ready, status })).toBe(
        status === "qualified",
      );
    }
  });

  it.each([
    ["no success criterion", { successCriterion: "  " }],
    ["criterion not yet evaluated", { successCriterionMet: "not_yet" as const }],
    ["criterion not met", { successCriterionMet: "no" as const }],
    ["no baseline", { baselineValue: null }],
    ["no post-measurement", { postValue: null }],
    ["no method", { measurementMethod: null }],
    ["no net-impact statement", { netImpactStatement: "" }],
    ["outcome not assessed", { isPositive: null }],
    ["outcome negative", { isPositive: false }],
    ["scoring not marked complete", { roiStatus: "in_progress" as const }],
  ])("is not ready with %s", (_label, patch) => {
    expect(isReadyToConfirm({ ...ready, ...patch })).toBe(false);
  });

  it("is not ready once an admin has taken the record out of the program", () => {
    expect(isReadyToConfirm({ ...ready, inProgram: false })).toBe(false);
  });

  it("agrees with the Coach's door: ready exactly when it offers the review", () => {
    // The badge and "Review the ROI for confirmation" must appear together on
    // a Qualified record, or the record page contradicts itself.
    for (const uc of [ready, notYet, { ...ready, postValue: null }]) {
      expect(isReadyToConfirm(uc)).toBe(roiCoachAction(uc, true) === "review");
    }
  });
});

describe("what a write does to the ready bell", () => {
  const admins = ["kate", "tom"];

  it("rings every admin when a write completes the checklist", () => {
    expect(
      readyToConfirmBell({
        before: notYet,
        after: ready,
        actorId: "lead",
        adminUserIds: admins,
      }),
    ).toEqual({ kind: "ring", recipients: ["kate", "tom"] });
  });

  it("rings when qualifying a record whose checklist was already complete", () => {
    expect(
      readyToConfirmBell({
        before: { ...ready, status: "launched" },
        after: ready,
        actorId: "tom",
        adminUserIds: admins,
      }),
    ).toEqual({ kind: "ring", recipients: ["kate"] });
  });

  it("rings when an admin brings a ready record back into the program", () => {
    expect(
      readyToConfirmBell({
        before: { ...ready, inProgram: false },
        after: ready,
        actorId: "tom",
        adminUserIds: admins,
      }),
    ).toEqual({ kind: "ring", recipients: ["kate"] });
  });

  it("never tells the person who made it ready", () => {
    expect(
      readyToConfirmBell({
        before: notYet,
        after: ready,
        actorId: "kate",
        adminUserIds: admins,
      }),
    ).toEqual({ kind: "ring", recipients: ["tom"] });
  });

  it("drops nulls and repeats rather than writing a row twice or for nobody", () => {
    expect(
      readyToConfirmBell({
        before: notYet,
        after: ready,
        actorId: "lead",
        adminUserIds: [null, "kate", undefined, "kate"],
      }),
    ).toEqual({ kind: "ring", recipients: ["kate"] });
  });

  it("is silent on a later save of a record that is still ready", () => {
    // Fixing a typo in the net-impact statement is not news.
    expect(
      readyToConfirmBell({
        before: ready,
        after: { ...ready, netImpactStatement: "Reworded." },
        actorId: "lead",
        adminUserIds: admins,
      }),
    ).toBeNull();
  });

  it("is silent on a save that leaves an unready record unready", () => {
    expect(
      readyToConfirmBell({
        before: { ...notYet, postValue: null },
        after: notYet,
        actorId: "lead",
        adminUserIds: admins,
      }),
    ).toBeNull();
  });

  it.each([
    ["confirmed", { status: "confirmed_positive_roi" as const }],
    ["rejected back to Launched", { status: "launched" as const }],
    ["a checklist item reopened", { roiStatus: "in_progress" as const }],
    ["taken out of the program", { inProgram: false }],
  ])("settles the bell when the record is %s", (_label, patch) => {
    expect(
      readyToConfirmBell({
        before: ready,
        after: { ...ready, ...patch },
        actorId: "kate",
        adminUserIds: admins,
      }),
    ).toEqual({ kind: "settle" });
  });

  it("rings again when a record that left comes back", () => {
    // Left, then back: the record is waiting on Kate again, so she hears
    // again. The server replaces the old row rather than adding a second.
    const left = readyToConfirmBell({
      before: ready,
      after: notYet,
      actorId: "lead",
      adminUserIds: admins,
    });
    const back = readyToConfirmBell({
      before: notYet,
      after: ready,
      actorId: "lead",
      adminUserIds: admins,
    });
    expect(left).toEqual({ kind: "settle" });
    expect(back).toEqual({ kind: "ring", recipients: ["kate", "tom"] });
  });

  it("rings with nobody to tell when the only admin made it ready", () => {
    // Still a ring, not null: the server clears the record's old ready rows.
    expect(
      readyToConfirmBell({
        before: notYet,
        after: ready,
        actorId: "kate",
        adminUserIds: ["kate"],
      }),
    ).toEqual({ kind: "ring", recipients: [] });
  });
});
