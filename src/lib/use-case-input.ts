/**
 * Shared input validation for creating/updating use cases across all doors:
 * web form, wizard, notes parser, REST API, and MCP.
 *
 * Sparse is safe: only title + description are required to create. Everything
 * else defaults to the emptiest honest value. A half-filled record that
 * exists beats a perfect record that doesn't.
 */
import { z } from "zod";
import { DEPARTMENTS, STATUSES } from "./domain";

const rating = z.number().int().min(1).max(5);

/** Statuses a non-admin write may set. Qualified only via the admin gate. */
const settableStatus = z.enum(
  STATUSES.filter((s) => s !== "qualified") as [string, ...string[]],
);

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

  aiTools: z.array(z.string().trim().min(1)).max(20).optional(),
  approach: z.enum(["prompt", "automation", "agentic"]).nullish(),

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

  baselineMetric: z.string().trim().nullish(),
  baselineValue: z.number().finite().nullish(),
  baselineUnit: z.string().trim().nullish(),
  postValue: z.number().finite().nullish(),
  measurementMethod: z.string().trim().nullish(),
  netImpactStatement: z.string().trim().nullish(),
  isPositive: z.boolean().nullish(),
  roiStatus: z.enum(["not_yet_measurable", "in_progress", "complete"]).optional(),
  revisitOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullish(),

  status: settableStatus.optional(),
});

export type UseCaseCreateInput = z.infer<typeof useCaseCreateSchema>;

/** Every field editable after creation; all optional (patch semantics). */
export const useCaseUpdateSchema = useCaseCreateSchema.partial();

export type UseCaseUpdateInput = z.infer<typeof useCaseUpdateSchema>;

export type UcSource = "form" | "wizard" | "notes" | "api" | "mcp";

/**
 * Expand a validated sparse create into the full insert row (minus authors,
 * which are inserted separately). Defaults are the emptiest honest values.
 */
export function applyCreateDefaults(
  input: UseCaseCreateInput,
  ctx: { source: UcSource; createdById: string },
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
    approach: input.approach ?? null,
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
    baselineMetric: input.baselineMetric ?? null,
    baselineValue: input.baselineValue ?? null,
    baselineUnit: input.baselineUnit ?? null,
    postValue: input.postValue ?? null,
    measurementMethod: input.measurementMethod ?? null,
    netImpactStatement: input.netImpactStatement ?? null,
    isPositive: input.isPositive ?? null,
    roiStatus: input.roiStatus ?? ("not_yet_measurable" as const),
    revisitOn: input.revisitOn ?? null,
    status: (input.status ?? "in_discovery") as
      | "in_discovery"
      | "approved_by_fl"
      | "under_construction"
      | "in_testing"
      | "launched",
    createdById: ctx.createdById,
  };
}
