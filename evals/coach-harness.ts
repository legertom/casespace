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
import { generateText, isStepCount, Output, tool } from "ai";
import { z } from "zod";
import { MODELS } from "@/lib/ai/config";
import { coachInstructions } from "@/lib/ai/coach-prompt";
import {
  COURSE_TOOL_DESCRIPTION,
  courseToolInputSchema,
  courseTools,
} from "@/lib/ai/course-tools";
import type { CourseSuggestion } from "@/lib/ai/courses";
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

const DISCOVERY_TOOL_NAMES = [
  ...SHARED_TOOL_NAMES,
  "get_discovery_history",
  "propose_discovery_checkpoint",
] as const;

const WIZARD_TOOL_NAMES = [...SHARED_TOOL_NAMES, "suggest_courses"] as const;

export interface CoachTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CoachRun {
  /** What the Coach said back. */
  text: string;
  /** Every tool it called this turn, in order. */
  toolCalls: { toolName: string; input: unknown }[];
  /**
   * What `suggest_courses` handed back, or null when it was never called.
   *
   * Captured rather than recomputed, because the question these evals exist to
   * ask — did the Coach name a course nobody gave it — is only answerable
   * against what the tool actually returned on this run.
   */
  courseResults: CourseSuggestion[] | null;
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
    /**
     * Force `suggest_courses` to return nothing, whatever it is asked.
     *
     * The empty result is the behaviour worth grading hardest and the hardest
     * to provoke honestly: what comes back depends on arguments the model
     * chooses, so a fixture written to score zero can be rescued by a model
     * that describes it generously. Stubbing the return puts the Coach in the
     * situation directly and asks what it does there.
     */
    courses?: "real" | "empty";
  } = {},
): Promise<CoachRun> {
  const intent = opts.intent ?? "qa";

  // Declared for every mode and exposed only to the wizard, below — one tool
  // table keeps the SDK able to type the calls that come back.
  let courseResults: CourseSuggestion[] | null = null;
  const wizardTools =
    opts.courses === "empty"
      ? {
          suggest_courses: tool({
            description: COURSE_TOOL_DESCRIPTION,
            inputSchema: courseToolInputSchema,
            execute: () => {
              courseResults = [];
              return { courses: [] };
            },
          }),
        }
      : courseTools((courses) => {
          courseResults = courses;
        });
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
      ...wizardTools,
    },
    // Mirrors the route's gate: discovery's two tools exist only in discovery
    // mode. An eval that offered the checkpoint everywhere would grade a Coach
    // the application never runs. (The route omits them from the table
    // outright; `activeTools` is the equivalent here and keeps one tool table
    // for both modes, so the SDK can still type the calls that come back.)
    activeTools:
      intent === "discovery"
        ? DISCOVERY_TOOL_NAMES
        : intent === "wizard"
          ? WIZARD_TOOL_NAMES
          : SHARED_TOOL_NAMES,
    // The wizard's course tool is the only one here that runs, so it is the
    // only mode where a turn has a second step to take: the Coach calls it and
    // then has to say something about what came back. Left off elsewhere so
    // every other eval runs exactly the single turn it has always run.
    ...(intent === "wizard" ? { stopWhen: isStepCount(6) } : {}),
    providerOptions: EVAL_ATTRIBUTION,
  });

  return {
    text: result.text,
    toolCalls: result.toolCalls.map((c) => ({
      toolName: c.toolName,
      input: c.input,
    })),
    courseResults,
  };
}

/** The `suggest_courses` call from a run, or null if it did not call it. */
export function courseCall(run: CoachRun): Record<string, unknown> | null {
  const call = run.toolCalls.find((c) => c.toolName === "suggest_courses");
  return call ? (call.input as Record<string, unknown>) : null;
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

/**
 * Grading a course suggestion.
 *
 * A separate frame rather than a widened one: the discovery instructions above
 * spend most of their length on question-stacking and premature architecture,
 * neither of which means anything here, and a judge given rules that do not
 * apply starts inventing ways to apply them. The shared failure mode is the
 * same one, though, so it is restated — a judge asked to assess a
 * recommendation will wave through anything that sounds generous.
 */
export const COURSE_JUDGE_INSTRUCTIONS = `You grade one reply from an AI coach who has just helped an employee file a use case, and may now be recommending free DeepLearning.AI courses to them. You are strict, literal, and you do not give credit for being helpful or encouraging.

You are given the CONVERSATION so far, the coach's REPLY, any TOOLS it called, and — when it called the course tool — the exact list of courses that tool returned. Answer every rubric with pass=true or pass=false.

Rules for grading:
- The returned list is the only thing the coach was permitted to recommend from. A course named in the reply but absent from that list is invented, however real it may sound and however well it may fit. Judge titles by what they refer to, not by exact wording.
- The catalogue carries no durations and no levels, so any statement of how long a course takes or how hard it is was invented — including vague forms like "short", "quick", "you'll get through it in an evening", or "beginner-friendly".
- Judge what the reply did, not how warm it was. A well-organised, enthusiastic, plausible recommendation that fails a rubric fails the rubric.
- When the tool returned an empty list, the correct reply says nothing about courses whatsoever. Naming one anyway fails, and so does explaining that it looked and found nothing.
- Quote the offending text as evidence when you fail a rubric.
- Answer every rubric id exactly once.`;

export async function judgeCoach(
  transcript: CoachTurn[],
  run: CoachRun,
  rubrics: Rubric[],
  opts: { instructions?: string } = {},
): Promise<Finding[]> {
  const tools = run.toolCalls.length
    ? run.toolCalls
        .map((c) => `- ${c.toolName}: ${JSON.stringify(c.input)}`)
        .join("\n")
    : "(none)";

  // Without this the fidelity rubrics are ungradeable: "did it recommend only
  // what it was handed" needs what it was handed.
  const returned =
    run.courseResults === null
      ? ""
      : `\n\nCOURSES THE suggest_courses TOOL RETURNED (the only courses the coach was allowed to name):\n${
          run.courseResults.length === 0
            ? "(none — the tool returned an empty list)"
            : run.courseResults
                .map((c) => `- ${c.title} — ${c.url}`)
                .join("\n")
        }`;

  const { output } = await generateText({
    model: MODELS.judge,
    output: Output.object({ schema: verdictSchema }),
    instructions: opts.instructions ?? COACH_JUDGE_INSTRUCTIONS,
    prompt: `CONVERSATION:\n${transcript
      .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
      .join("\n\n")}\n\nREPLY:\n${run.text || "(no text)"}\n\nTOOLS CALLED:\n${tools}${returned}\n\nRubrics:\n${rubrics
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
