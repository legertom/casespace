/**
 * The three proposal tools, declared once.
 *
 * None of them has an `execute`: a proposal is a card the human accepts, edits,
 * or dismisses, and their click is the tool result. That makes these pure
 * declarations — no database, no session — which is why they live here rather
 * than inline in the Coach route.
 *
 * The descriptions are the thing the model routes on, so the evals import this
 * table instead of restating it. An eval that redeclared these would grade a
 * copy and pass while production drifted.
 */
import { tool } from "ai";
import { discoveryCheckpointSchema } from "./discovery";
import { feedbackProposalSchema } from "./feedback-proposal";
import { proposalSchema, updateProposalSchema } from "./proposal";

export const proposalTools = {
  propose_use_case: tool({
    description:
      "Propose a new use-case record for the human to review. Use once you have at least a title and description; include everything else you learned. The human's decision comes back as the tool result.",
    inputSchema: proposalSchema,
  }),

  propose_update: tool({
    description:
      "Propose changes to an existing use case for the human to review. Only include the fields that change. The human's decision comes back as the tool result.",
    inputSchema: updateProposalSchema,
  }),

  propose_feedback: tool({
    description:
      "Propose a product-feedback report about Casespace itself — a bug, a gap, something confusing, or a change someone wants in the tool. Not for anything about a use-case record; that is propose_update. Ask what they were doing and what they expected before proposing. The human's decision comes back as the tool result.",
    inputSchema: feedbackProposalSchema,
  }),
};

/**
 * Discovery's own proposal, offered only when the conversation's intent is
 * `discovery` — gated at the tool table, the same way `get_coach_learnings`
 * is, because a tool the Coach cannot see is a tool it cannot be talked into
 * calling. A wizard chat has no business producing checkpoints.
 *
 * Like the three above it has no `execute`, so the model cannot save one. The
 * human's click on the card is the tool result, and the four outcomes it can
 * return live in lib/ai/decision.
 */
export const discoveryProposalTools = {
  propose_discovery_checkpoint: tool({
    description:
      "Propose a Discovery Checkpoint — a snapshot of what this conversation worked out and what to do next — for the human to review. Call it once the problem can be stated more usefully than it arrived, the dominant constraint or key uncertainty is reasonably clear, and there is a specific next action likely to produce new information. Do not keep asking questions to fill in optional fields, and do not propose one just to end the conversation. Nothing is saved until the human clicks; their decision comes back as the tool result.",
    inputSchema: discoveryCheckpointSchema,
  }),
};
