export interface MeetingCase {
  id: string;
  title: string;
  description: string;
  approaches: string[];
  aiTools: string[];
  role: "owner" | "author" | "credited";
}

export interface MeetingAttendee {
  id: string;
  name: string;
  department: string;
  teams: string[];
  cases: MeetingCase[];
}

export interface MeetingContext {
  expectedGroupSizes: number[];
  attendees: MeetingAttendee[];
}

export interface MeetingGroup {
  memberIds: string[];
  rationale?: string;
}

export interface MeetingPlan {
  method: "jev" | "opus";
  groups: MeetingGroup[];
  note?: string;
}

export interface MeetingReportGroup {
  commonality: string;
  evidence: string[];
  reasoning: string;
  discussionPrompt: string;
}

export interface MeetingReport {
  summary: string;
  groups: MeetingReportGroup[];
  limitation: string;
  latecomer?: { sourceRunId: string; leadId: string; name: string; groupIndex: number };
}

/** Existing memberships and group numbers stay fixed when one person arrives late. */
export function latecomerGroupChoices(
  context: MeetingContext,
  lockedGroups: MeetingGroup[],
  newcomerId: string,
  keepNoCaseTogether: boolean,
): number[] {
  const newcomer = context.attendees.find((lead) => lead.id === newcomerId);
  const originalIds = context.attendees.filter((lead) => lead.id !== newcomerId).map((lead) => lead.id);
  const assigned = lockedGroups.flatMap((group) => group.memberIds);
  if (!newcomer || originalIds.length < 2 || lockedGroups.some((group) =>
    group.memberIds.length < 2 || group.memberIds.length > 5) ||
    assigned.length !== originalIds.length ||
    new Set(assigned).size !== assigned.length ||
    assigned.some((id) => !originalIds.includes(id))) {
    throw new Error("The saved assignment cannot be used for a locked latecomer placement.");
  }
  const available = lockedGroups.flatMap((group, index) =>
    group.memberIds.length < 5 ? [index] : []);
  if (keepNoCaseTogether && newcomer.cases.length === 0) {
    const noCase = available.filter((index) => lockedGroups[index].memberIds.every((id) =>
      context.attendees.find((lead) => lead.id === id)?.cases.length === 0));
    if (noCase.length) return noCase;
  }
  return available;
}

export function addLatecomerToGroup(
  lockedGroups: MeetingGroup[],
  newcomerId: string,
  index: number,
): MeetingGroup[] {
  if (!Number.isInteger(index) || index < 0 || index >= lockedGroups.length ||
    lockedGroups[index].memberIds.length >= 5 ||
    lockedGroups.some((group) => group.memberIds.includes(newcomerId))) {
    throw new Error("That group has no open seat for this AI Lead.");
  }
  return lockedGroups.map((group, i) => i === index
    ? { memberIds: [...group.memberIds, newcomerId] }
    : { ...group, memberIds: [...group.memberIds] });
}

export function formatMeetingRunDate(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/New_York", timeZoneName: "short",
  });
}

/** Case titles in a report must come from members of that exact group. */
export function groundedMeetingReport(
  context: MeetingContext,
  groups: MeetingGroup[],
  report: MeetingReport,
): MeetingReport {
  const byId = new Map(context.attendees.map((lead) => [lead.id, lead]));
  return {
    ...report,
    groups: report.groups.map((item, i) => {
      const titles = new Set(groups[i].memberIds.flatMap((id) =>
        (byId.get(id)?.cases ?? []).map((uc) => uc.title)));
      return { ...item, evidence: item.evidence.filter((title) => titles.has(title)) };
    }),
  };
}

/** Keep model-facing short IDs out of facilitator notes. */
export function expandMeetingAliases(
  note: string,
  names: Map<string, string>,
): string {
  return note.replace(/\bL\d+\b/g, (alias) => names.get(alias) ?? alias);
}

/** The model may recommend a partition, but code decides whether it is usable. */
export function validateMeetingGroups(
  context: MeetingContext,
  groups: MeetingGroup[],
): boolean {
  const actualSizes = groups.map((group) => group.memberIds.length).sort((a, b) => a - b);
  if (actualSizes.some((size) => size < 2 || size > 5)) return false;
  const expectedSizes = [...context.expectedGroupSizes].sort((a, b) => a - b);
  if (JSON.stringify(actualSizes) !== JSON.stringify(expectedSizes)) return false;
  const expected = new Set(context.attendees.map((lead) => lead.id));
  const actual = groups.flatMap((group) => group.memberIds);
  return actual.length === expected.size &&
    actual.every((id) => expected.has(id)) &&
    new Set(actual).size === expected.size;
}

/** Prefer trios and quartets; a turnout of two or five stays together. */
export function meetingGroupSizes(count: number): number[] {
  if (count < 1) return [];
  if (count < 6) return [count];
  const groups = Math.ceil(count / 4);
  const threes = 4 * groups - count;
  return Array.from({ length: groups }, (_, i) => (i < threes ? 3 : 4));
}

function words(lead: MeetingAttendee): Set<string> {
  const text = lead.cases.map((uc) => `${uc.title} ${uc.description}`).join(" ").toLowerCase();
  return new Set(
    (text.match(/[a-z]{4,}/g) ?? []).filter((word) =>
      !["with", "from", "that", "this", "their", "into", "using", "work", "team", "data"].includes(word),
    ),
  );
}

function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value >>> 0) / 0xffffffff;
}

/** Produce valid, varied options; Jev chooses which one has the best group fit. */
export function meetingCandidatePlans(context: MeetingContext): MeetingGroup[][] {
  const evidence = new Map(context.attendees.map((lead) => [lead.id, words(lead)]));
  const approaches = new Map(context.attendees.map((lead) => [
    lead.id,
    new Set(lead.cases.flatMap((uc) => uc.approaches)),
  ]));
  const candidates: MeetingGroup[][] = [];
  const seen = new Set<string>();

  for (let seed = 0; seed < 10 && candidates.length < 5; seed++) {
    const remaining = [...context.attendees].sort((a, b) =>
      hash(`${a.id}:${seed}`) - hash(`${b.id}:${seed}`),
    );
    const groups = context.expectedGroupSizes.map((size) => {
      const members = [remaining.shift()!];
      while (members.length < size) {
        let best = 0;
        let bestScore = -Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const lead = remaining[i];
          const score = members.reduce((sum, member) => {
            const sharedWords = [...(evidence.get(lead.id) ?? [])].filter((word) =>
              evidence.get(member.id)?.has(word),
            ).length;
            const sharedApproaches = [...(approaches.get(lead.id) ?? [])].filter((tag) =>
              approaches.get(member.id)?.has(tag),
            ).length;
            return sum + Math.min(sharedWords, 4) + sharedApproaches * 2 +
              (lead.department !== member.department ? 0.75 : 0);
          }, 0) / members.length + hash(`${lead.id}:${seed}:tie`) * (seed + 1) * 0.4;
          if (score > bestScore) { bestScore = score; best = i; }
        }
        members.push(remaining.splice(best, 1)[0]);
      }
      return { memberIds: members.map((member) => member.id) };
    });
    const key = groups.map((group) => [...group.memberIds].sort().join(",")).sort().join("|");
    if (!seen.has(key)) { seen.add(key); candidates.push(groups); }
  }

  return candidates;
}

/** Jev compares case-backed work while keeping the no-case conversation together. */
export function jevMeetingCandidates(context: MeetingContext): {
  candidates: MeetingGroup[][];
  expectedGroupSizes: number[];
  noCaseCohort: boolean;
} {
  const withCases = context.attendees.filter((lead) => lead.cases.length > 0);
  const withoutCases = context.attendees.filter((lead) => lead.cases.length === 0);
  if (withCases.length < 2 || withoutCases.length < 2) {
    return {
      candidates: meetingCandidatePlans(context),
      expectedGroupSizes: context.expectedGroupSizes,
      noCaseCohort: false,
    };
  }
  const withCasesContext = {
    attendees: withCases,
    expectedGroupSizes: meetingGroupSizes(withCases.length),
  };
  const withoutCasesContext = {
    attendees: withoutCases,
    expectedGroupSizes: meetingGroupSizes(withoutCases.length),
  };
  const casePlans = meetingCandidatePlans(withCasesContext);
  const explorationPlans = meetingCandidatePlans(withoutCasesContext);
  return {
    candidates: casePlans.map((groups, i) => [...groups, ...explorationPlans[i % explorationPlans.length]]),
    expectedGroupSizes: [
      ...withCasesContext.expectedGroupSizes,
      ...withoutCasesContext.expectedGroupSizes,
    ],
    noCaseCohort: true,
  };
}
