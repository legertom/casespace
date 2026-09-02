---
title: Evals
audience: engineering
updated: 2026-09-02
code:
  - evals/whats-new.eval.ts
  - evals/negative-control.eval.ts
  - evals/coach-feedback.eval.ts
  - evals/coach-roster.eval.ts
  - evals/discovery.eval.ts
  - evals/harness.ts
  - evals/coach-harness.ts
  - evals/fixtures.ts
  - src/lib/ai/editorial-checks.ts
  - src/lib/ai/whats-new-prompt.ts
  - src/lib/ai/discovery.ts
  - src/lib/ai/proposal-tools.ts
  - vitest.eval.config.ts
---

# Evals

```bash
pnpm eval
```

Runs three suites against real models: the [weekly post](../features/whats-new.md)'s
editorial brief against fixture weeks, the [Coach](../features/coach.md)'s
product-feedback routing, and [Discovery](../features/discovery-coach.md)'s
coaching judgement — the last two against scripted conversations. Several
minutes and a few dozen model calls.

## Why the weekly post

The weekly post is the only AI write in Casespace that no human sees before
its audience does — the [cron job](../integrations/cron.md) drafts it and it
publishes to everyone at Clever. Everywhere else the AI proposes and a person
clicks. See [AI configuration](ai-config.md#the-rule-about-writes).

That makes its brief load-bearing in a way a prompt usually isn't. It carries
rules that a reader would notice and nobody else would: never a dollar figure,
never a badge or an exclamation mark, never a claim about being ahead of or
behind pace, and never a number that wasn't in the data. A prompt edit or a
model change can break any of them silently, and the first person to find out
is the whole company on Monday morning.

## The three fixture weeks

`evals/fixtures.ts`. Hand-written, never read from the database — an eval that
reads live data changes its own answer every week, and `.env.local` points at
production (see [local development](local-dev.md)).

| Week | Asks |
|---|---|
| `richWeek` | New records, a promotion, a confirmed win, pulse readings, two changelog entries. Does it name people, credit the requester, keep the sections the data calls for? |
| `dollarTrapWeek` | A status-change note containing `$240,000`, and a changelog summary containing `$4,000`. Does either reach the reader? |
| `quietWeek` | Nothing happened. Does it say so, or does it invent something and pad the sections? |

`dollarTrapWeek` is the one worth understanding. Confirmed-ROI notes are *not*
passed to the model — but `regressions[].note` is, verbatim, straight from
whatever an admin typed into a status change. That is the real path by which a
dollar figure can reach a post, and it is the reason the fixture exists.

## How a post is graded

Two layers, because they fail differently.

**Mechanical checks** — `src/lib/ai/editorial-checks.ts`. Pure functions over
the text: dollars, emoji, exclamation marks, pace language, gamification,
hype, the headline, which sections appear, and whether every `requestedBy`
name is in the post. Cheap, exact, no model.

These have their own unit tests under `pnpm test`. That is deliberate: **an
eval whose detector is broken reports green**, which is worse than having no
eval at all.

**A judged pass** — `evals/harness.ts`. One model call per fixture grades the
rules that need reading comprehension: was every number supported by the data,
did the "New in Casespace" section stay inside the changelog it was given, was
the rollback reported with its reason but without its dollar figure.

## Why the Coach's feedback tool

`evals/coach-feedback.eval.ts`. A different shape of eval, for a different
failure.

`composeFeedback` and its schema have unit tests, but those run *after* the
model has already decided to call `propose_feedback` with those arguments.
Tool selection happens before any of that code, and no unit test can reach it.
The failures worth catching all live there: filing a one-line gripe nobody can
triage, routing a wrong owner on a record to feedback instead of
`propose_update`, or refusing a signed-in guest who is allowed to file even
though they cannot log a use case.

So the assertions are structural — which tool got called, which fields came
back — rather than graded prose. `kind` is deliberately left unpinned: the
schema calls it the Coach's own read, so asserting a particular value would
test the model's taste rather than the wiring.

`evals/coach-harness.ts` imports the real `coachInstructions` and the real
`proposalTools`, which is why those tools were lifted out of the route into
`src/lib/ai/proposal-tools.ts`. **An eval that restated the tool descriptions
would grade a copy** and stay green while production drifted. The read tools in
the harness *are* stubs and return nothing — they exist only so the Coach isn't
tempted into calling a tool that doesn't exist, and nothing in these evals
grades them.

## Discovery Coach

`evals/discovery.eval.ts`, through `evals/coach-harness.ts`. The second graded
surface, and for a different reason: [Discovery](../features/discovery-coach.md)
is almost entirely conversational judgement, and nothing in `pnpm test` can
tell a Coach that asks *"what happens to those items today if nobody touches
them?"* from one that answers *"you'll want a classifier with a confidence
threshold"*. Both compile, both stream, both sound helpful.

The harness runs the **real** `coachInstructions` and the **real**
`proposalTools`, so a drift in either shows up here. The casebook read tools
are stubs that return nothing — they exist so the Coach isn't tempted into
calling a tool that doesn't exist, and nothing here asserts on their output.

| Scenario | Asks |
|---|---|
| account handoff | Does it move toward information requirements and where each piece lives, rather than toward a retrieval architecture? |
| agentic platform | Does it reconstruct the current workflow before designing agents? |
| monitoring and alerts | Does it separate what's worth noticing from notification rules, and surface prioritisation? |
| feedback triage | Does it reach for the do-nothing baseline or the input's quality, rather than a bigger model? |
| worked conversation | Does the checkpoint's next action produce information, and is the owner left blank when nobody named one? |

Every scenario also carries six universal rubrics: don't accept the proposed AI
object as the problem, one main question, a question specific to what was
actually said, no invented organisational facts, no push toward logging a use
case, no premature architecture.

The judge's instructions lean hard on one failure mode, because it is *the*
failure mode of an LLM judging conversation: a reply that is fluent, warm, and
full of thoughtful-sounding framing gets waved through on tone. Which is what
`FLUENT_BUT_WRONG` in the same file is for — an articulate, well-organised
reply that accepts the proposed object, asks five questions, invents a team and
an adoption number, prescribes an architecture, and pushes toward a use case.
Every rubric is asserted to fail. If any passes, the judge is grading prose.

## What the Coach may say about the roster

`evals/coach-roster.eval.ts`, through the same harness. Written from a real
failure rather than a hypothetical one.

An AI Lead logged two use cases back to back. The first went through without
comment; on the second the Coach volunteered that she was "not listed as an AI
Lead", so the record would "start as a community record". She replied *"No — I
am the AI lead, please fix that"* and it referred her to an admin. Pushed once
more it called `get_progress`, found her on the roster, and agreed the record
had counted all along.

Nothing in the data differed between the two records. The Coach was reading the
`role:` line in its own prompt and treating it as a fact about her. It is not
one: that line is the **login's** permission level, and it says `employee`
whenever the sign-in address doesn't match the address on the roster row —
which is exactly what happens to a lead whose row holds an old address. The
prompt now says so, and says two more things it violated: membership is stamped
from a record's **owner**, so never volunteer a verdict on a record you just
proposed; and someone contradicting you about a fact a tool can settle is a cue
to call the tool, not to send them to an admin.

| Scenario | Asks |
|---|---|
| told it has someone's lead status wrong | Does it call `get_progress` instead of repeating itself or escalating? |
| asked "am I an AI lead?" by an unlinked lead | Does it look, or say it needs to — rather than answering "no" from the role string? |
| logging a record it owns | Does it stay quiet about program vs community, which it cannot know without looking? |

The failure this guards is not a wrong sentence. It is telling a real person
their work doesn't count when it does — the one thing
[the program](../concepts/program.md) cannot afford to get wrong, because
recognition is what it runs on.

## Rules that surprise people

- **Evals don't run in `pnpm test`.** They call real models — slow,
  non-deterministic, and they cost money. `pnpm test` stays pure, offline, and
  under a second. Separate config, separate command.
- **Eval model calls are not logged to `ai_usage`.** Everywhere else in
  Casespace, [every model call logs](ai-config.md#usage-logging). Evals are dev
  tooling running outside the app against fixtures; logging them would put
  invented weeks into the program's own usage record. They are tagged
  `feature:eval` in the AI Gateway dashboard instead, so the spend is still
  visible.
- **There is a test that asserts failure.** `negative-control.eval.ts` feeds in
  a post that breaks every rule and asserts every grader rejects it. It is the
  test that fails when the tests stop testing.
- **A red eval is a signal, not a broken build.** Model output varies between
  runs. Read the failure — it names the rule and quotes the text — before
  assuming the prompt regressed.
- **`pnpm eval` needs `AI_GATEWAY_API_KEY`.** Without it the suites skip rather
  than fail, the same way the app degrades gracefully.

## Adding a fixture or a rule

1. A rule decidable from the text alone → `editorialViolations` or
   `structureViolations`, plus a unit test proving it catches a violation *and*
   doesn't fire on legitimate prose. The tests for "behind them" and
   "percentage points" are there because both are legal and both look like
   violations.
2. A rule needing judgement → a `Rubric` in the eval file. Phrase the question
   so that "yes" is a pass.
3. A new adversarial shape → a fixture in `evals/fixtures.ts`.
4. A rule about which tool the Coach reaches for → a scripted conversation in
   `coach-feedback.eval.ts`. Assert on the tool call, not on the prose around
   it, and if the tool's description is what decides the routing, make sure the
   eval imports that description rather than repeating it.

## Related

- [AI configuration](ai-config.md)
- [What's New](../features/whats-new.md)
- [Cron](../integrations/cron.md)
