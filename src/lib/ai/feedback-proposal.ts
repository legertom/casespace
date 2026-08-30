import { z } from "zod";
import type { Role } from "@/lib/domain";

/**
 * Product feedback about Casespace itself, drafted by the Coach and filed only
 * once a human clicks.
 *
 * The Coach fills discrete fields rather than one prose blob, and `composeFeedback`
 * — not the model — decides how the stored message reads. That split is the point.
 * An admin scanning /feedback has to be able to tell the reporter's account from
 * the Coach's inference, and neither should be able to wear the other's voice
 * because of how a sentence was phrased.
 *
 * `reporterRole` is deliberately NOT a field here. The server knows the role from
 * the session; asking the model for it would invent a claim that could be talked
 * into being wrong, on the one line an admin reads as fact.
 */

export const FEEDBACK_KINDS = ["bug", "gap", "request", "confusion"] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

/** How the Coach's read renders in the filed message, and on the card. */
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "looks like a bug",
  gap: "looks like a missing capability",
  request: "reads as a feature request",
  confusion: "reads as confusion about how it works",
};

/**
 * How the reporter is described in the filed message. Roles read in the
 * program's own words — "contributor" is an AI Lead everywhere a person can
 * see it.
 */
const REPORTER_LABELS: Record<Role, string> = {
  admin: "an admin",
  contributor: "an AI Lead",
  employee: "someone at Clever",
  viewer: "a signed-in guest",
};

export const feedbackProposalSchema = z.object({
  summary: z
    .string()
    .min(1)
    .describe(
      "One line naming the problem or request, specific enough to scan in a list. Not 'bug on the dashboard'.",
    ),
  whatHappened: z
    .string()
    .min(1)
    .describe(
      "What the person was doing and what actually happened, in their terms. Include the steps if they gave them.",
    ),
  expected: z
    .string()
    .nullish()
    .describe("What they expected instead. Omit if they did not say."),
  area: z
    .string()
    .nullish()
    .describe(
      "The page or feature it concerns — a route like /graphs when you know it, otherwise a feature name. Never guess a route.",
    ),
  kind: z
    .enum(FEEDBACK_KINDS)
    .nullish()
    .describe(
      "Your own read of what this is, to help admins triage. Omit when the report is too thin to tell.",
    ),
});

export type FeedbackProposal = z.infer<typeof feedbackProposalSchema>;

/**
 * The stored row: a structured report, then one trailer line saying where it
 * came from. The trailer is what keeps the Coach's inference from reading as
 * the reporter's own words.
 */
export function composeFeedback(
  proposal: FeedbackProposal,
  reporterRole: Role,
): { message: string; path: string | null } {
  const lines = [
    proposal.summary.trim(),
    "",
    `What happened: ${proposal.whatHappened.trim()}`,
  ];

  const expected = proposal.expected?.trim();
  if (expected) lines.push(`Expected: ${expected}`);

  const read = proposal.kind
    ? ` Coach's read: ${FEEDBACK_KIND_LABELS[proposal.kind]}.`
    : "";
  lines.push("", `— Filed through the Coach by ${REPORTER_LABELS[reporterRole]}.${read}`);

  return {
    message: lines.join("\n"),
    path: proposal.area?.trim() || null,
  };
}
