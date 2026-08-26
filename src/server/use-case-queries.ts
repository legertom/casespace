import "server-only";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  eltOrgs,
  fieldChanges,
  people,
  statusChanges,
  teams,
  useCaseAuthors,
  useCaseUrls,
  useCases,
  users,
} from "@/db/schema";
import type { AuditedField, Department, UcStatus, UrlKind } from "@/lib/domain";
import { creditsIdentity, type Identity } from "@/lib/people-match";

export interface UseCaseFilters {
  status?: UcStatus;
  department?: Department;
  teamId?: string;
  eltOrgId?: string;
  /** Records with no ELT owner at all — the dashboard's "Unallocated" bucket. */
  eltUnallocated?: boolean;
  q?: string;
  createdById?: string;
  /** Restrict to records the given user logged, owns, or authored — "Mine". */
  mine?: Identity;
  /** Restrict to records the given person owns or authored. */
  credits?: Identity;
  /**
   * true = the program only, false = community submissions only, undefined =
   * both. Lists default to both and label each record; only metrics are
   * program-only. Callers must test `!== undefined` — see below.
   */
  inProgram?: boolean;
}

export interface UseCaseUrlEntry {
  id: string;
  kind: UrlKind;
  label: string | null;
  url: string;
}

export type UseCaseRow = typeof useCases.$inferSelect & {
  teamName: string | null;
  eltOrgName: string | null;
  authors: {
    id: string;
    displayName: string;
    personId: string | null;
    userId: string | null;
  }[];
  urls: UseCaseUrlEntry[];
};

export async function listUseCases(
  filters: UseCaseFilters = {},
): Promise<UseCaseRow[]> {
  const db = getDb();
  const conds = [isNull(useCases.deletedAt)];
  if (filters.status) conds.push(eq(useCases.status, filters.status));
  if (filters.department)
    conds.push(eq(useCases.department, filters.department));
  if (filters.teamId) conds.push(eq(useCases.teamId, filters.teamId));
  if (filters.eltOrgId) conds.push(eq(useCases.eltOrgId, filters.eltOrgId));
  if (filters.eltUnallocated) conds.push(isNull(useCases.eltOrgId));
  if (filters.createdById)
    conds.push(eq(useCases.createdById, filters.createdById));
  // `!== undefined`, not truthiness: `false` means "community only" and is
  // exactly the value the surrounding truthy idiom would drop, which would
  // make the Community filter silently return everything.
  if (filters.inProgram !== undefined)
    conds.push(eq(useCases.inProgram, filters.inProgram));
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

  // One more round trip for the whole page, not one per record — the same
  // shape as authors above. The casebook list doesn't render these, but
  // toApiUseCase is the only REST serializer and it reads from this row.
  const urls = ids.length
    ? await db
        .select()
        .from(useCaseUrls)
        .where(inArray(useCaseUrls.useCaseId, ids))
        .orderBy(useCaseUrls.position)
    : [];
  const urlsByCase = new Map<string, UseCaseUrlEntry[]>();
  for (const u of urls) {
    const list = urlsByCase.get(u.useCaseId) ?? [];
    list.push({ id: u.id, kind: u.kind, label: u.label, url: u.url });
    urlsByCase.set(u.useCaseId, list);
  }

  let result = rows.map((r) => ({
    ...r.uc,
    teamName: r.teamName,
    eltOrgName: r.eltOrgName,
    authors: byCase.get(r.uc.id) ?? [],
    urls: urlsByCase.get(r.uc.id) ?? [],
  }));

  // Both views ask the same question of the same matcher, so "Mine" and
  // "Use cases for <me>" can never disagree about who a record belongs to.
  if (filters.mine) {
    const id = filters.mine;
    result = result.filter(
      (r) =>
        (id.userId !== null && r.createdById === id.userId) ||
        creditsIdentity(r, id),
    );
  }

  if (filters.credits) {
    const id = filters.credits;
    result = result.filter((r) => creditsIdentity(r, id));
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

/** One row of the field-change audit trail, ready for the Activity stream. */
export interface FieldChangeEntry {
  id: string;
  field: AuditedField;
  fromValue: string | null;
  toValue: string | null;
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

  const urls: UseCaseUrlEntry[] = await db
    .select({
      id: useCaseUrls.id,
      kind: useCaseUrls.kind,
      label: useCaseUrls.label,
      url: useCaseUrls.url,
    })
    .from(useCaseUrls)
    .where(eq(useCaseUrls.useCaseId, id))
    .orderBy(useCaseUrls.position);

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

  const fieldHistory: FieldChangeEntry[] = await db
    .select({
      id: fieldChanges.id,
      field: fieldChanges.field,
      fromValue: fieldChanges.fromValue,
      toValue: fieldChanges.toValue,
      createdAt: fieldChanges.createdAt,
      changedByName: users.name,
    })
    .from(fieldChanges)
    .leftJoin(users, eq(fieldChanges.changedById, users.id))
    .where(eq(fieldChanges.useCaseId, id))
    .orderBy(desc(fieldChanges.createdAt));

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
    urls,
    history,
    fieldHistory,
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
      inProgram: useCases.inProgram,
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
    inProgram: uc.inProgram,
    authorUserIds: authorRows
      .map((a) => a.userId)
      .filter((x): x is string => !!x),
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
