/**
 * The Discovery Checkpoint — what a Discovery conversation produces.
 *
 * A use case is the work being tracked. A checkpoint is a snapshot of what was
 * understood while reasoning about the work, and the two are not the same
 * thing: most Discovery conversations should end with a checkpoint and no
 * record at all, because the honest next step is an inventory, a conversation,
 * or a permission request rather than a workflow to document.
 *
 * Checkpoints are append-only. When someone comes back with what they learned,
 * the second checkpoint sits beside the first rather than overwriting it —
 * "we need to define the information requirements" → "75% of it is in Gong,
 * test extraction" → "the rest is promises only sales knows about" is the
 * learning history of the project, and it is the part worth keeping.
 *
 * Every string is bounded. The model writes these fields, a human reads them
 * on a card, and an unbounded field is a way for one turn to fill a page.
 */
import { z } from "zod";
import { DISCOVERY_CONSTRAINTS } from "@/lib/domain";

/** Room for a real sentence, not for an essay. Cards are meant to be scanned. */
const LIMITS = {
  title: 120,
  short: 400,
  long: 800,
  question: 240,
} as const;

export const MAX_UNRESOLVED_QUESTIONS = 5;

export const discoveryCheckpointSchema = z.object({
  workingTitle: z
    .string()
    .min(1)
    .max(LIMITS.title)
    .describe(
      "A short name for the problem as it now stands, not as it arrived. Six or seven words.",
    ),

  statedProblem: z
    .string()
    .max(LIMITS.short)
    .nullish()
    .describe(
      "How the person framed it at the start, in their words. Omit when the framing never changed — the card only shows this to mark a shift.",
    ),
  refinedProblem: z
    .string()
    .min(1)
    .max(LIMITS.long)
    .describe(
      "What you now believe is actually being solved, stated more usefully than at the start. This is the point of the conversation; if it reads the same as statedProblem, the conversation is not finished.",
    ),

  baseline: z
    .string()
    .max(LIMITS.short)
    .nullish()
    .describe(
      "What happens today if nothing changes — the counterfactual the AI would be measured against. Only what the person told you.",
    ),
  failurePoint: z
    .string()
    .max(LIMITS.short)
    .nullish()
    .describe(
      "Where the current process actually breaks: the delay, the neglect, the rework, the late discovery. Omit if it is still unknown.",
    ),

  dominantConstraint: z
    .enum(DISCOVERY_CONSTRAINTS)
    .describe(
      "What currently prevents sensible progress. Do not default to a technical constraint. Use 'unclear' when the conversation genuinely has not established one — a checkpoint whose next step is finding out is a good checkpoint.",
    ),
  dominantConstraintDetail: z
    .string()
    .min(1)
    .max(LIMITS.long)
    .describe(
      "Why that is the constraint, grounded in what was actually said. Name a second co-dominant constraint here rather than forcing a choice. Never invent evidence.",
    ),

  nextAction: z
    .string()
    .min(1)
    .max(LIMITS.long)
    .describe(
      "The smallest useful thing to do next. Not necessarily building: an inventory, a conversation, a permission request, mapping a process, inspecting examples, or a tiny prototype are all valid, and so is deciding AI does not help here.",
    ),
  expectedLearning: z
    .string()
    .min(1)
    .max(LIMITS.long)
    .describe(
      "What we will know after doing it that we do not know now. If this cannot be answered, the next action is activity rather than learning — pick a different one.",
    ),
  whyThisStep: z
    .string()
    .min(1)
    .max(LIMITS.long)
    .describe(
      "Why this step rather than the obvious alternative — why build now, or why not yet.",
    ),

  owner: z
    .string()
    .max(LIMITS.title)
    .nullish()
    .describe(
      "Who will do it, if a name was actually said. Never guess a name, and never assume it is the person you are talking to.",
    ),
  returnCondition: z
    .string()
    .max(LIMITS.short)
    .nullish()
    .describe(
      "What should be true when they come back to this. Omit rather than inventing a date.",
    ),

  unresolvedQuestions: z
    .array(z.string().min(1).max(LIMITS.question))
    .max(MAX_UNRESOLVED_QUESTIONS)
    .default([])
    .describe(
      "The questions still open, shortest list that is honest. Not a worksheet of everything unasked.",
    ),
});

export type DiscoveryCheckpoint = z.infer<typeof discoveryCheckpointSchema>;

/**
 * Whether the refined problem actually says something new.
 *
 * Not enforced by the schema — a model that fails this should be told, not
 * silently rejected mid-conversation — but the card uses it to decide whether
 * showing "Started as" adds anything.
 */
export function reframedTheProblem(c: {
  statedProblem?: string | null;
  refinedProblem: string;
}): boolean {
  const stated = c.statedProblem?.trim();
  if (!stated) return false;
  return stated.toLowerCase() !== c.refinedProblem.trim().toLowerCase();
}
