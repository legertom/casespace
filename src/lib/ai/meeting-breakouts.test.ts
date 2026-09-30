import { describe, expect, it } from "vitest";
import {
  addLatecomerToGroup,
  expandMeetingAliases,
  formatMeetingRunDate,
  groundedMeetingReport,
  jevMeetingCandidates,
  latecomerGroupChoices,
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

  it("covers every turnout from two to sixty in groups of two to five", () => {
    for (let count = 2; count <= 60; count++) {
      const sizes = meetingGroupSizes(count);
      expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(count);
      expect(sizes.every((size) => size >= 2 && size <= 5)).toBe(true);
    }
  });
});

describe("latecomer placement", () => {
  it("keeps every existing group fixed across turnout sizes", () => {
    for (let count = 2; count < 60; count++) {
      const attendees = Array.from({ length: count + 1 }, (_, i) => ({
        id: String(i), name: `Lead ${i}`, department: "other", teams: [], cases: [],
      }));
      const oldGroups = [] as { memberIds: string[] }[];
      let cursor = 0;
      for (const size of meetingGroupSizes(count)) {
        oldGroups.push({ memberIds: attendees.slice(cursor, cursor + size).map((lead) => lead.id) });
        cursor += size;
      }
      const context = { attendees, expectedGroupSizes: meetingGroupSizes(count + 1) };
      const choices = latecomerGroupChoices(context, oldGroups, String(count), true);
      for (const index of choices) {
        const updated = addLatecomerToGroup(oldGroups, String(count), index);
        expect(updated.map((group) => group.memberIds.length).every((size) => size >= 2 && size <= 5)).toBe(true);
        expect(updated.flatMap((group) => group.memberIds).sort()).toEqual(attendees.map((lead) => lead.id).sort());
        expect(updated.every((group, i) => group.memberIds.slice(0, oldGroups[i].memberIds.length).join() === oldGroups[i].memberIds.join())).toBe(true);
        expect(oldGroups.flatMap((group) => group.memberIds)).not.toContain(String(count));
      }
    }
  });

  it("offers Jev only an open no-case group for an uncredited latecomer", () => {
    const attendees = Array.from({ length: 8 }, (_, i) => ({
      id: String(i), name: `Lead ${i}`, department: "other", teams: [],
      cases: i < 4 ? [] : [{ id: `c${i}`, title: `Case ${i}`, description: "", approaches: [], aiTools: [], role: "owner" as const }],
    }));
    const groups = [{ memberIds: ["0", "1", "2"] }, { memberIds: ["4", "5", "6", "7"] }];
    const context = { attendees, expectedGroupSizes: [4, 4] };
    expect(latecomerGroupChoices(context, groups, "3", true)).toEqual([0]);
    expect(latecomerGroupChoices(context, groups, "3", false)).toEqual([0, 1]);
  });

  it("does not make a sixth seat or move someone when all groups are full", () => {
    const attendees = Array.from({ length: 11 }, (_, i) => ({
      id: String(i), name: `Lead ${i}`, department: "other", teams: [], cases: [],
    }));
    const groups = [{ memberIds: ["0", "1", "2", "3", "4"] }, { memberIds: ["5", "6", "7", "8", "9"] }];
    expect(latecomerGroupChoices({ attendees, expectedGroupSizes: [5, 5, 1] }, groups, "10", true)).toEqual([]);
    expect(() => addLatecomerToGroup(groups, "10", 0)).toThrow("no open seat");
    expect(() => addLatecomerToGroup(groups, "0", 1)).toThrow("no open seat");
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

  it("keeps five leads without cases together in Jev's 22-person options", () => {
    const attendees = Array.from({ length: 22 }, (_, i) => ({
      id: String(i), name: `Lead ${i}`, department: String(i % 4), teams: [],
      cases: i < 5 ? [] : [{ id: `case-${i}`, title: `Workflow ${i % 5}`,
        description: `Process ${i % 5}`, approaches: [], aiTools: [], role: "owner" as const }],
    }));
    const context = { expectedGroupSizes: meetingGroupSizes(22), attendees };
    const { candidates, expectedGroupSizes, noCaseCohort } = jevMeetingCandidates(context);
    expect(noCaseCohort).toBe(true);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.every((groups) => validateMeetingGroups({ ...context, expectedGroupSizes }, groups))).toBe(true);
    expect(candidates.every((groups) => groups.some((group) =>
      group.memberIds.length === 5 && group.memberIds.every((id) => Number(id) < 5)))).toBe(true);
  });

  it("keeps a lone unlogged lead in a mixed group", () => {
    const context = {
      expectedGroupSizes: [3],
      attendees: Array.from({ length: 3 }, (_, i) => ({
        id: String(i), name: `Lead ${i}`, department: "other", teams: [],
        cases: i === 0 ? [] : [{ id: `case-${i}`, title: `Case ${i}`,
          description: "", approaches: [], aiTools: [], role: "owner" as const }],
      })),
    };
    const { candidates, expectedGroupSizes, noCaseCohort } = jevMeetingCandidates(context);
    expect(noCaseCohort).toBe(false);
    expect(expectedGroupSizes).toEqual([3]);
    expect(candidates.every((groups) => validateMeetingGroups(context, groups))).toBe(true);
  });

  it("keeps sparse-roster Jev plans complete for varied turnout", () => {
    for (let count = 2; count <= 60; count++) {
      for (const withoutCases of new Set([0, 1, 2, Math.floor(count / 3), count - 1, count])) {
        const attendees = Array.from({ length: count }, (_, i) => ({
          id: String(i), name: `Lead ${i}`, department: String(i % 4), teams: [],
          cases: i < withoutCases ? [] : [{ id: `case-${i}`, title: `Workflow ${i % 5}`,
            description: `Process ${i % 5}`, approaches: [], aiTools: [], role: "owner" as const }],
        }));
        const context = { expectedGroupSizes: meetingGroupSizes(count), attendees };
        const { candidates, expectedGroupSizes } = jevMeetingCandidates(context);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((groups) => validateMeetingGroups({ ...context, expectedGroupSizes }, groups))).toBe(true);
      }
    }
  });

  it("keeps randomized attendance selections complete across turnout sizes", () => {
    const roster = Array.from({ length: 75 }, (_, i) => ({
      id: `lead-${i}`, name: `Lead ${i}`, department: String(i % 6), teams: [],
      cases: [{ id: `case-${i}`, title: `Workflow ${i % 9}`, description: `Reporting workflow ${i % 9}`,
        approaches: [`approach-${i % 4}`], aiTools: [], role: "owner" as const }],
    }));
    let seed = 8417;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
    for (let count = 2; count <= 60; count++) {
      for (let trial = 0; trial < 4; trial++) {
        const shuffled = [...roster];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const attendees = shuffled.slice(0, count);
        const context = { attendees, expectedGroupSizes: meetingGroupSizes(count) };
        const candidates = meetingCandidatePlans(context);
        expect(candidates.length).toBeGreaterThan(0);
        expect(candidates.every((groups) => validateMeetingGroups(context, groups))).toBe(true);
        expect(candidates.every((groups) => groups.every((group) =>
          group.memberIds.length >= 2 && group.memberIds.length <= 5))).toBe(true);
      }
    }
  });
});

it("keeps report citations within each group's own use cases", () => {
  const attendees = [0, 1, 2, 3].map((i) => ({
    id: String(i), name: `Lead ${i}`, department: "other", teams: [],
    cases: [{ id: `c${i}`, title: `Case ${i}`, description: "", approaches: [], aiTools: [], role: "owner" as const }],
  }));
  const groups = [{ memberIds: ["0", "1"] }, { memberIds: ["2", "3"] }];
  const report = groundedMeetingReport({ attendees, expectedGroupSizes: [2, 2] }, groups, {
    summary: "", limitation: "", groups: [
      { commonality: "", reasoning: "", discussionPrompt: "", evidence: ["Case 0", "Case 3", "Made up"] },
      { commonality: "", reasoning: "", discussionPrompt: "", evidence: ["Case 2", "Case 1"] },
    ],
  });
  expect(report.groups.map((group) => group.evidence)).toEqual([["Case 0"], ["Case 2"]]);
});

it("replaces internal lead aliases in facilitator notes", () => {
  const names = new Map([["L2", "Lotte Petersen-Buckley"], ["L7", "Yowan Ramchoreeter"]]);
  expect(expandMeetingAliases("L2 and L7 share a thread.", names))
    .toBe("Lotte Petersen-Buckley and Yowan Ramchoreeter share a thread.");
});

it("formats saved report time in Eastern time without an invalid Intl option mix", () => {
  expect(formatMeetingRunDate(new Date("2026-09-28T02:50:00Z")))
    .toBe("Sep 27, 2026, 10:50 PM EDT");
});
