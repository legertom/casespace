---
title: Discovery Coach
audience: everyone
updated: 2026-08-30
code:
  - src/lib/ai/coach-prompt.ts
  - src/lib/ai/coach-intent.ts
  - src/lib/ai/discovery.ts
  - src/lib/ai/decision.ts
  - src/lib/ai/proposal-tools.ts
  - src/components/coach/discovery-checkpoint-card.tsx
  - src/server/discovery-queries.ts
  - src/server/actions-discovery.ts
  - evals/discovery.eval.ts
---

# Discovery Coach

A mode of [the Coach](coach.md) for the conversation that happens *before* a
use case exists. You bring a problem, a half-formed idea, an attempt that
isn't working, or plain uncertainty; it helps you work out what is actually in
the way and what the smallest useful next step is.

Start one from **Work through an idea** on `/coach`, the same link in the
floating panel's header, or **Work this problem with Coach** on any record.

## It is not the wizard

The [wizard](coach.md#walk-you-through-logging-one-wizard-mode) assumes you
have a use case and walks a fixed twelve-step interview to document it.
Discovery assumes nothing, has no interview, and is not trying to produce a
record.

| | Wizard | Discovery |
|---|---|---|
| Assumes | You have a workflow to log | You have a problem to understand |
| Shape | Fixed question order | One question at a time, chosen for what it would change |
| Produces | A use-case proposal | A Discovery Checkpoint — and a use case only if you ask |
| Ends when | The fields are filled | The next learning action is clear |

The two prompts do not overlap. When the intent is `discovery` the wizard's
interview is **absent from the instructions entirely**, not just discouraged —
a fixed interview sitting in the context is a fixed interview the Coach will
eventually drift into running.

## What it is trying to do

> Improve your understanding of the problem until the next best learning
> action becomes clear.

Not solve it. Not build it. And explicitly **not** produce more use cases — the
Coach is told it is not measured on that. Any of these is a complete, good
outcome:

fix the source data first · talk to users · map the process · make an
inventory · ask another stakeholder · request permissions · define a success
metric · inspect examples · build a tiny prototype · run an eval · investigate
an API · build a dashboard · test retrieval · write down the requirements ·
keep it manual for now · decide AI doesn't help here

## How it behaves

Four moves, chosen per reply rather than run in order. Before each one it asks
itself: *given what I now know, what would most change what we should do next?*

- **Ask** — when you hold the information. Concrete, not consulting-abstract:
  "What happens after that today?", "Who actually does that step?", "What
  happens to those items if nobody intervenes?"
- **Teach** — when a concept is in the way. Retrieval vs generation, agent vs
  automation, evals, abstention, source-of-truth problems. Two or three
  sentences tied to your situation, then the problem comes back to you.
- **Suggest** — as a hypothesis. "I wonder if the first version is a dashboard
  rather than an alert."
- **Challenge** — when an assumption is closing things off early. Does the AI
  need to answer every case? Is the model the problem, or is the input
  incomplete?

It works quietly toward the **dominant constraint** — the thing that currently
prevents sensible progress — and it is told, repeatedly, that this is usually
not technical. Unclear requirements, data access, workflow ambiguity, human
adoption, incentives, and ownership are as likely as feasibility. "We don't yet
know which of these it is" is a legitimate finding.

## Discovery Checkpoints

When the problem can be stated more usefully than it arrived, the constraint is
reasonably clear, and there is a specific next action, the Coach says so and
proposes a **Discovery Checkpoint** card:

- **What we're solving** — the refined problem (and what it *started as*, when
  the framing actually moved)
- **Today, without this** — the baseline, and where the process breaks
- **Dominant constraint** — one of twenty named constraints, plus why
- **Best next step**, what it should teach us, and why that step
- **Owner** and **come back when**, if they are actually known
- **Still unresolved** — the short honest list

Four buttons: **Save checkpoint**, **Draft use case from this**, **Keep
talking**, **Dismiss**. Nothing is written until you click, and "Keep talking"
writes nothing at all — the Coach picks up the next open question rather than
restarting.

Checkpoints are **append-only**. Come back with what you learned and the second
checkpoint sits beside the first:

```
Checkpoint 1: We need to define the information requirements.
Checkpoint 2: 75% comes from Gong — test extraction.
Checkpoint 3: The failures are promises only sales knows about — prototype clarification.
```

That sequence is the learning history of the project, and it is the reason
nothing overwrites.

## Coming back

`get_discovery_history` returns **your own** prior checkpoints — what you
concluded, what you were going to go and learn, what was still open. The Coach
is told to orient around what you learned rather than repeating its earlier
questions: *"Last time the open question was which handoff fields live in Gong
versus people's heads, and you were going to build that inventory. What did you
find?"*

It is offered only in Discovery mode, and `userId` is taken from your session,
not from an argument — there is no phrasing that reaches anyone else's.

## Turning one into a use case

**Draft use case from this** saves the checkpoint and then asks the Coach for a
normal [`propose_use_case` card](coach.md#the-rule-that-shapes-everything-it-never-writes).
It does **not** create a record. There is one create path in Casespace and this
routes through it, so the casebook still receives nothing until you accept that
second card.

A record created this way records its source as `discovery`, not `wizard` —
the two doors produce differently-shaped records, and collapsing them would
make that difference unmeasurable.

The Coach is told to fill only what the conversation established: no invented
owner, no invented numbers, and **none of the four documented gates ticked**.
Gates are confirmed by a person; Discovery never confirms them.

## Rules that surprise people

**A checkpoint is not a draft use case.** A use case is work being tracked; a
checkpoint is what you understood while reasoning about the work. Most
checkpoints should never become records, which is why `use_case_id` on
`discovery_checkpoints` is nullable and why the Coach is told never to propose
a use case just because a checkpoint exists.

**Your chat's intent, not your URL's, decides the mode.** Reopening a
conversation from Recent hits `/coach?chat=<id>`, which carries no intent at
all. The server reads the intent stored on the chat row and that value wins —
so a Discovery conversation stays a Discovery conversation, and a client
cannot rewrite an existing chat's recorded provenance by sending a different
one. Same rule for the linked record. See `src/lib/ai/coach-intent.ts`.

**Discovery is open to viewers.** Saving a checkpoint needs a session, not a
role — it is a note to yourself about a problem, and it touches neither the
casebook nor the program's numbers. Accepting a use-case proposal still goes
through the normal permission check.

**Nobody else can read your checkpoints.** There is no admin surface over
`discovery_checkpoints` and there should not be one. What the program learns
from is [`coach_events`](coach-learnings.md), which holds proposed *fields* and
outcomes and never anybody's reasoning.

**There is no live working-model panel.** A sidebar showing "trying to
accomplish / current failure / dominant constraint" would need an extra
extraction call every turn and a second copy of state that could disagree with
the conversation. For now the conversation is the working process and the
checkpoint is the visible synthesis.

**Comments stay invisible here too.** Discovery has exactly the Coach's
existing casebook reads — `get_use_case` included — and none of them carry
comments. See [what the Coach cannot see](coach.md#what-the-coach-cannot-see).

## What it stores

| Table | Holds |
|---|---|
| `coach_chats` | The conversation, its `intent` (`discovery`), and its `use_case_id` context. Both set once and never rewritten. |
| `discovery_checkpoints` | Append-only checkpoints, scoped to one user. Deleting the linked record nulls the link and keeps the learning. |
| `coach_events` | Only if a checkpoint became a use-case proposal — recorded under the `discovery` door. |
| `ai_usage` | Tokens, like every other model call. |

## How it is tested

Schema, intent resolution, the checkpoint outcomes, the prompt composition, and
the fact that no proposal tool has an `execute` are all unit-tested under `pnpm
test`. What that cannot reach is the conversational judgement, which is graded
by model in `evals/discovery.eval.ts` — four scenario fixtures, a worked
conversation that should end in a checkpoint, and a negative control: an
articulate, well-organised reply that gets everything wrong, asserted to fail
every rubric. See [evals](../operations/evals.md).

## Related

- [The Coach](coach.md) — the shared core, the tools, and the writes rule
- [Logging a use case](logging-a-use-case.md) — the three doors
- [Coach learnings](coach-learnings.md) — what the program measures about the Coach
- [Evals](../operations/evals.md)
