---
title: Course suggestions
audience: everyone
updated: 2026-09-02
code:
  - src/lib/ai/courses.ts
  - src/lib/ai/coach-prompt.ts
  - src/app/api/coach/route.ts
---

# Course suggestions

At the end of [the wizard](logging-a-use-case.md#1-walk-me-through-it), once
your record is filed, the Coach may offer one to three **free**
[DeepLearning.AI](https://www.deeplearning.ai/courses/) courses relevant to
the workflow you just described. They come **recommended by Tom** — that is
why these are the courses on offer and not some other catalogue's.

Nothing is required. A course is not a fifth gate, it has no bearing on
whether your record counts toward the 45, and declining one costs you
nothing.

## When it happens

Only in the wizard, and only **after the proposal card is settled** — you
logged the record, or you decided not to. Never mid-interview: an interview
interrupted by a reading list is an interview nobody finishes.

The other Coach modes do not have it. `suggest_courses` is absent from their
tool table entirely, the same way `get_coach_learnings` is absent for
non-admins, so there is no phrasing that produces a course recommendation
from a question about the scoreboard.

## How a course is chosen

The Coach does not pick from a list. It hands over what the interview
established and gets back whatever clears a bar:

| Signal | Where it comes from |
|---|---|
| The workflow in your words | Title, description, and the steps you walked through |
| The tools you named | "Claude Code", "Zapier", "Snowflake" |
| The approaches | prompt / automation / agentic / built |
| Your department | Question 3 |
| Four of the worksheet ratings | Data availability, risk, evaluation clarity, maintenance burden |

Matching itself is ordinary TypeScript in `src/lib/ai/courses.ts` — no model
judgement, no search. That is what makes "it recommended a course that does
not exist" and "it invented a link" unreachable states rather than unlikely
ones: the Coach never sees the catalogue until it asks, and it is told to
recommend only what came back.

The ratings do real work here. Somebody who rated their own evaluation
clarity a 2 has said more about what would help them than any keyword will,
and that rating is what puts an evals course in front of them.

## Rules that surprise people

**Suggesting nothing is the common answer, and the correct one.** Most
workflows people log are somebody pasting a good prompt into Claude twice a
week, and there is nothing on deeplearning.ai they need for that. When
nothing clears the bar the Coach says nothing at all — it does not apologise,
does not describe what it looked for, and does not reach for the nearest
thing. One irrelevant suggestion costs more trust than three good ones earn,
and this feature is worth having only for as long as its suggestions are
worth reading.

**The catalogue is a subset, deliberately.** There are about 119 courses on
deeplearning.ai and roughly 40 here. Most of the rest is model-building work
— quantization, federated learning, pretraining, GRPO, inference serving —
that no Casespace use case has ever needed. A wider catalogue would not make
the Coach more helpful, it would make it wrong more often.

**Some courses are gated on their own subject, not just their score.** "Building
AI Browser Agents" is tagged `agents` and `automation` as well as `browser`,
and those first two are broad enough that it scored well for a ticket-triage
agent that had nothing to do with a browser. So a course can name one tag it
*requires* before it is eligible at all, whatever else it scores. The same
guard keeps "if you've never written code before" away from somebody who just
said they built their tool with Claude Code.

**No durations and no levels.** Both are rendered client-side on
deeplearning.ai, neither is in the page's structured data, and both change
when a course is revised. A stale "2h, Intermediate" in the Coach's mouth is
exactly the small wrongness this feature cannot afford, so the Coach is told
never to state either. The course page, one click away, states both
correctly.

**Every course in the catalogue is free**, which was checked against each
course page's structured data rather than assumed. That is the only claim the
Coach is allowed to make about cost.

**It is not a Discovery move.** Discovery already chooses a next learning
action from a much wider set — talk to users, map the process, fix the source
data — and dropping a course catalogue into that would bias it toward "go and
study" over "go and find out". If a course is genuinely the next action there,
the Coach can say so in words.

## How it is tested

The catalogue's integrity, the signal weights, the eligibility gates, the
family de-duplication, and the fact that a workflow with no AI shape to it
gets nothing are all unit-tested in `src/lib/ai/courses.test.ts` under `pnpm
test`. `src/lib/ai/coach-prompt.test.ts` asserts that the section is present
in the wizard and absent from every other mode.

What those cannot reach is whether the Coach raises it at a graceful moment,
which is a judgement question of the kind [evals](../operations/evals.md)
exist for.

## Related

- [The Coach](coach.md) — the tools, and the rule that it never writes
- [Logging a use case](logging-a-use-case.md) — the three doors
- [Taxonomy](../concepts/taxonomy.md) — the approaches and ratings it reads
