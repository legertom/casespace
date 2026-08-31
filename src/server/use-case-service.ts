import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  aiLeads,
  eltOrgs,
  fieldChanges,
  notifications,
  people,
  statusChanges,
  teams,
  useCaseAuthors,
  useCaseUrls,
  useCases,
  users,
} from "@/db/schema";
import { newUseCaseNotifications } from "@/lib/new-use-case-notifications";
import {
  canSetStatus,
  suggestEltOrg,
  type AuditedField,
  type Department,
  type Role,
  type UcStatus,
} from "@/lib/domain";
import {
  canCreateUseCase,
  canEditUseCase,
  canMoveUseCaseStatus,
  canManageProgram,
} from "@/lib/permissions";
import { foldName } from "@/lib/people-match";
import {
  applyCreateDefaults,
  UPDATE_PATCHABLE_KEYS,
  type PersonRef,
  type UcSource,
  type UseCaseCreateInput,
  type UseCaseUpdateInput,
  type UseCaseUrlInput,
} from "@/lib/use-case-input";
import { getOwnership } from "./use-case-queries";

export class ForbiddenError extends Error {}
export class NotFoundError extends Error {}
export class ValidationError extends Error {}

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
  /**
   * The stored role when `role` is a view-as preview. Membership stamping
   * reads this one: a costume must not decide what counts toward the 45.
   */
  realRole?: Role;
}

/**
 * Link author/owner refs to directory rows and user accounts. Refs that carry
 * only a display name (typed by hand, or proposed by the Coach or notes
 * parser) resolve to a person by name — never fuzzy; credit must not guess.
 * Case and accents fold first, so the login spelling of a name finds the
 * directory spelling of it ("Tom Leger" → "Tom Léger").
 */
async function resolveUserLinks(refs: PersonRef[]): Promise<PersonRef[]> {
  const db = getDb();
  const needsLookup = refs.some((r) => !r.personId && r.displayName.trim());
  const byName = new Map<string, string>();
  if (needsLookup) {
    const directory = await db
      .select({ id: people.id, name: people.name })
      .from(people);
    for (const p of directory) byName.set(foldName(p.name), p.id);
  }
  const resolved: PersonRef[] = refs.map((r) => ({
    ...r,
    personId: r.personId ?? byName.get(foldName(r.displayName)) ?? null,
  }));
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
    userId:
      r.userId ?? (r.personId ? (byPerson.get(r.personId) ?? null) : null),
  }));
}

/**
 * Whether a resolved owner holds a roster row — the owner half of
 * inProgramAtCreation. Row existence is the test, matching how sign-in
 * decides `contributor`; null when the ref never linked to a person or
 * account, because an unlinked name cannot be checked without guessing.
 */
async function ownerOnRoster(ref: PersonRef): Promise<boolean | null> {
  const conds = [];
  if (ref.personId) conds.push(eq(aiLeads.personId, ref.personId));
  if (ref.userId) conds.push(eq(aiLeads.userId, ref.userId));
  if (conds.length === 0) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: aiLeads.id })
    .from(aiLeads)
    .where(or(...conds))
    .limit(1);
  return Boolean(row);
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

/** Validated URL input, positioned. Blank labels collapse to null. */
function urlRows(useCaseId: string, urls: readonly UseCaseUrlInput[]) {
  return urls.map((u, i) => ({
    useCaseId,
    kind: u.kind,
    label: u.label?.trim() || null,
    url: u.url,
    position: i,
  }));
}

export async function createUseCase(
  actor: Actor,
  input: UseCaseCreateInput,
  source: UcSource,
): Promise<string> {
  if (!canCreateUseCase(actor.role)) {
    throw new ForbiddenError(
      "Only signed-in Clever employees can log use cases.",
    );
  }
  const db = getDb();
  // Owner resolves before the stamp: membership tracks whose workflow this
  // is, not who typed it in. Only when no owner is named does the stamp fall
  // back to the logger — and then to their REAL role: the effective role
  // authorized the write above so previews behave like the real thing, but a
  // costume must not decide what counts toward the 45. Note the admin
  // fan-out below reads the table for the same reason: it is about who is
  // notified, not about what counts.
  const owner = input.owner ? (await resolveUserLinks([input.owner]))[0] : null;
  const ownerIsLead = owner ? await ownerOnRoster(owner) : null;
  const row = applyCreateDefaults(input, {
    source,
    createdById: actor.id,
    actorRole: actor.realRole ?? actor.role,
    ownerIsLead,
  });
  row.eltOrgId = await suggestedEltOrgId(input.department, input.eltOrgId);

  if (owner) {
    row.ownerPersonId = owner.personId ?? null;
    row.ownerUserId = owner.userId ?? null;
    row.ownerName = owner.displayName;
  }

  const authors = await resolveUserLinks(input.authors ?? []);

  const urls = input.urls ?? [];

  // One transaction: the record, its credit, its links, its birth event in the
  // movement log, and the admins' heads-up exist together or not at all. A
  // record without its birth event would vanish from the staleness map; one
  // without its authors would strip credit, and credit is the program's
  // currency.
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(useCases).values(row).returning();

    if (authors.length) {
      await tx.insert(useCaseAuthors).values(
        authors.map((a, i) => ({
          useCaseId: created.id,
          personId: a.personId ?? null,
          userId: a.userId ?? null,
          displayName: a.displayName,
          position: i,
        })),
      );
    }

    if (urls.length) {
      await tx.insert(useCaseUrls).values(urlRows(created.id, urls));
    }

    await tx.insert(statusChanges).values({
      useCaseId: created.id,
      fromStatus: null,
      toStatus: created.status,
      changedById: actor.id,
    });

    // Admins hear about every record, from every door — form, wizard, notes,
    // REST, MCP all arrive here. The role comes from the table, not the
    // session: an admin previewing as a viewer is still an admin.
    const admins = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));
    const recipients = newUseCaseNotifications({
      actorId: actor.id,
      adminUserIds: admins.map((a) => a.id),
      // From the saved row, not from `row` or the input: the stamp is the
      // database's to make. Community submissions ring nobody — they reach
      // admins as a dashboard count.
      inProgram: created.inProgram,
    });
    if (recipients.length > 0) {
      await tx.insert(notifications).values(
        recipients.map((r) => ({
          userId: r.userId,
          kind: "new_use_case" as const,
          useCaseId: created.id,
          actorId: actor.id,
        })),
      );
    }

    return created.id;
  });
}

/**
 * The audit rows one update earns — see AUDITED_FIELDS in lib/domain for the
 * philosophy. Reads the record's pre-state itself; the caller inserts the
 * rows inside the update's transaction so the trail and the change land
 * together or not at all.
 */
async function auditRowsForUpdate(
  actor: Actor,
  id: string,
  input: UseCaseUpdateInput,
  patch: Record<string, unknown>,
  authors: PersonRef[] | null,
): Promise<(typeof fieldChanges.$inferInsert)[]> {
  const db = getDb();
  const [before] = await db
    .select({
      ownerName: useCases.ownerName,
      eltOrgId: useCases.eltOrgId,
      gateNamed: useCases.gateNamed,
      gateTool: useCases.gateTool,
      gateAdoption: useCases.gateAdoption,
      gateOwner: useCases.gateOwner,
    })
    .from(useCases)
    .where(eq(useCases.id, id));
  if (!before) return [];

  const rows: (typeof fieldChanges.$inferInsert)[] = [];
  const record = (
    field: AuditedField,
    fromValue: string | null,
    toValue: string | null,
  ) => {
    if (fromValue !== toValue)
      rows.push({
        useCaseId: id,
        field,
        fromValue,
        toValue,
        changedById: actor.id,
      });
  };

  if ("owner" in input) {
    record(
      "owner",
      before.ownerName,
      (patch.ownerName as string | null) ?? null,
    );
  }

  if (authors) {
    const was = await db
      .select({ displayName: useCaseAuthors.displayName })
      .from(useCaseAuthors)
      .where(eq(useCaseAuthors.useCaseId, id))
      .orderBy(useCaseAuthors.position);
    record(
      "authors",
      was.map((a) => a.displayName).join(", ") || null,
      authors.map((a) => a.displayName).join(", ") || null,
    );
  }

  if ("eltOrgId" in patch && patch.eltOrgId !== before.eltOrgId) {
    record(
      "elt_org",
      await eltOrgName(before.eltOrgId),
      await eltOrgName(patch.eltOrgId as string | null),
    );
  }

  const gates = [
    ["gate_named", "gateNamed", before.gateNamed],
    ["gate_tool", "gateTool", before.gateTool],
    ["gate_adoption", "gateAdoption", before.gateAdoption],
    ["gate_owner", "gateOwner", before.gateOwner],
  ] as const;
  for (const [field, key, was] of gates) {
    if (key in patch) record(field, String(was), String(patch[key]));
  }

  return rows;
}

async function eltOrgName(id: string | null): Promise<string | null> {
  if (!id) return null;
  const db = getDb();
  const [o] = await db
    .select({ name: eltOrgs.name })
    .from(eltOrgs)
    .where(eq(eltOrgs.id, id));
  return o?.name ?? null;
}

export async function updateUseCase(
  actor: Actor,
  id: string,
  input: UseCaseUpdateInput,
): Promise<void> {
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  if (!canEditUseCase(actor, ownership)) {
    throw new ForbiddenError(
      "You can only edit use cases you created, own, or authored.",
    );
  }
  const db = getDb();

  const patch: Record<string, unknown> = {};
  for (const key of UPDATE_PATCHABLE_KEYS) {
    if (key in input) patch[key] = input[key] ?? null;
  }
  // Required fields never become null via patch.
  if (patch.title === null) delete patch.title;
  if (patch.description === null) delete patch.description;
  if (patch.aiTools === null) patch.aiTools = [];
  if (patch.approaches === null) patch.approaches = [];
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

  // eltOrgId derives from department at create only. Re-deriving on update
  // would silently overwrite an explicit admin re-allocation.

  const authors =
    "authors" in input && input.authors
      ? await resolveUserLinks(input.authors)
      : null;

  // Same contract as authors: `[]` clears the list, absent leaves it alone.
  const urls = "urls" in input && input.urls ? input.urls : null;

  // The audit trail: a change to any field that moves the program's numbers
  // or its credit gets a row, written in the same transaction as the change.
  // Values are display strings so the trail outlives the directory.
  const audit = await auditRowsForUpdate(actor, id, input, patch, authors);

  // One transaction, chiefly for the two swaps: a delete-then-insert with a
  // failure in between would silently strip every credit — or every link —
  // from the record.
  await db.transaction(async (tx) => {
    if (Object.keys(patch).length > 0) {
      await tx.update(useCases).set(patch).where(eq(useCases.id, id));
    }

    if (audit.length > 0) {
      await tx.insert(fieldChanges).values(audit);
    }

    if (authors) {
      await tx.delete(useCaseAuthors).where(eq(useCaseAuthors.useCaseId, id));
      if (authors.length) {
        await tx.insert(useCaseAuthors).values(
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

    if (urls) {
      await tx.delete(useCaseUrls).where(eq(useCaseUrls.useCaseId, id));
      if (urls.length) {
        await tx.insert(useCaseUrls).values(urlRows(id, urls));
      }
    }
  });
}

/**
 * Move a record through the pipeline. Transitions touching Qualified or
 * Confirmed Positive ROI are admin-only (enforced by canSetStatus); every
 * change is logged. Confirming positive ROI requires a note articulating
 * the annual ROI — it feeds the EOY wins report.
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

  // Admins and AI Leads may move any record; employees only their own.
  if (!canMoveUseCaseStatus(actor, ownership)) {
    throw new ForbiddenError(
      actor.role === "employee"
        ? "You can only move use cases you created, own, or authored."
        : "Your role can't move use cases through the pipeline.",
    );
  }
  if (!canSetStatus(actor.role, from, to)) {
    throw new ForbiddenError(
      to === "qualified" ||
        from === "qualified" ||
        to === "confirmed_positive_roi" ||
        from === "confirmed_positive_roi"
        ? "Only an admin can move records into or out of Qualified and Confirmed Positive ROI — both record Kate's decisions."
        : "That status change isn't allowed.",
    );
  }
  if (to === "confirmed_positive_roi" && !note?.trim()) {
    throw new ValidationError(
      "Confirming positive ROI requires a note articulating the annual ROI — it becomes part of the end-of-year wins report.",
    );
  }

  const db = getDb();
  const patch: Partial<typeof useCases.$inferInsert> = { status: to };
  if (to === "qualified") {
    patch.qualifiedAt = new Date();
    patch.approvedById = actor.id;
    patch.rejectionReason = null;
  }
  // Promotion past the Qualified gate *is* admission to the program: it is an
  // admin-only transition recording Kate's decision, and it is the natural
  // gesture for taking a community record on. Without this, an admin who
  // qualifies a community record and forgets the toggle leaves /wins and the
  // dashboard's 15 disagreeing. Demotion does not clear it — membership is
  // durable, and only the explicit toggle turns it off.
  if (to === "qualified" || to === "confirmed_positive_roi") {
    patch.inProgram = true;
  }
  if (to === "confirmed_positive_roi") {
    patch.roiConfirmedAt = new Date();
    patch.roiConfirmedById = actor.id;
    // Confirming is promotion past the Qualified gate, wherever the record
    // stood — a stale rejection reason must not outlive it.
    patch.rejectionReason = null;
  }
  if (from === "confirmed_positive_roi") {
    patch.roiConfirmedAt = null;
    patch.roiConfirmedById = null;
  }
  await db.transaction(async (tx) => {
    // Optimistic guard: only move the record if it still sits where this
    // request last saw it. Without the status condition, two concurrent
    // transitions would both land and the log would record a move that never
    // happened.
    const moved = await tx
      .update(useCases)
      .set(patch)
      .where(and(eq(useCases.id, id), eq(useCases.status, from)))
      .returning({ id: useCases.id });
    if (moved.length === 0) {
      throw new ValidationError(
        "This record's status changed while you were looking at it — reload the page and try again.",
      );
    }
    await tx.insert(statusChanges).values({
      useCaseId: id,
      fromStatus: from,
      toStatus: to,
      changedById: actor.id,
      note: note ?? null,
    });

    // Promotion past the Qualified gate silently admits a community record —
    // the trail makes the silent part visible, next to the promotion itself.
    if (patch.inProgram === true && !ownership.inProgram) {
      await tx.insert(fieldChanges).values({
        useCaseId: id,
        field: "in_program",
        fromValue: "false",
        toValue: "true",
        changedById: actor.id,
      });
    }
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
  await db.transaction(async (tx) => {
    await tx
      .update(useCases)
      .set({ status: "launched", rejectionReason: reason, qualifiedAt: null })
      .where(eq(useCases.id, id));
    await tx.insert(statusChanges).values({
      useCaseId: id,
      fromStatus: from,
      toStatus: "launched",
      changedById: actor.id,
      note: `Rejected at the Qualified gate: ${reason}`,
    });
  });
}

/**
 * Add a record to the program, or take it out — admins only.
 *
 * The switch exists so a community submission worth counting can be taken on,
 * and so a stray record can be excluded. Deliberately not routed through
 * patchUseCaseAction: that path is gated by canEditUseCase, which would hand
 * the switch to every record's owner.
 *
 * No history row. status_changes is for statuses, and a from === to entry
 * would poison getMovement and the What's New promotion/regression split,
 * which both compare statusRank. The gap is noted in docs/features/record.md.
 */
export async function setProgramMembership(
  actor: Actor,
  id: string,
  inProgram: boolean,
): Promise<void> {
  if (!canManageProgram(actor.role)) {
    throw new ForbiddenError(
      "Only an admin can change whether a record counts toward the program.",
    );
  }
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  // A no-op toggle writes nothing — the trail records changes, not clicks.
  if (ownership.inProgram === inProgram) return;
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(useCases).set({ inProgram }).where(eq(useCases.id, id));
    await tx.insert(fieldChanges).values({
      useCaseId: id,
      field: "in_program",
      fromValue: String(!inProgram),
      toValue: String(inProgram),
      changedById: actor.id,
    });
  });
}

export async function softDeleteUseCase(
  actor: Actor,
  id: string,
): Promise<void> {
  const ownership = await getOwnership(id);
  if (!ownership) throw new NotFoundError("Use case not found.");
  if (!canEditUseCase(actor, ownership)) {
    throw new ForbiddenError(
      "You can only delete use cases you created, own, or authored.",
    );
  }
  const db = getDb();
  await db
    .update(useCases)
    .set({ deletedAt: new Date() })
    .where(eq(useCases.id, id));
}
