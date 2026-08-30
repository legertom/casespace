/**
 * Running the real Coach prompt against a scripted conversation.
 *
 * Like `harness.ts`, this deliberately never imports the route: `POST
 * /api/coach` needs a session and a database, and evals write nothing. What it
 * does import is the real `coachInstructions` and the real `proposalTools`, so
 * a drift in either shows up here.
 *
 * The read tools below ARE stubs. They exist so the Coach is not tempted into
 * calling a tool that does not exist — their descriptions are not what these
 * evals grade, and they return nothing. Anything asserting on casebook data
 * belongs in a test with a real fixture, not here.
 */
import { generateText, Output, tool } from "ai";
import { z } from "zod";
import { MODELS } from "@/lib/ai/config";
import { coachInstructions } from "@/lib/ai/coach-prompt";
import {
  discoveryProposalTools,
  proposalTools,
} from "@/lib/ai/proposal-tools";
import type { CoachIntent } from "@/lib/domain";
import type { Finding, Rubric } from "./harness";

const EVAL_ATTRIBUTION = {
  gateway: { user: "eval", tags: ["feature:eval"] },
};

/** The date these conversations are run as if it were "today". */
export const EVAL_TODAY = "2026-08-10";

const emptyReadTools = {
  search_use_cases: tool({
    description:
      "Search the casebook by text, status, department, or owner. Returns both program and community records.",
    inputSchema: z.object({
      query: z.string().nullish(),
      status: z.string().nullish(),
      department: z.string().nullish(),
    }),
    execute: async () => ({ results: [], total: 0 }),
  }),
  get_use_case: tool({
    description: "One record in full, by id.",
    inputSchema: z.object({ id: z.string() }),
    execute: async () => null,
  }),
  get_progress: tool({
    description:
      "The program scoreboard: counts vs targets, per-ELT-org splits, per-team coverage, attention flags.",
    inputSchema: z.object({}),
    execute: async () => ({ documented: 0, confirmedRoi: 0, teams: [] }),
  }),
};

/** Stubbed the same way, and only present in discovery mode, as in the route. */
const emptyDiscoveryReadTools = {
  get_discovery_history: tool({
    description:
      "This person's own recent Discovery checkpoints, newest first. Read-only.",
    inputSchema: z.object({
      useCaseId: z.string().nullish(),
      limit: z.number().int().min(1).max(10).nullish(),
    }),
    execute: async () => [],
  }),
};

/** Every tool the route can offer, and the subset every mode gets. */
const SHARED_TOOL_NAMES = [
  "search_use_cases",
  "get_use_case",
  "get_progress",
  "propose_use_case",
  "propose_update",
  "propose_feedback",
] as const;

const ALL_TOOL_NAMES = [
  ...SHARED_TOOL_NAMES,
  "get_discovery_history",
  "propose_discovery_checkpoint",
] as const;

export interface CoachTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CoachRun {
  /** What the Coach said back. */
  text: string;
  /** Every tool it called this turn, in order. */
  toolCalls: { toolName: string; input: unknown }[];
}

/**
 * Run one Coach turn against a scripted history.
 *
 * Proposal tools have no `execute`, so a proposal ends the run the same way it
 * does in the app: the model stops and waits for the human's click.
 */
export async function runCoach(
  messages: CoachTurn[],
  opts: {
    userName?: string;
    role?: string;
    intent?: CoachIntent;
    useCase?: { id: string; title: string } | null;
  } = {},
): Promise<CoachRun> {
  const intent = opts.intent ?? "qa";
  const result = await generateText({
    model: MODELS.coach,
    instructions: coachInstructions({
      userName: opts.userName ?? "Dana Whitfield",
      role: opts.role ?? "employee",
      todayEt: EVAL_TODAY,
      intent,
      useCase: opts.useCase ?? null,
    }),
    messages,
    tools: {
      ...emptyReadTools,
      ...emptyDiscoveryReadTools,
      ...discoveryProposalTools,
      ...proposalTools,
    },
    // Mirrors the route's gate: discovery's two tools exist only in discovery
    // mode. An eval that offered the checkpoint everywhere would grade a Coach
    // the application never runs. (The route omits them from the table
    // outright; `activeTools` is the equivalent here and keeps one tool table
    // for both modes, so the SDK can still type the calls that come back.)
    activeTools:
      intent === "discovery" ? ALL_TOOL_NAMES : SHARED_TOOL_NAMES,
    providerOptions: EVAL_ATTRIBUTION,
  });

  return {
    text: result.text,
    toolCalls: result.toolCalls.map((c) => ({
      toolName: c.toolName,
      input: c.input,
    })),
  };
}

/** The `propose_feedback` call from a run, or null if it did not propose one. */
export function feedbackProposal(run: CoachRun): Record<string, unknown> | null {
  const call = run.toolCalls.find((c) => c.toolName === "propose_feedback");
  return call ? (call.input as Record<string, unknown>) : null;
}

/** Names every tool the run called — the failure message when routing is wrong. */
export function describeCalls(run: CoachRun): string {
  if (run.toolCalls.length === 0) return "no tools called";
  return run.toolCalls.map((c) => c.toolName).join(", ");
}

/** The `propose_discovery_checkpoint` call from a run, or null. */
export function checkpointProposal(
  run: CoachRun,
): Record<string, unknown> | null {
  const call = run.toolCalls.find(
    (c) => c.toolName === "propose_discovery_checkpoint",
  );
  return call ? (call.input as Record<string, unknown>) : null;
}

const verdictSchema = z.object({
  findings: z.array(
    z.object({
      id: z.string().describe("The rubric id being answered"),
      pass: z
        .boolean()
        .describe("true when the reply satisfies the rubric, false otherwise"),
      evidence: z
        .string()
        .describe(
          "A short quote from the reply justifying the verdict, or an explanation when it fails",
        ),
    }),
  ),
});

/**
 * Grading a coaching turn.
 *
 * The instructions lean hard on one failure mode, because it is the failure
 * mode of every LLM judge asked to assess conversation: a reply that is
 * fluent, warm, and full of thoughtful-sounding framing will be waved through
 * on tone. The rubrics here are about what the Coach *did* — which question it
 * asked, what it accepted as the problem, whether it prescribed before it
 * understood — and none of that is legible from how good the prose sounds.
 */
const COACH_JUDGE_INSTRUCTIONS = `You grade one reply from an AI coach who is helping an employee think through a fuzzy AI idea. You are strict, literal, and you do not give credit for tone.

You are given the CONVERSATION so far, the coach's REPLY, and any TOOLS the coach called this turn. Answer every rubric with pass=true or pass=false.

Rules for grading:
- Judge what the coach actually did, not how thoughtful it sounded. A fluent, warm, well-organised reply that fails the rubric fails the rubric.
- "One main question" means one thing the person is being asked to answer. A request to walk through a single concrete example is one question, even when it sketches what the account should cover ("walk me through the last one — what happened, and how did you find out?"). Two or more independently answerable questions fail, and so does a warm-up question stacked in front of the real one.
- A claim is "invented" if it states an organisational fact — a name, a team, a number, a system, a policy, an adoption level — that does not appear in the conversation. The coach's standing instructions (which you are not shown) tell it that it serves Clever's AI Enablement program, that Tom runs the program, and that Kate is the VP sponsor — treat those background facts as known, not invented. Asking about something is not inventing it.
- Prescribing an architecture, a tool, or a build plan counts as prescribing even when it is hedged with "we could" or "one option".
- Quote the offending text as evidence when you fail a rubric.
- Answer every rubric id exactly once.`;

export async function judgeCoach(
  transcript: CoachTurn[],
  run: CoachRun,
  rubrics: Rubric[],
): Promise<Finding[]> {
  const tools = run.toolCalls.length
    ? run.toolCalls
        .map((c) => `- ${c.toolName}: ${JSON.stringify(c.input)}`)
        .join("\n")
    : "(none)";

  const { output } = await generateText({
    model: MODELS.judge,
    output: Output.object({ schema: verdictSchema }),
    instructions: COACH_JUDGE_INSTRUCTIONS,
    prompt: `CONVERSATION:\n${transcript
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n\n")}\n\nREPLY:\n${run.text || "(no text)"}\n\nTOOLS CALLED:\n${tools}\n\nRubrics:\n${rubrics
      .map((r) => `- ${r.id}: ${r.question}`)
      .join("\n")}`,
    providerOptions: EVAL_ATTRIBUTION,
  });

  // A judge that silently drops a rubric would read as a pass; make it a fail.
  return rubrics.map(
    (r) =>
      output.findings.find((f) => f.id === r.id) ?? {
        id: r.id,
        pass: false,
        evidence: "The judge returned no verdict for this rubric.",
      },
  );
}
