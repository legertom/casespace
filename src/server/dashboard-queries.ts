import "server-only";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  aiLeadTeams,
  aiLeads,
  eltOrgs,
  statusChanges,
  teams,
  useCases,
  users,
} from "@/db/schema";
import {
  STATUSES,
  countsTowardDocumented,
  countsTowardRoi,
  documentedGatesComplete,
  isStale,
  WORKFLOWS_PER_LEAD,
  type Department,
  type UcStatus,
} from "@/lib/domain";
import { COMMUNITY_ALIVE, IN_PROGRAM_ALIVE } from "@/db/scopes";
import { getStaleDays } from "./reference";

export interface ProgramCounts {
  /** Qualified or better — the 45 counts these. */
  documented: number;
  /** Status = confirmed_positive_roi — the 15. Always a subset of documented. */
  confirmedRoi: number;
  byStatus: Record<UcStatus, number>;
  total: number;
  /** Logged and moving, but not yet Qualified — real work the 45 can't show. */
  inFlight: number;
  /** All four documented gates met, still short of the Qualified gate. */
  readyForGate: number;
}

/**
 * The scoreboard's universe: alive AND counted by the program.
 *
 * Community submissions are real work on an open casebook — they are just not
 * what the 45 and the 15 count. Every aggregator in this file reads through
 * here, which is why it is a hard filter rather than a parameter: all of them
 * return program-shaped numbers measured against program targets, so a
 * "community mode" would produce counts with no target to mean anything
 * against. The honest answer to "show me community numbers" is the casebook
 * filter (/use-cases?program=community) plus getCommunitySubmissions below.
 */
async function programUseCases() {
  const db = getDb();
  return db.select().from(useCases).where(IN_PROGRAM_ALIVE);
}

export async function getProgramCounts(): Promise<ProgramCounts> {
  const rows = await programUseCases();
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
    UcStatus,
    number
  >;
  let readyForGate = 0;
  for (const r of rows) {
    byStatus[r.status]++;
    if (!countsTowardDocumented(r.status) && documentedGatesComplete(r)) {
      readyForGate++;
    }
  }
  const documented = rows.filter((r) =>
    countsTowardDocumented(r.status),
  ).length;
  return {
    documented,
    confirmedRoi: byStatus.confirmed_positive_roi,
    byStatus,
    total: rows.length,
    inFlight: rows.length - documented,
    readyForGate,
  };
}

export interface EltProgressRow {
  id: string | null; // null = unallocated bucket
  name: string;
  target: number | null;
  confirmedRoi: number;
  qualifiedInFlight: number; // qualified, ROI not yet confirmed
  inPipeline: number; // logged and moving, not yet Qualified
  note: string | null;
}

/**
 * Every active record bucketed by ELT owner and maturity — not just Qualified
 * work. An owner with a full pipeline and nothing Qualified yet should not
 * look identical to an owner with nothing at all.
 */
export async function getEltProgress(): Promise<EltProgressRow[]> {
  const db = getDb();
  const orgs = await db.select().from(eltOrgs).orderBy(eltOrgs.sort);
  const rows = await programUseCases();

  const result: EltProgressRow[] = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    target: o.target,
    confirmedRoi: 0,
    qualifiedInFlight: 0,
    inPipeline: 0,
    note: o.note,
  }));
  const unallocated: EltProgressRow = {
    id: null,
    name: "Unallocated",
    target: null,
    confirmedRoi: 0,
    qualifiedInFlight: 0,
    inPipeline: 0,
    note: "Work in departments with no confirmed ELT owner.",
  };

  for (const r of rows) {
    const bucket = result.find((o) => o.id === r.eltOrgId) ?? unallocated;
    if (countsTowardRoi(r.status)) bucket.confirmedRoi++;
    else if (r.status === "qualified") bucket.qualifiedInFlight++;
    else bucket.inPipeline++;
  }
  if (
    unallocated.confirmedRoi +
      unallocated.qualifiedInFlight +
      unallocated.inPipeline >
    0
  ) {
    result.push(unallocated);
  }
  return result;
}

export interface TeamCoverageLead {
  name: string;
  personId: string | null;
}

export interface TeamCoverageRow {
  teamId: string;
  teamName: string;
  department: Department;
  leads: TeamCoverageLead[];
  useCaseCount: number;
  target: number; // leads × 2 workflows each
}

export async function getTeamCoverage(): Promise<TeamCoverageRow[]> {
  const db = getDb();
  const allTeams = await db.select().from(teams);
  const links = await db
    .select({
      teamId: aiLeadTeams.teamId,
      leadName: aiLeads.name,
      leadPersonId: aiLeads.personId,
      state: aiLeads.state,
    })
    .from(aiLeadTeams)
    .innerJoin(aiLeads, eq(aiLeadTeams.leadId, aiLeads.id));
  const cases = await programUseCases();

  return allTeams
    .map((t) => {
      const leads = links
        .filter((l) => l.teamId === t.id && l.state === "assigned")
        .map((l) => ({ name: l.leadName, personId: l.leadPersonId }));
      return {
        teamId: t.id,
        teamName: t.name,
        department: t.department as Department,
        leads,
        // Program records only (programUseCases), but every status — this is
        // the one table that asks "did they start", not "did they finish".
        // Without the program filter a team where three employees logged
        // something and the lead logged nothing would render as satisfied.
        useCaseCount: cases.filter((c) => c.teamId === t.id).length,
        target: leads.length * WORKFLOWS_PER_LEAD,
      };
    })
    .sort(
      (a, b) =>
        a.department.localeCompare(b.department) ||
        a.teamName.localeCompare(b.teamName),
    );
}

export interface MovementItem {
  id: string;
  useCaseId: string;
  title: string;
  fromStatus: UcStatus | null;
  toStatus: UcStatus;
  reachedConfirmedRoi: boolean;
  changedByName: string | null;
  createdAt: Date;
}

export async function getMovement(days = 7): Promise<MovementItem[]> {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db
    .select({
      id: statusChanges.id,
      useCaseId: statusChanges.useCaseId,
      fromStatus: statusChanges.fromStatus,
      toStatus: statusChanges.toStatus,
      createdAt: statusChanges.createdAt,
      changedByName: users.name,
      uc: useCases,
    })
    .from(statusChanges)
    .innerJoin(useCases, eq(statusChanges.useCaseId, useCases.id))
    .leftJoin(users, eq(statusChanges.changedById, users.id))
    .where(and(gte(statusChanges.createdAt, since), IN_PROGRAM_ALIVE))
    .orderBy(desc(statusChanges.createdAt));

  return rows.map((r) => ({
    id: r.id,
    useCaseId: r.useCaseId,
    title: r.uc.title,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    reachedConfirmedRoi: countsTowardRoi(r.toStatus),
    changedByName: r.changedByName,
    createdAt: r.createdAt,
  }));
}

export interface AttentionFlags {
  staleDays: number;
  stale: {
    id: string;
    title: string;
    status: UcStatus;
    daysInStatus: number;
  }[];
  launchedUnscored: { id: string; title: string; roiStatus: string }[];
}

export async function getAttentionFlags(): Promise<AttentionFlags> {
  const db = getDb();
  const staleDays = await getStaleDays();
  const cases = await programUseCases();
  const lastChange = new Map<string, Date>();
  const changes = await db
    .select({
      useCaseId: statusChanges.useCaseId,
      createdAt: statusChanges.createdAt,
    })
    .from(statusChanges)
    .orderBy(desc(statusChanges.createdAt));
  for (const c of changes) {
    if (!lastChange.has(c.useCaseId)) lastChange.set(c.useCaseId, c.createdAt);
  }

  const now = new Date();
  const stale = cases
    .filter((c) => !countsTowardDocumented(c.status))
    .map((c) => {
      const last = lastChange.get(c.id) ?? c.createdAt;
      return {
        id: c.id,
        title: c.title,
        status: c.status,
        daysInStatus: Math.floor((now.getTime() - last.getTime()) / 86_400_000),
        isStale: isStale(last, now, staleDays),
      };
    })
    .filter((c) => c.isStale)
    .sort((a, b) => b.daysInStatus - a.daysInStatus)
    .map(({ isStale: _isStale, ...rest }) => rest);

  const launchedUnscored = cases
    .filter((c) => c.status === "launched" && c.roiStatus !== "complete")
    .map((c) => ({ id: c.id, title: c.title, roiStatus: c.roiStatus }));

  return { staleDays, stale, launchedUnscored };
}

export interface CommunitySubmissions {
  /** Every community record, not just the ones listed — this is the number to act on. */
  total: number;
  recent: {
    id: string;
    title: string;
    ownerName: string | null;
    createdAt: Date;
  }[];
}

/**
 * The community queue: records logged by people outside the AI Leads roster.
 *
 * Deliberately not routed through programUseCases, which is program-only by
 * definition. Two queries because a capped select cannot also produce the
 * total, and the total is the number an admin acts on.
 */
export async function getCommunitySubmissions(
  limit = 5,
): Promise<CommunitySubmissions> {
  const db = getDb();
  const [[tally], recent] = await Promise.all([
    db.select({ n: count() }).from(useCases).where(COMMUNITY_ALIVE),
    // limit 0 means "total only" (the progress report) — skip the select
    // that could only ever return nothing.
    limit > 0
      ? db
          .select({
            id: useCases.id,
            title: useCases.title,
            ownerName: useCases.ownerName,
            createdAt: useCases.createdAt,
          })
          .from(useCases)
          .where(COMMUNITY_ALIVE)
          .orderBy(desc(useCases.createdAt))
          .limit(limit)
      : Promise.resolve([]),
  ]);
  return { total: Number(tally?.n ?? 0), recent };
}
