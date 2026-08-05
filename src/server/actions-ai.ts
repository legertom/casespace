"use server";

import { generateText, Output } from "ai";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { teams } from "@/db/schema";
import {
  AI_NOT_CONFIGURED_MESSAGE,
  MODELS,
  aiConfigured,
  gatewayOptions,
} from "@/lib/ai/config";
import {
  proposalSchema,
  proposalToCreateInput,
  type Proposal,
} from "@/lib/ai/proposal";
import { recordAiUsage } from "@/lib/ai/usage";
import { requireUser } from "@/lib/current-user";
import { computeGapFlags } from "@/lib/gap-flags";
import { canCreateUseCase } from "@/lib/permissions";
import type { Department } from "@/lib/domain";
import type { UseCaseCreateInput, UseCaseUpdateInput } from "@/lib/use-case-input";
import {
  createUseCase,
  ForbiddenError,
  NotFoundError,
  updateUseCase,
} from "./use-case-service";

async function resolveTeamId(
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

export interface ParseNotesResult {
  proposal?: Proposal;
  gaps?: string[];
  error?: string;
}

/**
 * Door 2 — parse freeform notes into a pre-filled draft with gap flags.
 * Extraction only pre-fills what it can defend; the human reviews before
 * anything saves.
 */
export async function parseNotesAction(notes: string): Promise<ParseNotesResult> {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) {
    return { error: "Viewers can't log use cases — ask your team's AI Lead." };
  }
  if (!aiConfigured()) return { error: AI_NOT_CONFIGURED_MESSAGE };
  const trimmed = notes.trim();
  if (trimmed.length < 20) {
    return { error: "Paste a bit more — a sentence or two at minimum." };
  }

  try {
    const result = await generateText({
      model: MODELS.extract,
      output: Output.object({ schema: proposalSchema }),
      instructions: `Extract a use-case record from the notes for Clever's AI Enablement ledger.
Rules:
- Only fill fields the notes actually support. Leave everything else null/empty.
- NEVER invent numbers, names, or dates. If ROI numbers aren't in the notes, leave them null and set roiStatus to "not_yet_measurable".
- People fields take full names exactly as written in the notes.
- Departments: business_operations, product_design, engineering, people, css (customer support & services), mss (marketing, sales & school success), finance_legal. Only set one if the notes make it clear.
- "currentSteps" is the existing workflow as an ordered list, only if the notes describe it.
- Keep the description in plain language, 1–3 sentences.`,
      prompt: trimmed,
      providerOptions: gatewayOptions(user.id, "notes_parser"),
    });

    await recordAiUsage({
      userId: user.id,
      feature: "notes_parser",
      model: MODELS.extract,
      inputTokens: result.totalUsage.inputTokens,
      outputTokens: result.totalUsage.outputTokens,
    });

    const proposal = result.output;
    const gaps = computeGapFlags(proposalToCreateInput(proposal));
    return { proposal, gaps };
  } catch (err) {
    console.error("notes parsing failed", err);
    return {
      error:
        "Couldn't parse those notes just now. You can try again, or fall back to the form.",
    };
  }
}

export interface AcceptResult {
  id?: string;
  error?: string;
}

/** The human clicked "Log it" on a proposal card — the one and only write path. */
export async function acceptProposalAction(
  raw: unknown,
  source: "wizard" | "notes",
): Promise<AcceptResult> {
  const user = await requireUser();
  const parsed = proposalSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "That proposal is missing its required title or description." };
  }
  const input: UseCaseCreateInput = proposalToCreateInput(parsed.data);
  input.teamId = await resolveTeamId(parsed.data.team, parsed.data.department);
  try {
    const id = await createUseCase(
      { id: user.id, role: user.role },
      input,
      source,
    );
    return { id };
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    console.error(err);
    return { error: "Couldn't save the record. Try again." };
  }
}

/** The human accepted a proposed edit. Only the proposed fields change. */
export async function acceptUpdateProposalAction(
  id: string,
  rawChanges: unknown,
): Promise<AcceptResult> {
  const user = await requireUser();
  const parsed = proposalSchema.partial().safeParse(rawChanges);
  if (!parsed.success) return { error: "That proposal didn't validate." };
  const c = parsed.data;

  const patch: UseCaseUpdateInput = {};
  if (c.title) patch.title = c.title;
  if (c.description) patch.description = c.description;
  if ("department" in c) patch.department = c.department ?? null;
  if ("team" in c)
    patch.teamId = await resolveTeamId(c.team, c.department ?? null);
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
  if ("approach" in c) patch.approach = c.approach ?? null;
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
  // Note: status is deliberately ignored — status moves through the logged
  // transition controls, never through edit proposals.

  try {
    await updateUseCase({ id: user.id, role: user.role }, id, patch);
    return { id };
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof NotFoundError)
      return { error: err.message };
    console.error(err);
    return { error: "Couldn't apply the update. Try again." };
  }
}
