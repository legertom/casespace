import "server-only";
import { creditsIdentity, makeIdentity, refCredits } from "@/lib/people-match";
import {
  meetingGroupSizes,
  type MeetingCase,
  type MeetingContext,
} from "@/lib/ai/meeting-breakouts";
import { listRoster } from "@/server/reference";
import { listUseCases } from "@/server/use-case-queries";

/** Only explicitly selected roster IDs enter the meeting context. */
export async function getMeetingBreakoutContext(leadIds: string[]): Promise<MeetingContext> {
  if (leadIds.length < 2 || leadIds.length > 60 || new Set(leadIds).size !== leadIds.length) {
    throw new Error("Select between 2 and 60 distinct AI Leads.");
  }
  const roster = await listRoster();
  const byId = new Map(roster.map((lead) => [lead.id, lead]));
  const selected = leadIds.map((id) => byId.get(id));
  if (selected.some((lead) => !lead)) throw new Error("An attendee is not on the AI Leads roster.");

  const casebook = await listUseCases();
  return {
    expectedGroupSizes: meetingGroupSizes(leadIds.length),
    attendees: selected.map((lead) => {
      if (!lead) throw new Error("An attendee is not on the AI Leads roster.");
      const identity = makeIdentity({
        personId: lead.personId,
        userId: lead.userId,
        names: [lead.name],
      });
      const cases: MeetingCase[] = casebook
        .filter((uc) => creditsIdentity(uc, identity))
        .map((uc) => ({
          id: uc.id,
          title: uc.title,
          description: uc.description,
          approaches: uc.approaches,
          aiTools: uc.aiTools,
          role: refCredits({
            personId: uc.ownerPersonId,
            userId: uc.ownerUserId,
            displayName: uc.ownerName,
          }, identity)
            ? "owner"
            : uc.authors.some((a) => refCredits({
                personId: a.personId,
                userId: a.userId,
                displayName: a.displayName,
              }, identity))
              ? "author"
              : "credited",
        }));
      return {
        id: lead.id,
        name: lead.name,
        department: lead.department,
        teams: lead.teams.map((team) => team.name),
        cases,
      };
    }),
  };
}
