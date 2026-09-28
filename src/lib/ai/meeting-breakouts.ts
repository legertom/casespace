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
  const expectedSizes = [...context.expectedGroupSizes].sort((a, b) => a - b);
  if (JSON.stringify(actualSizes) !== JSON.stringify(expectedSizes)) return false;
  const expected = new Set(context.attendees.map((lead) => lead.id));
  const actual = groups.flatMap((group) => group.memberIds);
  return actual.length === expected.size &&
    actual.every((id) => expected.has(id)) &&
    new Set(actual).size === expected.size;
}

/** All attendees fit into trios or quartets once at least six people attend. */
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
