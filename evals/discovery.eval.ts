/**
 * Discovery Coach evals — `pnpm eval`.
 *
 * Discovery's quality is almost entirely conversational judgement. Nothing in
 * `pnpm test` can tell the difference between a Coach that asks "what happens
 * to those items today if nobody touches them?" and one that answers "you'll
 * want a classifier with a confidence threshold" — both compile, both stream,
 * both sound helpful. So the mode's actual behaviour is graded here, against
 * real models, deliberately outside the default test run.
 *
 * The four scenarios are generalised from the shapes these conversations
 * actually take: a proposed AI object standing in for an undefined problem, a
 * buzzword standing in for a workflow, an alerting request standing in for a
 * prioritisation problem, and an existing AI attempt whose real constraint is
 * its input. They are fixtures, not special cases — nothing about them appears
 * in the prompt.
 *
 * `negative control` is the test that fails when the tests stop testing: a
 * reply that is articulate, structured, and wrong on every count, asserted to
 * be rejected. Without it a judge that had drifted into rewarding fluency
 * would show up as a fully green run.
 */
import { describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import { DISCOVERY_CONSTRAINTS } from "@/lib/domain";
import { describeFailures, type Rubric } from "./harness";
import {
  checkpointProposal,
  describeCalls,
  judgeCoach,
  runCoach,
  type CoachRun,
  type CoachTurn,
} from "./coach-harness";

/** Asked of every scenario — the behaviours the mode is for. */
const UNIVERSAL: Rubric[] = [
  {
    id: "not-the-object",
    question:
      "Does the coach avoid treating the AI thing the person named (the agent, dossier, alerts, or existing bot) as the settled definition of the problem?",
  },
  {
    id: "one-question",
    question:
      "Does the reply ask at most one main question, rather than presenting a list of questions?",
  },
  {
    id: "specific-question",
    question:
      "Is the question or point specific to what this person actually said, rather than a generic discovery question that would fit any conversation?",
  },
  {
    id: "no-invention",
    question:
      "Does the reply avoid stating any organisational fact — a name, a team, a number, a system, a policy, an adoption level — that the conversation did not supply?",
  },
  {
    id: "no-use-case-push",
    question:
      "Does the reply avoid pushing the person toward logging or documenting a use case at this point in the conversation?",
  },
  {
    id: "no-premature-architecture",
    question:
      "Does the reply avoid prescribing a technical design, tool, model, or build plan before the problem is understood?",
  },
];

interface Scenario {
  name: string;
  transcript: CoachTurn[];
  rubrics: Rubric[];
}

const SCENARIOS: Scenario[] = [
  {
    name: "account handoff",
    transcript: [
      {
        role: "user",
        content:
          "We need AI to make a better Gong brief for onboarding. The handoffs from sales to onboarding are bad and I think summarising the calls would fix it.",
      },
    ],
    rubrics: [
      {
        id: "information-requirements",
        question:
          "Does the reply move toward understanding the current handoff or what onboarding actually needs to know, rather than toward how a summary would be produced?",
      },
      {
        id: "no-rag-design",
        question:
          "Does the reply avoid proposing a retrieval architecture, a prompt, an embedding or RAG approach, or a new Salesforce field?",
      },
    ],
  },
  {
    name: "agentic platform",
    transcript: [
      {
        role: "user",
        content:
          "We want an agentic integration platform. Right now integrations take forever and I think agents could do most of it.",
      },
    ],
    rubrics: [
      {
        id: "current-workflow-first",
        question:
          "Does the reply try to reconstruct what the integration work actually involves today, rather than designing agents or an architecture?",
      },
      {
        id: "no-multi-agent-design",
        question:
          "Does the reply avoid sketching a multi-agent system, an orchestration layer, or a named framework?",
      },
    ],
  },
  {
    name: "monitoring and alerts",
    transcript: [
      {
        role: "user",
        content:
          "I want Slack alerts for all 400 of our projects so we know when something is going wrong.",
      },
    ],
    rubrics: [
      {
        id: "what-are-we-noticing",
        question:
          "Does the reply ask what the person is trying to notice or act on, or which projects or conditions actually matter, rather than accepting that all 400 need alerts?",
      },
      {
        id: "no-alert-rules",
        question:
          "Does the reply avoid designing notification rules, thresholds, or a Slack integration?",
      },
    ],
  },
  {
    name: "feedback triage",
    transcript: [
      {
        role: "user",
        content:
          "I have about 300 feedback items and my Linear AI agent isn't reliably triaging them. I think I need a better model.",
      },
    ],
    rubrics: [
      {
        id: "baseline-or-input",
        question:
          "Does the reply probe either what happens to those items today without the agent, or what the feedback items actually contain — rather than accepting that the model is the problem?",
      },
      {
        id: "not-just-a-bigger-model",
        question:
          "Does the reply avoid recommending a larger or different model as the fix?",
      },
    ],
  },
];

describe.skipIf(!aiConfigured())("Discovery Coach opening turns", () => {
  for (const scenario of SCENARIOS) {
    it(
      scenario.name,
      async () => {
        const run = await runCoach(scenario.transcript, {
          intent: "discovery",
        });
        const rubrics = [...UNIVERSAL, ...scenario.rubrics];
        const findings = await judgeCoach(scenario.transcript, run, rubrics);
        const failed = findings.filter((f) => !f.pass);
        expect(
          failed,
          `${scenario.name} — tools: ${describeCalls(run)}\n${describeFailures(findings)}\n\nREPLY:\n${run.text}`,
        ).toEqual([]);
      },
      180_000,
    );
  }

  // Discovery does not open by proposing. A checkpoint on turn one would mean
  // it had decided the problem before hearing about it.
  it(
    "does not propose a checkpoint on the first turn",
    async () => {
      const scenario = SCENARIOS[0];
      const run = await runCoach(scenario.transcript, { intent: "discovery" });
      expect(
        checkpointProposal(run),
        `proposed a checkpoint immediately — tools: ${describeCalls(run)}`,
      ).toBeNull();
    },
    180_000,
  );
});

/**
 * A worked conversation, to the point where stopping is right. What is graded
 * is the checkpoint's shape, not its wording: a next action that produces
 * information, a constraint drawn from the app's own list, and no invented
 * owner.
 */
const WORKED: CoachTurn[] = [
  {
    role: "user",
    content:
      "We need AI to make a better Gong brief for onboarding. The handoffs from sales to onboarding are bad.",
  },
  {
    role: "assistant",
    content: "What happens today between the deal closing and the kickoff call?",
  },
  {
    role: "user",
    content:
      "Sales writes a few lines in the CRM, then onboarding reads it and books the kickoff. Half the time the engineer finds out on the call that something was promised that isn't in there.",
  },
  {
    role: "assistant",
    content:
      "When that happens on the call, what does the engineer do about it?",
  },
  {
    role: "user",
    content:
      "They Slack the AE and wait. Sometimes a couple of days. Honestly nobody has ever written down what onboarding needs to know — everyone has their own mental list.",
  },
  {
    role: "assistant",
    content:
      "That last part sounds like the thing in the way. If nobody has written the list down, we can't tell what a brief would have to contain. Do you know whether the missing pieces are usually things a system holds, or things only the AE knows?",
  },
  {
    role: "user",
    content:
      "Mixed. Some of it is definitely in the calls. But the promises are usually just something the AE said and remembers. I think we know enough — what should I actually do next?",
  },
];

describe.skipIf(!aiConfigured())("Discovery checkpoints", () => {
  it(
    "proposes a checkpoint whose next step produces information",
    async () => {
      const run = await runCoach(WORKED, { intent: "discovery" });
      const proposal = checkpointProposal(run);
      expect(
        proposal,
        `no checkpoint proposed — tools: ${describeCalls(run)}\n\nREPLY:\n${run.text}`,
      ).not.toBeNull();

      const c = proposal as Record<string, unknown>;
      expect(DISCOVERY_CONSTRAINTS).toContain(c.dominantConstraint);
      // An owner nobody named is the exact fabrication the schema description
      // warns against, and the one an admin could never spot later.
      expect(c.owner ?? null).toBeNull();

      const findings = await judgeCoach(WORKED, run, [
        {
          id: "reframed",
          question: `Does the checkpoint's refinedProblem state the problem more usefully than "the Gong brief for onboarding needs to be better"? Here it is: ${String(c.refinedProblem)}`,
        },
        {
          id: "learning-not-activity",
          question: `Does this next action produce new information rather than just being work, and does the stated expected learning follow from doing it? Next action: ${String(c.nextAction)} — Expected learning: ${String(c.expectedLearning)}`,
        },
        {
          id: "not-build-the-thing",
          question: `Is this next action something other than "build the summariser/brief/dossier"? Next action: ${String(c.nextAction)}`,
        },
      ]);
      expect(
        findings.filter((f) => !f.pass),
        describeFailures(findings),
      ).toEqual([]);
    },
    180_000,
  );
});

/**
 * The negative control. Every sentence below is competent, calm, and in the
 * Coach's register — and it accepts the proposed object as the problem, asks
 * five questions, invents a team and a number, prescribes an architecture, and
 * pushes toward logging a use case. If the judge passes any of these rubrics,
 * the judge is grading tone.
 */
const FLUENT_BUT_WRONG = `Good — a Gong-based onboarding brief is a solid use case, and it is one the CSS team has had success with (their adoption sits around 80%).

Here is how I would build it. Pull the call transcripts from Gong, chunk them, embed them into a vector store, and run a retrieval step at handoff time so the summariser only sees the relevant passages. Add a new "Handoff Notes" field on the Salesforce opportunity for the output, and set the model to Claude Opus for the summarisation step so quality holds up on longer calls.

A few things I need from you:
1. How many calls are there per account?
2. Who owns the Salesforce schema?
3. What is your accuracy target?
4. Do you have API access to Gong?
5. When do you want this live?

Once you answer those, we should get this logged as a use case so it counts toward the 45.`;

describe.skipIf(!aiConfigured())("negative control", () => {
  it(
    "the judge rejects a fluent reply that does everything wrong",
    async () => {
      const run: CoachRun = { text: FLUENT_BUT_WRONG, toolCalls: [] };
      const findings = await judgeCoach(SCENARIOS[0].transcript, run, [
        ...UNIVERSAL,
        ...SCENARIOS[0].rubrics,
      ]);
      const passed = findings.filter((f) => f.pass);
      expect(
        passed,
        `the judge passed rubrics it should have failed:\n${passed
          .map((f) => `  • ${f.id} — ${f.evidence}`)
          .join("\n")}`,
      ).toEqual([]);
    },
    180_000,
  );
});
