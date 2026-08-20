/**
 * The proposal shape the Coach's tools emit and the notes parser produces.
 * Names (not ids) for people and teams — the server resolves links on accept,
 * and the form pickers re-link when the human edits first.
 */
import { z } from "zod";
import { APPROACHES, DEPARTMENTS, SETTABLE_STATUSES } from "@/lib/domain";
import {
  useCaseUrlSchema,
  type UseCaseCreateInput,
} from "@/lib/use-case-input";

const rating = z
  .number()
  .int()
  .min(1)
  .max(5)
  .nullish()
  .describe("1 (low) to 5 (high); omit if unknown");

export const proposalSchema = z.object({
  title: z.string().min(1),
  description: z
    .string()
    .min(1)
    .describe("What the workflow does, in plain language"),
  department: z.enum(DEPARTMENTS).nullish(),
  team: z.string().nullish().describe("Team name as the program knows it"),
  authors: z
    .array(z.string())
    .max(20)
    .default([])
    .describe("Full names of the people who built it"),
  owner: z
    .string()
    .nullish()
    .describe("Full name of the one person responsible going forward"),
  aiTools: z
    .array(z.string())
    .max(20)
    .default([])
    .describe("Which tools it uses by name — Claude, ChatGPT, Zapier, Cursor"),
  /**
   * Shares useCaseUrlSchema with every other door, deliberately: accepting a
   * proposal goes straight to createUseCase without touching
   * useCaseCreateSchema, so a lenient shape here would be the one way a
   * javascript: URL could reach a page every authenticated user reads.
   */
  urls: useCaseUrlSchema
    .array()
    .max(20)
    .default([])
    .describe(
      "Where to find the thing itself: the live tool, the repo, the Claude artifact, project, or skill. http(s) only. Only URLs the human actually gave — never invented, never guessed from a name.",
    ),
  approaches: z
    .array(z.enum(APPROACHES))
    .max(APPROACHES.length)
    .default([])
    .describe(
      "All that apply. prompt/automation/agentic: AI does the work at runtime. built: AI (e.g. Claude Code) built the tool, which may or may not run AI itself. Empty if the notes don't say.",
    ),
  currentSteps: z
    .array(z.string())
    .max(50)
    .default([])
    .describe("The existing workflow, ordered start to finish"),
  ratingFrequency: rating,
  ratingPain: rating,
  ratingDataAvailability: rating,
  ratingRisk: rating,
  ratingOwnershipClarity: rating,
  ratingEvaluationClarity: rating,
  ratingMaintenanceBurden: rating,
  functionalLeaderSuccess: z.string().nullish(),
  // The four gates decide whether a record counts as documented. Only ever
  // true when the human confirmed it — an admin reading the record later
  // cannot tell a confirmed tick from a guessed one.
  gateNamed: z
    .boolean()
    .nullish()
    .describe(
      "Gate: the title names one specific workflow and the description explains it plainly. Only if the human confirmed it.",
    ),
  gateTool: z
    .boolean()
    .nullish()
    .describe(
      "Gate: which AI tool does the work, and how it's applied, are both on the record. Only if the human confirmed it.",
    ),
  gateAdoption: z
    .boolean()
    .nullish()
    .describe(
      "Gate: someone beyond the author(s) actively uses it. Only if the human confirmed it — never inferred from enthusiasm.",
    ),
  adoptionEvidence: z
    .string()
    .nullish()
    .describe("Who beyond the authors uses it, and how we know"),
  gateOwner: z
    .boolean()
    .nullish()
    .describe(
      "Gate: exactly one named person is responsible going forward. Only if the human confirmed it.",
    ),
  successCriterion: z
    .string()
    .nullish()
    .describe("The measurable definition of success"),
  successCriterionMet: z
    .enum(["yes", "no", "not_yet"])
    .nullish()
    .describe("Whether the success criterion has actually been met yet"),
  buildHours: z
    .number()
    .min(0)
    .nullish()
    .describe(
      "Rough hours spent building the workflow — 'took me about a day' is 8. Ask in a conversation; take it from the notes when parsing notes. A rough number is fine, an invented one is not.",
    ),
  baselineMetric: z.string().nullish(),
  baselineValue: z
    .number()
    .nullish()
    .describe("Only a number the human actually gave — never invented"),
  baselineUnit: z.string().nullish(),
  postValue: z.number().nullish(),
  measurementMethod: z
    .string()
    .nullish()
    .describe("Must be the same methodology for baseline and post"),
  netImpactStatement: z.string().nullish(),
  isPositive: z.boolean().nullish(),
  roiStatus: z
    .enum(["not_yet_measurable", "in_progress", "complete"])
    .nullish(),
  revisitOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  // The AI never proposes a record into an admin-gated status — derived from
  // the same SETTABLE_STATUSES constant every other create door validates by.
  status: z.enum(SETTABLE_STATUSES).nullish(),
});

export type Proposal = z.infer<typeof proposalSchema>;

export const updateProposalSchema = z.object({
  id: z.string().describe("The use case id"),
  reason: z.string().describe("One sentence on why this edit"),
  changes: proposalSchema.partial(),
});

export type UpdateProposal = z.infer<typeof updateProposalSchema>;

/**
 * Map a partial proposal to a patch — only the provided keys change. Team
 * name resolution happens at the caller (needs the database). Status is
 * deliberately excluded: status moves through the logged transition flow.
 */
export function proposalPatchToUpdateInput(
  c: Partial<Proposal>,
): import("@/lib/use-case-input").UseCaseUpdateInput {
  const patch: import("@/lib/use-case-input").UseCaseUpdateInput = {};
  if (c.title) patch.title = c.title;
  if (c.description) patch.description = c.description;
  if ("department" in c) patch.department = c.department ?? null;
  if ("authors" in c && c.authors)
    patch.authors = c.authors.map((name) => ({
      personId: null,
      userId: null,
      displayName: name,
    }));
  if ("owner" in c)
    patch.owner = c.owner
      ? { personId: null, userId: null, displayName: c.owner }
      : null;
  if ("aiTools" in c && c.aiTools) patch.aiTools = c.aiTools;
  if ("urls" in c && c.urls) patch.urls = c.urls;
  if ("approaches" in c && c.approaches) patch.approaches = c.approaches;
  if ("currentSteps" in c && c.currentSteps) patch.currentSteps = c.currentSteps;
  for (const k of [
    "ratingFrequency",
    "ratingPain",
    "ratingDataAvailability",
    "ratingRisk",
    "ratingOwnershipClarity",
    "ratingEvaluationClarity",
    "ratingMaintenanceBurden",
  ] as const) {
    if (k in c) patch[k] = c[k] ?? null;
  }
  if ("functionalLeaderSuccess" in c)
    patch.functionalLeaderSuccess = c.functionalLeaderSuccess ?? null;
  for (const k of ["gateNamed", "gateTool", "gateAdoption", "gateOwner"] as const) {
    if (k in c && typeof c[k] === "boolean") patch[k] = c[k];
  }
  if ("adoptionEvidence" in c) patch.adoptionEvidence = c.adoptionEvidence ?? null;
  if ("successCriterion" in c) patch.successCriterion = c.successCriterion ?? null;
  if ("successCriterionMet" in c && c.successCriterionMet)
    patch.successCriterionMet = c.successCriterionMet;
  if ("buildHours" in c) patch.buildHours = c.buildHours ?? null;
  if ("baselineMetric" in c) patch.baselineMetric = c.baselineMetric ?? null;
  if ("baselineValue" in c) patch.baselineValue = c.baselineValue ?? null;
  if ("baselineUnit" in c) patch.baselineUnit = c.baselineUnit ?? null;
  if ("postValue" in c) patch.postValue = c.postValue ?? null;
  if ("measurementMethod" in c)
    patch.measurementMethod = c.measurementMethod ?? null;
  if ("netImpactStatement" in c)
    patch.netImpactStatement = c.netImpactStatement ?? null;
  if ("isPositive" in c) patch.isPositive = c.isPositive ?? null;
  if ("roiStatus" in c && c.roiStatus) patch.roiStatus = c.roiStatus;
  if ("revisitOn" in c) patch.revisitOn = c.revisitOn ?? null;
  return patch;
}

/** Map a proposal to the shared create-input shape (people as display names). */
export function proposalToCreateInput(p: Proposal): UseCaseCreateInput {
  return {
    title: p.title,
    description: p.description,
    department: p.department ?? null,
    teamId: null, // resolved from p.team server-side or by the form picker
    eltOrgId: null,
    authors: (p.authors ?? []).map((name) => ({
      personId: null,
      userId: null,
      displayName: name,
    })),
    owner: p.owner
      ? { personId: null, userId: null, displayName: p.owner }
      : null,
    aiTools: p.aiTools ?? [],
    urls: p.urls ?? [],
    approaches: p.approaches ?? [],
    currentSteps: p.currentSteps ?? [],
    ratingFrequency: p.ratingFrequency ?? null,
    ratingPain: p.ratingPain ?? null,
    ratingDataAvailability: p.ratingDataAvailability ?? null,
    ratingRisk: p.ratingRisk ?? null,
    ratingOwnershipClarity: p.ratingOwnershipClarity ?? null,
    ratingEvaluationClarity: p.ratingEvaluationClarity ?? null,
    ratingMaintenanceBurden: p.ratingMaintenanceBurden ?? null,
    functionalLeaderSuccess: p.functionalLeaderSuccess ?? null,
    // Sparse is safe: gates stay unchecked unless the proposal explicitly
    // established them — the emptiest honest value.
    gateNamed: p.gateNamed ?? false,
    gateTool: p.gateTool ?? false,
    gateAdoption: p.gateAdoption ?? false,
    adoptionEvidence: p.adoptionEvidence ?? null,
    gateOwner: p.gateOwner ?? false,
    successCriterion: p.successCriterion ?? null,
    successCriterionMet: p.successCriterionMet ?? "not_yet",
    buildHours: p.buildHours ?? null,
    baselineMetric: p.baselineMetric ?? null,
    baselineValue: p.baselineValue ?? null,
    baselineUnit: p.baselineUnit ?? null,
    postValue: p.postValue ?? null,
    measurementMethod: p.measurementMethod ?? null,
    netImpactStatement: p.netImpactStatement ?? null,
    isPositive: p.isPositive ?? null,
    roiStatus: p.roiStatus ?? "not_yet_measurable",
    revisitOn: p.revisitOn ?? null,
    status: p.status ?? "in_discovery",
  };
}
