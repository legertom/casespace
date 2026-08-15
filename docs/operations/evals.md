---
title: Evals
audience: engineering
updated: 2026-08-15
code:
  - evals/whats-new.eval.ts
  - evals/negative-control.eval.ts
  - evals/harness.ts
  - evals/fixtures.ts
  - src/lib/ai/editorial-checks.ts
  - src/lib/ai/whats-new-prompt.ts
  - vitest.eval.config.ts
---

# Evals

```bash
pnpm eval
```

Runs the [weekly post](../features/whats-new.md)'s editorial brief against
fixture weeks with a real model, and grades what comes back. Roughly 100
seconds and a handful of model calls.

## Why this one surface

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

## Related

- [AI configuration](ai-config.md)
- [What's New](../features/whats-new.md)
- [Cron](../integrations/cron.md)
