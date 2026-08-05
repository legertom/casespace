import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { eltOrgs, people, statusChanges, teams, useCaseAuthors, useCases, users } from "@/db/schema";
import {
  canSetStatus,
  suggestEltOrg,
  type Department,
  type Role,
  type UcStatus,
} from "@/lib/domain";
import { canEditUseCase, canCreateUseCase } from "@/lib/permissions";
import {
  applyCreateDefaults,
  type PersonRef,
  type UcSource,
  type UseCaseCreateInput,
  type UseCaseUpdateInput,
} from "@/lib/use-case-input";
import { getOwnership } from "./use-case-queries";

export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}

/** Resolve a team by name (optionally scoped to a department). */
export async function resolveTeamId(
  teamName: string | null | undefined,
  department: Department | null | undefined,
): Promise<string | null> {
  if (!teamName?.trim()) return null;
  const db = getDb();
  const rows = await db
    .select({ id: teams.id, department: teams.department })
    .from(teams)
    .where(sql`lower(${teams.name}) = lower(${teamName.trim()})`);
  if (rows.length === 0) return null;
  if (department) {
    const scoped = rows.find((r) => r.department === department);
    if (scoped) return scoped.id;
  }
  return rows[0].id;
}

interface Actor {
  id: string;
  role: Role;
}

/**
 * Link author/owner refs to directory rows and user accounts. Refs that carry
 * only a display name (proposals from the Coach or notes parser) resolve to a
 * person by exact, case-insensitive name match — never fuzzy; credit must not
 * guess.
 */
async function resolveUserLinks(refs: PersonRef[]): Promise<PersonRef[]> {
  const db = getDb();
  const resolved: PersonRef[] = [];
  for (const r of refs) {
    let personId = r.personId ?? null;
    if (!personId && r.displayName.trim()) {
      const [match] = await db
        .select({ id: people.id })
        .from(people)
        .where(sql`lower(${people.name}) = lower(${r.displayName.trim()})`);
      personId = match?.id ?? null;
    }
    resolved.push({ ...r, personId });
  }
  const personIds = resolved
    .map((r) => r.personId)
    .filter((x): x is string => !!x);
  if (personIds.length === 0) return resolved;
  const linked = await db
    .select({ id: users.id, personId: users.personId })
    .from(users)
    .where(inArray(users.personId, personIds));
  const byPerson = new Map(linked.map((u) => [u.personId!, u.id]));
  return resolved.map((r) => ({
    ...r,
    userId: r.userId ?? (r.personId ? byPerson.get(r.personId) ?? null : null),
  }));
}

async function suggestedEltOrgId(
  department: Department | null | undefined,
  explicit: string | null | undefined,
): Promise<string | null> {
  if (explicit) return explicit;
  if (!department) return null;
  const db = getDb();
  const orgs = await db.select().from(eltOrgs);
  return (
    suggestEltOrg(
      department,
      orgs.map((o) => ({ ...o, departments: o.departments as Department[] })),
    )?.id ?? null
  );
}

export async function createUseCase(
  actor: Actor,
  input: UseCaseCreateInput,
  source: UcSource,
): Promise<string> {
  if (!canCreateUseCase(actor.role)) {
    throw new ForbiddenError("Viewers cannot create use cases.");
  }
  const db = getDb();
  const row = applyCreateDefaults(input, { source, createdById: actor.id });
  row.eltOrgId = await suggestedEltOrgId(input.department, input.eltOrgId);

  const owner = input.owner
    ? (await resolveUserLinks([input.owner]))[0]
    : null;
  if (owner) {
    row.ownerPersonId = owner.personId ?? null;
    row.ownerUserId = owner.userId ?? null;
    row.ownerName = owner.displayName;
  }

  const [created] = await db.insert(useCases).values(row).returning();

  const authors = await resolveUserLinks(input.authors ?? []);
  if (authors.length) {
    await db.insert(useCaseAuthors).values(
      authors.map((a, i) => ({
        useCaseId: created.id,
        personId: a.personId ?? null,
        userId: a.userId ?? null,
        displayName: a.displayName,
        position: i,
      })),
    );
  }

  // Birth event in the movement log.
  await db.insert(statusChanges).values({
    useCaseId: created.id,
    fromStatus: null,
    toStatus: created.status,
    changedById: actor.id,
  });

  return created.id;
}

export async function updateUseCase(
  actor: Actor,
  id: string,
  input: UseCaseUpdateInput,
): Promise<void> {
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  if (!canEditUseCase(actor, ownership)) {
    throw new ForbiddenError("You can only edit use cases you created, own, or authored.");
  }
  const db = getDb();

  const patch: Record<string, unknown> = {};
  const direct: (keyof UseCaseUpdateInput)[] = [
    "title",
    "description",
    "department",
    "teamId",
    "eltOrgId",
    "aiTools",
    "approach",
    "currentSteps",
    "ratingFrequency",
    "ratingPain",
    "ratingDataAvailability",
    "ratingRisk",
    "ratingOwnershipClarity",
    "ratingEvaluationClarity",
    "ratingMaintenanceBurden",
    "functionalLeaderSuccess",
    "gateNamed",
    "gateTool",
    "gateAdoption",
    "adoptionEvidence",
    "gateOwner",
    "successCriterion",
    "successCriterionMet",
    "baselineMetric",
    "baselineValue",
    "baselineUnit",
    "postValue",
    "measurementMethod",
    "netImpactStatement",
    "isPositive",
    "roiStatus",
    "revisitOn",
  ];
  for (const key of direct) {
    if (key in input) patch[key] = input[key] ?? null;
  }
  // Required fields never become null via patch.
  if (patch.title === null) delete patch.title;
  if (patch.description === null) delete patch.description;
  if (patch.aiTools === null) patch.aiTools = [];
  if (patch.currentSteps === null) patch.currentSteps = [];
  if (patch.gateNamed === null) delete patch.gateNamed;
  if (patch.gateTool === null) delete patch.gateTool;
  if (patch.gateAdoption === null) delete patch.gateAdoption;
  if (patch.gateOwner === null) delete patch.gateOwner;
  if (patch.successCriterionMet === null) delete patch.successCriterionMet;
  if (patch.roiStatus === null) delete patch.roiStatus;

  if ("owner" in input) {
    const owner = input.owner
      ? (await resolveUserLinks([input.owner]))[0]
      : null;
    patch.ownerPersonId = owner?.personId ?? null;
    patch.ownerUserId = owner?.userId ?? null;
    patch.ownerName = owner?.displayName ?? null;
  }

  if ("department" in input && !("eltOrgId" in input)) {
    patch.eltOrgId = await suggestedEltOrgId(input.department, null);
  }

  if (Object.keys(patch).length > 0) {
    await db.update(useCases).set(patch).where(eq(useCases.id, id));
  }

  if ("authors" in input && input.authors) {
    const authors = await resolveUserLinks(input.authors);
    await db.delete(useCaseAuthors).where(eq(useCaseAuthors.useCaseId, id));
    if (authors.length) {
      await db.insert(useCaseAuthors).values(
        authors.map((a, i) => ({
          useCaseId: id,
          personId: a.personId ?? null,
          userId: a.userId ?? null,
          displayName: a.displayName,
          position: i,
        })),
      );
    }
  }
}

/**
 * Move a record through the pipeline. Qualified transitions are admin-only
 * (enforced by canSetStatus); every change is logged.
 */
export async function setStatus(
  actor: Actor,
  id: string,
  to: UcStatus,
  note?: string,
): Promise<void> {
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  const from = ownership.status as UcStatus;

  // Admins may move any record; editors only their own.
  if (actor.role !== "admin" && !canEditUseCase(actor, ownership)) {
    throw new ForbiddenError("You can only move use cases you created, own, or authored.");
  }
  if (!canSetStatus(actor.role, from, to)) {
    throw new ForbiddenError(
      to === "qualified" || from === "qualified"
        ? "Only an admin can promote to or demote from Qualified — it records Kate's decision."
        : "That status change isn't allowed.",
    );
  }

  const db = getDb();
  const patch: Partial<typeof useCases.$inferInsert> = { status: to };
  if (to === "qualified") {
    patch.qualifiedAt = new Date();
    patch.approvedById = actor.id;
    patch.rejectionReason = null;
  }
  await db.update(useCases).set(patch).where(eq(useCases.id, id));
  await db.insert(statusChanges).values({
    useCaseId: id,
    fromStatus: from,
    toStatus: to,
    changedById: actor.id,
    note: note ?? null,
  });
}

/**
 * Reject at the Qualified gate with a reason. The record lands (or stays) at
 * Launched; the reason is visible to its editors until a later promotion.
 */
export async function rejectAtQualifiedGate(
  actor: Actor,
  id: string,
  reason: string,
): Promise<void> {
  if (actor.role !== "admin") {
    throw new ForbiddenError("Only an admin can decide the Qualified gate.");
  }
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  const from = ownership.status as UcStatus;
  const db = getDb();
  await db
    .update(useCases)
    .set({ status: "launched", rejectionReason: reason, qualifiedAt: null })
    .where(eq(useCases.id, id));
  await db.insert(statusChanges).values({
    useCaseId: id,
    fromStatus: from,
    toStatus: "launched",
    changedById: actor.id,
    note: `Rejected at the Qualified gate: ${reason}`,
  });
}

export async function softDeleteUseCase(
  actor: Actor,
  id: string,
): Promise<void> {
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  if (!canEditUseCase(actor, ownership)) {
    throw new ForbiddenError("You can only delete use cases you created, own, or authored.");
  }
  const db = getDb();
  await db
    .update(useCases)
    .set({ deletedAt: new Date() })
    .where(eq(useCases.id, id));
}
