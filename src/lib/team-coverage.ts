import {
  creditsIdentity,
  type CreditedRecord,
  type Identity,
} from "./people-match";

/** One assigned AI Lead, as the coverage table needs them. */
export interface CoverageLead {
  /** Every team this lead is assigned to, this row's included. */
  teamIds: string[];
  identity: Identity;
}

export interface CoverageRecord extends CreditedRecord {
  id: string;
  teamId: string | null;
}

/**
 * How many records a team's row on "Coverage by team" counts: the ones its
 * AI Leads have logged — owner or author, by the same matcher their own page
 * uses — not the ones whose Team field happens to say this team.
 *
 * The Team field is the wrong test because it is the field most often left
 * blank: the Coach files a record under a team only when its guess matches a
 * team name exactly, so a lead's own work could sit on their page while their
 * row read zero. It is also the wrong test the other way — a non-lead's record
 * filed under the team says nothing about whether the lead has started.
 *
 * The field still decides one thing: a lead who covers two teams has two
 * rows, and a record filed under one of them counts there and not on the
 * other. A record filed nowhere (or under a team the lead does not cover)
 * counts on every row of theirs — it is their work, and which function it
 * belongs to is not something the dots can guess.
 *
 * A record crediting two of the row's leads counts once.
 */
export function teamCoverageCount(
  teamId: string,
  leads: readonly CoverageLead[],
  records: readonly CoverageRecord[],
): number {
  return records.filter((r) =>
    leads.some(
      (lead) =>
        creditsIdentity(r, lead.identity) &&
        (r.teamId === teamId ||
          r.teamId === null ||
          !lead.teamIds.includes(r.teamId)),
    ),
  ).length;
}
