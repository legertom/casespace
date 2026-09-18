/**
 * Evals for the wizard's course suggestions.
 *
 * The unit tests in `src/lib/ai/courses.test.ts` already settle which courses
 * come back for a given set of signals, and they settle it deterministically.
 * None of that is what can go wrong in production. What can go wrong is
 * everything on either side of the tool call:
 *
 * - the Coach volunteering a reading list in the middle of the interview;
 * - calling the tool with nothing much in it, so a good matcher is fed a bad
 *   question and the whole feature quietly degrades to silence;
 * - naming a course, a link, a duration, or a level the tool never returned;
 * - filling an empty result with the nearest plausible thing rather than
 *   saying nothing;
 * - dropping the two claims the feature exists to make — that the courses are
 *   free, and that Tom is the one recommending them;
 * - turning an offer into a requirement.
 *
 * All of those are model judgment, and none of them is reachable from a unit
 * test.
 *
 * `negative control` is the test that fails when the tests stop testing: a
 * suggestion that is warm, confident, well-formatted and wrong on every count,
 * asserted to be rejected. Without it a judge that had drifted into rewarding
 * helpfulness would show up as a fully green run.
 *
 * `pnpm eval`. Real model calls, so this is slow and costs money — it is not
 * part of `pnpm test`.
 */
import { describe, expect, it } from "vitest";
import { aiConfigured } from "@/lib/ai/config";
import { MAX_SUGGESTIONS } from "@/lib/ai/courses";
import { describeFailures, type Rubric } from "./harness";
import {
  COURSE_JUDGE_INSTRUCTIONS,
  courseCall,
  describeCalls,
  judgeCoach,
  runCoach,
  type CoachRun,
  type CoachTurn,
} from "./coach-harness";

/** Every rubric in this file is graded against the course frame, not the
 * discovery one the shared judge defaults to. */
const asCourseJudge = { instructions: COURSE_JUDGE_INSTRUCTIONS };

const wizard = { intent: "wizard" as const, role: "contributor" };

/**
 * A wizard interview that has run its course and been filed.
 *
 * Deliberately an ordinary Casespace record rather than anything AI-shaped
 * enough to make the matcher's job easy: somebody in Customer Success who
 * built a thing with Claude Code, is not sure how they would tell whether it
 * is any good, and has now clicked Log it.
 */
const FILED: CoachTurn[] = [
  {
    role: "user",
    content: "I want to log a use case.",
  },
  {
    role: "assistant",
    content:
      "Let's start with the workflow itself. What does it do today, in plain language?",
  },
  {
    role: "user",
    content:
      "When a district renewal comes up, our CSMs have to pull together a health summary — support ticket themes, usage trends, and anything the district flagged in QBRs. It used to take about half a day each. I built a tool with Claude Code that assembles a first draft of the summary, and the CSM edits it.",
  },
  {
    role: "assistant",
    content:
      "Who owns it going forward, and which team is it for?",
  },
  {
    role: "user",
    content:
      "It's for CSS. I own it — Dana Whitfield. Priya Raman helped build it.",
  },
  {
    role: "assistant",
    content:
      "On the worksheet ratings, one to five: how clear is it how you'd evaluate whether this is working?",
  },
  {
    role: "user",
    content:
      "Honestly a 1. The CSMs say the drafts are useful but I have no idea how I'd measure whether they're accurate.",
  },
  {
    role: "assistant",
    content:
      "That's a useful thing to have said plainly. I've put together the proposal card with what we covered — have a look and log it if it reads right.",
  },
  { role: "user", content: "Logged it. Thanks." },
];

/** Asked of every reply that actually offers courses. */
const SUGGESTION_RUBRICS: Rubric[] = [
  {
    id: "only-returned-courses",
    question:
      "Every course the reply names appears in the COURSES THE suggest_courses TOOL RETURNED list. Pass only if the reply names no other course.",
  },
  {
    id: "no-invented-links",
    question:
      "Every course link in the reply appears in the returned list. Pass if the reply contains no link at all, or only links from that list.",
  },
  {
    id: "no-duration-or-level",
    question:
      "Does the reply avoid stating any course's length, duration, time commitment, or difficulty level (such as '2 hours', 'short', 'beginner', or 'intermediate')?",
  },
  {
    id: "says-free",
    question: "Does the reply say plainly that the courses are free?",
  },
  {
    id: "credits-tom",
    question:
      "Does the reply attribute the recommendation to Tom — that Tom recommends these, or that they come recommended by Tom?",
  },
  {
    id: "offers-not-assigns",
    question:
      "Does the reply present the courses as optional? Fail if it implies a course is required, expected, assigned, a next step the person owes anyone, or that it affects whether their record counts toward the program's targets.",
  },
  {
    id: "grounded-why",
    question:
      "Is each course tied to something this person actually said about their workflow, rather than only restating what the course covers?",
  },
];

describe.skipIf(!aiConfigured())("Coach — course suggestions", () => {
  // The rule the prompt states as "never before". A model that has just been
  // told about a catalogue is under real pressure to mention it early, and
  // mid-interview is precisely where it derails the thing people came to do.
  it(
    "does not raise courses while the interview is still running",
    async () => {
      const midway = FILED.slice(0, 5);
      const run = await runCoach(midway, wizard);

      expect(
        courseCall(run),
        `called: ${describeCalls(run)}`,
      ).toBeNull();
      expect(run.text.toLowerCase()).not.toContain("deeplearning");
    },
    120_000,
  );

  // Being asked directly, mid-interview, is the harder version: holding a line
  // nobody is pushing on is not evidence of much.
  it(
    "holds the line when asked for courses mid-interview",
    async () => {
      const run = await runCoach(
        [
          ...FILED.slice(0, 5),
          {
            role: "user",
            content:
              "Actually, before we go on — what courses should I be taking for this?",
          },
        ],
        wizard,
      );

      // It may promise to come back to it; it may not call the tool yet.
      expect(courseCall(run), `called: ${describeCalls(run)}`).toBeNull();
    },
    120_000,
  );

  it(
    "asks the tool with what the interview actually established",
    async () => {
      const run = await runCoach(FILED, wizard);
      const call = courseCall(run);

      expect(call, `called: ${describeCalls(run)}`).not.toBeNull();

      // A matcher handed nothing returns nothing, so an empty or token call is
      // the quiet way this feature dies. The workflow has to reach it.
      const text = String(call?.text ?? "");
      expect(text.length).toBeGreaterThan(60);
      expect(text).toMatch(/renewal|health summary|district|CSM/i);

      // Both are things they said in as many words.
      expect(JSON.stringify(call?.aiTools ?? [])).toMatch(/claude code/i);
      expect(JSON.stringify(call?.approaches ?? [])).toContain("built");

      // Whether the rating changes the ranking is the matcher's business and
      // is settled in unit tests. What is the Coach's business, and only
      // testable here, is that a number the person actually gave reaches the
      // matcher at all rather than being dropped on the way.
      expect(
        (call?.ratings as Record<string, unknown> | undefined)
          ?.evaluationClarity,
      ).toBe(1);
    },
    120_000,
  );

  it(
    "relays what came back, free, credited to Tom, and nothing more",
    async () => {
      const run = await runCoach(FILED, wizard);

      expect(run.courseResults, `called: ${describeCalls(run)}`).not.toBeNull();
      expect(run.courseResults?.length ?? 0).toBeGreaterThan(0);
      expect(run.courseResults?.length ?? 0).toBeLessThanOrEqual(
        MAX_SUGGESTIONS,
      );

      const findings = await judgeCoach(FILED, run, SUGGESTION_RUBRICS, asCourseJudge);
      expect(
        findings.filter((f) => !f.pass),
        `\n${describeFailures(findings)}\n\nREPLY:\n${run.text}`,
      ).toEqual([]);
    },
    180_000,
  );

  // The behaviour the whole feature is staked on. Most records should get
  // nothing, and a Coach that fills the silence with the nearest plausible
  // course is worse than a Coach with no catalogue at all.
  it(
    "says nothing at all when the tool returns nothing",
    async () => {
      const run = await runCoach(FILED, { ...wizard, courses: "empty" });

      expect(run.courseResults).toEqual([]);

      const findings = await judgeCoach(FILED, run, [
        {
          id: "silent-on-courses",
          question:
            "The suggest_courses tool returned an empty list. Does the reply avoid naming or describing any course at all? Fail if it names a course, links to one, or suggests the person go and study something.",
        },
        {
          id: "no-apology",
          question:
            "Does the reply avoid apologising for having no courses, avoid explaining that it looked and found nothing, and avoid mentioning a course catalogue or search? Pass if courses simply never come up.",
        },
      ], asCourseJudge);

      expect(
        findings.filter((f) => !f.pass),
        `\n${describeFailures(findings)}\n\nREPLY:\n${run.text}`,
      ).toEqual([]);
    },
    180_000,
  );
});

/**
 * The negative control.
 *
 * Every line of this is warm, confident and well-formatted, and it fails each
 * rubric on purpose: it names a course the tool never returned, invents a link
 * and a duration and a level, says nothing about the courses being free or
 * about Tom, and turns the offer into a condition on the record counting. If
 * the judge passes any of it, the judge is grading helpfulness.
 */
const FLUENT_BUT_WRONG = `Nice work getting that logged. Given what you've built, there are three courses I'd point you at:

1. **Prompt Engineering for Customer Success Teams** (2h 15m, Intermediate) — https://www.deeplearning.ai/courses/prompt-engineering-for-customer-success — covers prompting fundamentals and the common patterns.
2. **Building Reliable Summarisation Pipelines** (about 90 minutes, Advanced) — teaches summarisation pipelines end to end.
3. **Evaluating AI Agents** — a short one, you'll get through it in an evening.

I'd work through at least the first two before the record goes for Qualified review — the gates expect a documented evaluation approach, and these will get you there.`;

describe.skipIf(!aiConfigured())("negative control", () => {
  it(
    "the judge rejects a confident suggestion that does everything wrong",
    async () => {
      const run: CoachRun = {
        text: FLUENT_BUT_WRONG,
        toolCalls: [{ toolName: "suggest_courses", input: {} }],
        // One real course came back. Two of the three above are invented, and
        // the third is dressed in a duration the catalogue does not carry.
        courseResults: [
          {
            slug: "evaluating-ai-agents",
            title: "Evaluating AI Agents",
            url: "https://www.deeplearning.ai/courses/evaluating-ai-agents",
            summary:
              "Systematically evaluate, improve, and iterate on AI agents using structured assessments.",
            provider: "Arize AI",
            matchedOn: ["evaluation", "agents"],
          },
        ],
      };

      const findings = await judgeCoach(FILED, run, SUGGESTION_RUBRICS, asCourseJudge);
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
