import { describe, expect, it } from "vitest";
import {
  expandMeetingAliases,
  meetingGroupSizes,
  meetingCandidatePlans,
  validateMeetingGroups,
} from "./meeting-breakouts";

describe("breakout sizes", () => {
  it.each([
    [8, [4, 4]],
    [14, [3, 3, 4, 4]],
    [22, [3, 3, 4, 4, 4, 4]],
  ])("puts %i attendees in complete groups", (count, expected) => {
    expect(meetingGroupSizes(count)).toEqual(expected);
  });

  it("covers every turnout from six to sixty without a pair or singleton", () => {
    for (let count = 6; count <= 60; count++) {
      const sizes = meetingGroupSizes(count);
      expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(count);
      expect(sizes.every((size) => size === 3 || size === 4)).toBe(true);
    }
  });
});

describe("meeting group validation", () => {
  const context = {
    expectedGroupSizes: [4, 4],
    attendees: Array.from({ length: 8 }, (_, i) => ({
      id: String(i), name: `Lead ${i}`, department: "engineering", teams: [], cases: [],
    })),
  };

  it("accepts complete groups and rejects duplicate or missing attendees", () => {
    expect(validateMeetingGroups(context, [
      { memberIds: ["0", "1", "2", "3"] },
      { memberIds: ["4", "5", "6", "7"] },
    ])).toBe(true);
    expect(validateMeetingGroups(context, [
      { memberIds: ["0", "1", "2", "3"] },
      { memberIds: ["4", "5", "6", "6"] },
    ])).toBe(false);
  });

  it("offers Jev valid alternatives drawn only from selected attendees", () => {
    const candidates = meetingCandidatePlans(context);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.every((groups) => validateMeetingGroups(context, groups))).toBe(true);
  });

  it("keeps every attendee in Jev candidates for a 22-person sync", () => {
    const large = {
      expectedGroupSizes: meetingGroupSizes(22),
      attendees: Array.from({ length: 22 }, (_, i) => ({
        id: String(i), name: `Lead ${i}`, department: String(i % 4), teams: [], cases: [],
      })),
    };
    const candidates = meetingCandidatePlans(large);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.every((groups) => validateMeetingGroups(large, groups))).toBe(true);
  });
});

it("replaces internal lead aliases in facilitator notes", () => {
  const names = new Map([["L2", "Lotte Petersen-Buckley"], ["L7", "Yowan Ramchoreeter"]]);
  expect(expandMeetingAliases("L2 and L7 share a thread.", names))
    .toBe("Lotte Petersen-Buckley and Yowan Ramchoreeter share a thread.");
});
