/**
 * Shared input validation for creating/updating use cases across all doors:
 * web form, wizard, notes parser, REST API, and MCP.
 *
 * Sparse is safe: only title + description are required to create. Everything
 * else defaults to the emptiest honest value. A half-filled record that
 * exists beats a perfect record that doesn't.
 */
import { z } from "zod";
import {
  APPROACHES,
  DEPARTMENTS,
  inProgramAtCreation,
  type Role,
  SETTABLE_STATUSES,
  URL_KINDS,
} from "./domain";

const rating = z.number().int().min(1).max(5);

/**
 * One labelled link on a record. http/https only, and not by convention —
 * these render as clickable anchors, so `javascript:` and `data:` have to be
 * impossible at the schema every write door shares, not at each door.
 *
 * z.httpUrl() trims, requires a literal "http(s)://" prefix, parses with
 * `new URL`, then re-checks the protocol — which is what stops
 * `javascript://example.com/%0aalert(1)` from slipping past the prefix test.
 * It also rejects single-label hosts, so `http://localhost:3000` is out: a
 * localhost URL is useless to everyone but the person who pasted it.
 */
export const useCaseUrlSchema = z.object({
  kind: z.enum(URL_KINDS).default("other"),
  label: z.string().trim().max(80).nullish(),
  url: z
    .httpUrl("Links have to start with http:// or https://")
    .max(2048, "That URL is too long to store"),
});

export type UseCaseUrlInput = z.infer<typeof useCaseUrlSchema>;

/**
 * Statuses a non-admin write may set. Qualified and Confirmed Positive ROI
 * are granted only through the admin transition gate — see SETTABLE_STATUSES
 * in domain.ts, the single source for this list.
 */
const settableStatus = z.enum(SETTABLE_STATUSES);

export const personRefSchema = z.object({
  personId: z.string().uuid().nullish(),
  userId: z.string().uuid().nullish(),
  displayName: z.string().min(1),
});

export type PersonRef = z.infer<typeof personRefSchema>;

export const useCaseCreateSchema = z.object({
  title: z.string().trim().min(1, "A title is required"),
  description: z.string().trim().min(1, "A description is required"),

  department: z.enum(DEPARTMENTS).nullish(),
  teamId: z.string().uuid().nullish(),
  eltOrgId: z.string().uuid().nullish(),

  authors: z.array(personRefSchema).max(20).optional(),
  owner: personRefSchema.nullish(),

  /** Where to find the thing itself. Its own table — see UNPATCHABLE below. */
  urls: z.array(useCaseUrlSchema).max(20).optional(),

  aiTools: z.array(z.string().trim().min(1)).max(20).optional(),
  approaches: z.array(z.enum(APPROACHES)).max(APPROACHES.length).optional(),

  currentSteps: z.array(z.string().trim().min(1)).max(50).optional(),
  ratingFrequency: rating.nullish(),
  ratingPain: rating.nullish(),
  ratingDataAvailability: rating.nullish(),
  ratingRisk: rating.nullish(),
  ratingOwnershipClarity: rating.nullish(),
  ratingEvaluationClarity: rating.nullish(),
  ratingMaintenanceBurden: rating.nullish(),
  functionalLeaderSuccess: z.string().trim().nullish(),

  gateNamed: z.boolean().optional(),
  gateTool: z.boolean().optional(),
  gateAdoption: z.boolean().optional(),
  adoptionEvidence: z.string().trim().nullish(),
  gateOwner: z.boolean().optional(),

  successCriterion: z.string().trim().nullish(),
  successCriterionMet: z.enum(["yes", "no", "not_yet"]).optional(),

  buildHours: z.number().finite().min(0).nullish(),
  baselineMetric: z.string().trim().nullish(),
  baselineValue: z.number().finite().nullish(),
  baselineUnit: z.string().trim().nullish(),
  postValue: z.number().finite().nullish(),
  measurementMethod: z.string().trim().nullish(),
  netImpactStatement: z.string().trim().nullish(),
  isPositive: z.boolean().nullish(),
  roiStatus: z
    .enum(["not_yet_measurable", "in_progress", "complete"])
    .optional(),
  revisitOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullish(),

  status: settableStatus.optional(),
});

export type UseCaseCreateInput = z.infer<typeof useCaseCreateSchema>;

/**
 * `approach` was a single enum until 2026-08-14. REST and MCP callers have
 * live tokens and scripts written against it, so a singular value still
 * arrives as a one-item `approaches` — an explicit `approaches` wins.
 */
function acceptLegacyApproach<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const { approach, ...rest } = raw as Record<string, unknown>;
    if (approach === undefined) return raw;
    return "approaches" in rest
      ? rest
      : { ...rest, approaches: approach === null ? [] : [approach] };
  }, schema);
}

export const useCaseCreateApiSchema = acceptLegacyApproach(useCaseCreateSchema);

/** Every field editable after creation; all optional (patch semantics). */
export const useCaseUpdateSchema = useCaseCreateSchema.partial();

export const useCaseUpdateApiSchema = acceptLegacyApproach(useCaseUpdateSchema);

export type UseCaseUpdateInput = z.infer<typeof useCaseUpdateSchema>;

/**
 * Fields `updateUseCase` never patches column-for-column: the person refs
 * (owner, authors) resolve against the directory first, `urls` is its own
 * table, and status only ever moves through the transition helpers so the
 * movement log stays complete.
 */
const UNPATCHABLE = ["owner", "authors", "urls", "status"] as const;

export type PatchableKey = Exclude<
  keyof UseCaseUpdateInput,
  (typeof UNPATCHABLE)[number]
>;

/**
 * Every other updatable column, derived from the schema itself — add a field
 * to useCaseCreateSchema and it becomes patchable without a second list to
 * remember.
 */
export const UPDATE_PATCHABLE_KEYS = Object.keys(
  useCaseUpdateSchema.shape,
).filter(
  (k) => !(UNPATCHABLE as readonly string[]).includes(k),
) as PatchableKey[];

export type UcSource = "form" | "wizard" | "notes" | "api" | "mcp";

/** What `useCaseToFormInput` reads: a saved record plus its two child lists. */
export interface SavedUseCase extends Omit<
  UseCaseCreateInput,
  "authors" | "owner" | "urls" | "status"
> {
  ownerPersonId?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  authors: readonly {
    personId: string | null;
    userId: string | null;
    displayName: string;
  }[];
  urls: readonly {
    kind: (typeof URL_KINDS)[number];
    label: string | null;
    url: string;
  }[];
}

/**
 * A saved record, back into the shape the edit form starts from.
 *
 * This exists as one derived function rather than a hand-written object in the
 * edit page because the form always submits every field it holds: a field the
 * page forgot to prefill arrives as null and *overwrites* what was saved. That
 * is not hypothetical — `buildHours` was silently erased on every full-form
 * edit from the day it shipped until 2026-08-20. The companion test asserts
 * this covers every field the create schema knows about, so the next field
 * added can't repeat it.
 *
 * `status` is deliberately absent: it moves only through the transition
 * helpers, and the form offers it on create only.
 */
export function useCaseToFormInput(
  uc: SavedUseCase,
): Omit<UseCaseCreateInput, "status"> {
  return {
    title: uc.title,
    description: uc.description,
    department: uc.department,
    teamId: uc.teamId,
    eltOrgId: uc.eltOrgId,
    authors: uc.authors.map((a) => ({
      personId: a.personId,
      userId: a.userId,
      displayName: a.displayName,
    })),
    owner: uc.ownerName
      ? {
          personId: uc.ownerPersonId ?? null,
          userId: uc.ownerUserId ?? null,
          displayName: uc.ownerName,
        }
      : null,
    urls: uc.urls.map((u) => ({
      kind: u.kind,
      label: u.label,
      url: u.url,
    })),
    aiTools: uc.aiTools,
    approaches: uc.approaches,
    currentSteps: uc.currentSteps,
    ratingFrequency: uc.ratingFrequency,
    ratingPain: uc.ratingPain,
    ratingDataAvailability: uc.ratingDataAvailability,
    ratingRisk: uc.ratingRisk,
    ratingOwnershipClarity: uc.ratingOwnershipClarity,
    ratingEvaluationClarity: uc.ratingEvaluationClarity,
    ratingMaintenanceBurden: uc.ratingMaintenanceBurden,
    functionalLeaderSuccess: uc.functionalLeaderSuccess,
    gateNamed: uc.gateNamed,
    gateTool: uc.gateTool,
    gateAdoption: uc.gateAdoption,
    adoptionEvidence: uc.adoptionEvidence,
    gateOwner: uc.gateOwner,
    successCriterion: uc.successCriterion,
    successCriterionMet: uc.successCriterionMet,
    buildHours: uc.buildHours,
    baselineMetric: uc.baselineMetric,
    baselineValue: uc.baselineValue,
    baselineUnit: uc.baselineUnit,
    postValue: uc.postValue,
    measurementMethod: uc.measurementMethod,
    netImpactStatement: uc.netImpactStatement,
    isPositive: uc.isPositive,
    roiStatus: uc.roiStatus,
    revisitOn: uc.revisitOn,
  };
}

/**
 * Expand a validated sparse create into the full insert row (minus authors and
 * urls, which live in their own tables and are inserted separately). Defaults
 * are the emptiest honest values.
 */
export function applyCreateDefaults(
  input: UseCaseCreateInput,
  ctx: {
    source: UcSource;
    createdById: string;
    actorRole: Role;
    /** Roster check of the resolved owner; null when there is no linked owner. */
    ownerIsLead: boolean | null;
  },
) {
  return {
    title: input.title,
    description: input.description,
    department: input.department ?? null,
    teamId: input.teamId ?? null,
    eltOrgId: input.eltOrgId ?? null,
    ownerPersonId: input.owner?.personId ?? null,
    ownerUserId: input.owner?.userId ?? null,
    ownerName: input.owner?.displayName ?? null,
    aiTools: input.aiTools ?? [],
    approaches: input.approaches ?? [],
    source: ctx.source,
    currentSteps: input.currentSteps ?? [],
    ratingFrequency: input.ratingFrequency ?? null,
    ratingPain: input.ratingPain ?? null,
    ratingDataAvailability: input.ratingDataAvailability ?? null,
    ratingRisk: input.ratingRisk ?? null,
    ratingOwnershipClarity: input.ratingOwnershipClarity ?? null,
    ratingEvaluationClarity: input.ratingEvaluationClarity ?? null,
    ratingMaintenanceBurden: input.ratingMaintenanceBurden ?? null,
    functionalLeaderSuccess: input.functionalLeaderSuccess ?? null,
    gateNamed: input.gateNamed ?? false,
    gateTool: input.gateTool ?? false,
    gateAdoption: input.gateAdoption ?? false,
    adoptionEvidence: input.adoptionEvidence ?? null,
    gateOwner: input.gateOwner ?? false,
    successCriterion: input.successCriterion ?? null,
    successCriterionMet: input.successCriterionMet ?? ("not_yet" as const),
    buildHours: input.buildHours ?? null,
    baselineMetric: input.baselineMetric ?? null,
    baselineValue: input.baselineValue ?? null,
    baselineUnit: input.baselineUnit ?? null,
    postValue: input.postValue ?? null,
    measurementMethod: input.measurementMethod ?? null,
    netImpactStatement: input.netImpactStatement ?? null,
    isPositive: input.isPositive ?? null,
    roiStatus: input.roiStatus ?? ("not_yet_measurable" as const),
    revisitOn: input.revisitOn ?? null,
    // Typed by the schema as a settable status — TypeScript enforces that
    // the admin-gated statuses can't arrive here; no cast to hide behind.
    status: input.status ?? "in_discovery",
    createdById: ctx.createdById,
    // Program membership is settled here, once, from whose record it is —
    // the owner's roster standing, falling back to the logger's role — and
    // never from `input`. It is deliberately absent from useCaseCreateSchema:
    // UPDATE_PATCHABLE_KEYS is derived from that schema, so a field there
    // would let every record's editor flip its own membership.
    inProgram: inProgramAtCreation(ctx.ownerIsLead, ctx.actorRole),
  };
}
