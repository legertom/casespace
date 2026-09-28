import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
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

  // Profile pages match both the directory name and the linked login name.
  // Coach needs the same aliases for free-text credits such as Jon/Jonathan.
  const userIds = selected.flatMap((lead) => lead?.userId ? [lead.userId] : []);
  const personIds = selected.flatMap((lead) => lead?.personId ? [lead.personId] : []);
  const db = getDb();
  const [usersById, usersByPerson] = await Promise.all([
    userIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))
      : [],
    personIds.length
      ? db.select({ id: users.id, name: users.name, personId: users.personId })
          .from(users).where(inArray(users.personId, personIds))
      : [],
  ]);
  const loginNamesById = new Map(usersById.map((user) => [user.id, user.name]));
  const loginsByPerson = new Map(usersByPerson.map((user) => [user.personId, user]));
  const casebook = await listUseCases();
  return {
    expectedGroupSizes: meetingGroupSizes(leadIds.length),
    attendees: selected.map((lead) => {
      if (!lead) throw new Error("An attendee is not on the AI Leads roster.");
      const personLogin = lead.personId ? loginsByPerson.get(lead.personId) : null;
      const identity = makeIdentity({
        personId: lead.personId,
        userId: personLogin?.id ?? lead.userId,
        names: [lead.name, personLogin?.name, lead.userId ? loginNamesById.get(lead.userId) : null],
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
