import "server-only";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  eltOrgs,
  people,
  statusChanges,
  teams,
  useCaseAuthors,
  useCases,
  users,
} from "@/db/schema";
import type { Department, UcStatus } from "@/lib/domain";

export interface UseCaseFilters {
  status?: UcStatus;
  department?: Department;
  teamId?: string;
  eltOrgId?: string;
  q?: string;
  createdById?: string;
  /** Restrict to records the given user created, owns, or authored. */
  mineUserId?: string;
  /** Restrict to records the given person owns or authored. */
  personId?: string;
}

export type UseCaseRow = typeof useCases.$inferSelect & {
  teamName: string | null;
  eltOrgName: string | null;
  authors: { id: string; displayName: string; personId: string | null; userId: string | null }[];
};

export async function listUseCases(
  filters: UseCaseFilters = {},
): Promise<UseCaseRow[]> {
  const db = getDb();
  const conds = [isNull(useCases.deletedAt)];
  if (filters.status) conds.push(eq(useCases.status, filters.status));
  if (filters.department) conds.push(eq(useCases.department, filters.department));
  if (filters.teamId) conds.push(eq(useCases.teamId, filters.teamId));
  if (filters.eltOrgId) conds.push(eq(useCases.eltOrgId, filters.eltOrgId));
  if (filters.createdById) conds.push(eq(useCases.createdById, filters.createdById));
  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conds.push(
      or(
        ilike(useCases.title, pattern),
        ilike(useCases.description, pattern),
        ilike(useCases.ownerName, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      uc: useCases,
      teamName: teams.name,
      eltOrgName: eltOrgs.name,
    })
    .from(useCases)
    .leftJoin(teams, eq(useCases.teamId, teams.id))
    .leftJoin(eltOrgs, eq(useCases.eltOrgId, eltOrgs.id))
    .where(and(...conds))
    .orderBy(desc(useCases.updatedAt));

  const ids = rows.map((r) => r.uc.id);
  const authors = ids.length
    ? await db
        .select()
        .from(useCaseAuthors)
        .where(inArray(useCaseAuthors.useCaseId, ids))
        .orderBy(useCaseAuthors.position)
    : [];
  const byCase = new Map<string, UseCaseRow["authors"]>();
  for (const a of authors) {
    const list = byCase.get(a.useCaseId) ?? [];
    list.push({
      id: a.id,
      displayName: a.displayName,
      personId: a.personId,
      userId: a.userId,
    });
    byCase.set(a.useCaseId, list);
  }

  let result = rows.map((r) => ({
    ...r.uc,
    teamName: r.teamName,
    eltOrgName: r.eltOrgName,
    authors: byCase.get(r.uc.id) ?? [],
  }));

  if (filters.mineUserId) {
    const uid = filters.mineUserId;
    result = result.filter(
      (r) =>
        r.createdById === uid ||
        r.ownerUserId === uid ||
        r.authors.some((a) => a.userId === uid),
    );
  }

  if (filters.personId) {
    const pid = filters.personId;
    result = result.filter(
      (r) =>
        r.ownerPersonId === pid || r.authors.some((a) => a.personId === pid),
    );
  }

  return result;
}

export interface StatusChangeEntry {
  id: string;
  fromStatus: UcStatus | null;
  toStatus: UcStatus;
  note: string | null;
  createdAt: Date;
  changedByName: string | null;
}

export async function getUseCase(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      uc: useCases,
      teamName: teams.name,
      eltOrgName: eltOrgs.name,
      createdByName: users.name,
    })
    .from(useCases)
    .leftJoin(teams, eq(useCases.teamId, teams.id))
    .leftJoin(eltOrgs, eq(useCases.eltOrgId, eltOrgs.id))
    .leftJoin(users, eq(useCases.createdById, users.id))
    .where(and(eq(useCases.id, id), isNull(useCases.deletedAt)));
  if (!row) return null;

  const authors = await db
    .select()
    .from(useCaseAuthors)
    .where(eq(useCaseAuthors.useCaseId, id))
    .orderBy(useCaseAuthors.position);

  const history: StatusChangeEntry[] = await db
    .select({
      id: statusChanges.id,
      fromStatus: statusChanges.fromStatus,
      toStatus: statusChanges.toStatus,
      note: statusChanges.note,
      createdAt: statusChanges.createdAt,
      changedByName: users.name,
    })
    .from(statusChanges)
    .leftJoin(users, eq(statusChanges.changedById, users.id))
    .where(eq(statusChanges.useCaseId, id))
    .orderBy(desc(statusChanges.createdAt));

  let ownerPersonName: string | null = null;
  if (row.uc.ownerPersonId) {
    const [p] = await db
      .select({ name: people.name })
      .from(people)
      .where(eq(people.id, row.uc.ownerPersonId));
    ownerPersonName = p?.name ?? null;
  }

  return {
    ...row.uc,
    teamName: row.teamName,
    eltOrgName: row.eltOrgName,
    createdByName: row.createdByName,
    ownerPersonName,
    authors,
    history,
  };
}

export type UseCaseDetail = NonNullable<Awaited<ReturnType<typeof getUseCase>>>;

/** Minimal ownership shape for permission checks. */
export async function getOwnership(id: string) {
  const db = getDb();
  const [uc] = await db
    .select({
      createdById: useCases.createdById,
      ownerUserId: useCases.ownerUserId,
      status: useCases.status,
      deletedAt: useCases.deletedAt,
    })
    .from(useCases)
    .where(eq(useCases.id, id));
  if (!uc || uc.deletedAt) return null;
  const authorRows = await db
    .select({ userId: useCaseAuthors.userId })
    .from(useCaseAuthors)
    .where(eq(useCaseAuthors.useCaseId, id));
  return {
    createdById: uc.createdById,
    ownerUserId: uc.ownerUserId,
    status: uc.status,
    authorUserIds: authorRows.map((a) => a.userId).filter((x): x is string => !!x),
  };
}

/** Last time each use case changed status (for staleness flags). */
export async function lastStatusChangeAt(): Promise<Map<string, Date>> {
  const db = getDb();
  const rows = await db
    .select({
      useCaseId: statusChanges.useCaseId,
      last: sql<Date>`max(${statusChanges.createdAt})`.mapWith(
        (v: string | Date) => new Date(v),
      ),
    })
    .from(statusChanges)
    .groupBy(statusChanges.useCaseId);
  return new Map(rows.map((r) => [r.useCaseId, r.last]));
}
