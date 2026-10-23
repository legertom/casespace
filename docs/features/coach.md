---
title: The Coach
surface:
  - /coach
  - /api/coach
audience: everyone
updated: 2026-10-23
code:
  - src/app/(app)/coach/page.tsx
  - src/app/api/coach/route.ts
  - src/components/coach/coach-chat.tsx
  - src/components/coach/proposal-card.tsx
  - src/lib/ai/roi-tool.ts
  - src/components/coach/coach-launcher.tsx
  - src/components/coach/ask-coach-selection.tsx
  - src/components/coach/notes-door.tsx
  - src/lib/ai/coach-prompt.ts
  - src/lib/ai/coach-intent.ts
  - src/lib/ai/coach-error.ts
  - src/server/coach-failures.ts
  - src/lib/ai/transcript-repair.ts
  - src/lib/ai/decision.ts
  - src/components/error-note.tsx
  - src/lib/ai/proposal.ts
  - src/lib/ai/proposal-tools.ts
  - src/lib/ai/discovery.ts
  - src/lib/ai/courses.ts
  - src/lib/ai/meeting-breakouts.ts
  - src/server/meeting-breakouts.ts
  - src/server/meeting-group-models.ts
  - src/server/actions-live-groups.ts
  - src/components/coach/live-groups-card.tsx
  - src/components/coach/discovery-checkpoint-card.tsx
  - src/server/discovery-queries.ts
  - src/server/actions-discovery.ts
  - src/lib/coach-bus.ts
  - src/server/actions-ai.ts
---

# The Coach

A conversation that helps you scope a workflow, understand what the program
asks for, and file a record. Sonnet 5, through the Vercel AI Gateway.

It is reachable everywhere: a launcher sits bottom-right on every page, and
`/coach` is the full-page version.

## What it can do

### Answer questions about the program

What counts as documented, whether your thing qualifies, who owns what, where
the numbers stand. It reads the real casebook before answering — the system
prompt tells it to ground every factual claim in a tool call and to say so
when it hasn't looked.

It carries the program's bars in its instructions: the four gates, the
[counting rules](../concepts/counting-rules.md), the evidence behind a ROI
confirmation, and the [seven statuses](../concepts/statuses.md). It is told to
teach those when relevant and **not to lecture unprompted**.

### Work through a fuzzy idea (Discovery mode)

`/coach?intent=discovery` — **Work through an idea** on the Coach page, the
same link in the floating panel's header, or **Work this problem with Coach**
on any record.

A different job from everything else here: you arrive with a problem, an idea,
an attempt that isn't working, or plain uncertainty, and the Coach helps you
work out what is actually in the way and what the smallest useful next step is.
It has no fixed interview, and it is explicitly not trying to produce a use
case — "fix the source data first" and "AI doesn't help here" are good
outcomes. It ends by proposing a **Discovery Checkpoint** card, which saves
only on your click.

It is a mode of this Coach, not a second one: the program's bars, the counting
rules, the voice, the casebook tools, and the writes rule below are all the
same instructions. What changes is the mode section — Discovery gets its own,
and the wizard's interview is absent from it.

**[Discovery Coach](discovery-coach.md)** has the whole story.

### Walk you through logging one (wizard mode)

`/coach?intent=wizard`, or the first of [the three
doors](logging-a-use-case.md). A guided interview, **one question at a time,
never a wall of questions**, in a fixed order:

1. Name the workflow — what does it do today, in plain language?
2. Walk the current process start to finish.
3. Team and department; who built it; who owns it going forward (exactly one).
4. Which [approaches](../concepts/taxonomy.md#approaches) apply — more than
   one can.
5. The seven worksheet ratings, 1–5, conversationally. Optional; skipped freely.
6. The success criterion, pushed politely toward something measurable.
7. ROI by [Kate's method](../concepts/gates-and-roi.md#kates-method-in-hours):
   what kind of value, the baseline per period (the calendar question when
   there's no data, and whether that's measured or estimated), how it'll be
   measured, the expected after-value, maintenance, a revisit date, and —
   only if it has really been measured — the actual number. The arithmetic
   goes to `calculate_roi`; the Coach quotes the readout. Otherwise the
   record is marked not-yet-measurable with the revisit date.
8. Adoption evidence — who uses it beyond the authors?

Then it assembles everything into **one** proposal card. If you want to stop
early it proposes what it has: a half-filled record that exists beats a
perfect one that doesn't.

Once that card is settled it may offer one to three free
**[course suggestions](course-suggestions.md)** — never before, and often
none at all.

### Work out, then review, a record's ROI

*Score the ROI with the Coach* on your own record — or *Review the ROI for
confirmation* once its checklist is complete; both open `/coach?review=<id>`
— or ask it to work the "launched but unscored" or "revisit due" lists. The
kickoff asks for whichever the record needs, and the Coach decides from the
record itself, which now carries both halves of Kate's method and two
computed lines — expected and actual, in hours.

If the plan or the measurement is **incomplete**, it doesn't review a thin
record: it works the ROI out with you, one question at a time from wherever
the record already is, hands the arithmetic to `calculate_roi`, and ends in a
`propose_update` card. If it is **complete**, it checks the evidence against
the confirmation bar and produces a **Kate-ready packet** — a one-page
markdown summary with a verdict, the evidence (expected vs actual, payback
beside each), the success criterion, adoption, and (when not ready) the
specific gaps with who could close each one. For an admin it also offers a
draft annual-ROI sentence, in hours, to edit in the status dialog.

It is instructed to be strict about methodology: *a number without a method is
not evidence*, and never to pad a weak case.

### Take a question about something on the page

Highlight any text inside a record and an **Ask the Coach** button appears
over the selection. Individual fields have their own Coach button. Both drop
the quoted text — with the record named so the Coach can look it up — into the
composer.

### Make live breakout groups (admins only)

During the monthly AI Leads sync, an admin can ask the Coach to **form live
groups**, or choose that quick start on the Coach page. The Coach opens a
clickable list of **rostered AI Leads only**. The admin selects the people
present; absent leads and other users cannot enter the plan. The next step
shows every use case crediting the selected people as owner or author, so the
admin can review the evidence before asking for groups.

The admin can run **Method A · Jev** and **Method B · Claude Opus** separately
and compare their results. Jev chooses among valid candidate groupings built
from overlap in the selected cases. Opus proposes complete groups directly.
Both results are checked by code: every selected attendee must appear exactly
once, in the expected group sizes. For example, 8 attendees become two groups
of 4; 14 become two groups of 3 and two of 4; 22 become two groups of 3 and
four of 4. A failed or invalid model result is shown as an error, never passed
off as a meeting plan.

Every successful attempt is saved immediately at [Saved groups](groups.md),
including alternatives the admin does not choose. Each has a printable
explanation report with assignments, possible commonalities, evidence from
recorded use cases, and a question to start the discussion. Group sizes are
always between 2 and 5. Sparse casebook history is identified rather than
filled with guesses. After the admin chooses a plan, the groups and a link to
their report remain visible in the saved Coach conversation.

The first breakout task is for each group to discover what they have in
common. Then each person shares the obstacle or challenge they brought, gets
a turn to receive help, and identifies a next action. The admin only needs to
click attendance live; the Coach does not require obstacles beforehand.

## The rule that shapes everything: it never writes

The Coach has seven tools, plus two for admins,
one in wizard mode, and two more in Discovery mode.
Some read or compute; the rest propose. The difference is structural, not a
policy someone remembers to follow:

| Tool | Does |
|---|---|
| `search_use_cases` | Search the casebook |
| `get_use_case` | One record in full, including build hours, the ROI plan, the computed expected and actual lines, ROI gaps and history |
| `get_progress` | The scoreboard |
| `calculate_roi` | Kate's arithmetic, in hours — the same function as the form and the record page. Pure; reads and writes nothing. Every mode but Discovery |
| `get_coach_learnings` | How its own proposals landed. Admin-only, gated at the tool table |
| `open_live_groups` | Opens the admin-only roster picker and case review. A client tool with no execute path |
| `get_discovery_history` | Your own prior Discovery checkpoints. Discovery mode only, scoped to your session |
| `suggest_courses` | Free DeepLearning.AI courses that fit the workflow just described. Wizard mode only, gated at the tool table |
| `propose_use_case` | **Renders a card.** No execute path |
| `propose_update` | **Renders a card.** No execute path |
| `propose_feedback` | **Renders a card.** No execute path |
| `propose_discovery_checkpoint` | **Renders a card.** No execute path. Discovery mode only |

The read tools have an `execute` function and run on the server. The proposal
tools **deliberately have none**. A tool with no `execute` cannot run — the AI
SDK surfaces it to the browser as a call awaiting a result, which is the
proposal card or live-group workspace. Your click *is* the tool result the
model gets back. The workspace's own server actions recheck admin access.

There is a unit test asserting exactly this — that no tool in
`proposal-tools.ts` has an `execute` — so breaking it fails `pnpm test` rather
than shipping.

So there is no code path by which the model saves a record, and adding one
would mean adding an `execute`. The only write is `acceptProposalAction`, and
it runs as **you** — your role, your permissions. A viewer who somehow got a
card would get a
`ForbiddenError`, because the Coach's proposal doesn't carry authority; you do.

`propose_feedback` and `propose_discovery_checkpoint` are the two cards a
viewer can legitimately accept: filing [feedback](feedback.md) and saving a
[Discovery checkpoint](discovery-coach.md#discovery-checkpoints) each need a
session, not a role. Neither writes to the casebook, and both take the
identity they stamp from the session rather than from anything the model
supplied.

The system prompt also tells it not to propose to viewers at all, and to point
them at the AI Lead for their team instead.

## Rules that surprise people

**Text lands in the composer, not in a sent message.** Every "ask the Coach
about this" path prefills the box and leaves the caret at the end. You add
your question — or think better of it — before anything reaches the model.
Nothing is sent on your behalf.

**It knows which records count.** `search_use_cases` returns program and
community records alike — "has anyone tried X?" is answered wrong by hiding
half the casebook — and each one carries `inProgram`. `get_progress` counts
only program records. The instructions are explicit that the two must never
be conflated, and that it must not tell someone their community record counts
toward the 45. See
[counting rules](../concepts/counting-rules.md#program-and-community).

**It will not supply a number — but it will ask you to.** The precise rule,
and it matters: the Coach never invents a figure, and it never does ROI
arithmetic in its head. It *may* ask you to estimate a baseline (the
workshop's calendar question — "how much time would you block to do this by
hand?") and records that as an estimate, flagged as one. And when the
numbers are there, it calls `calculate_roi` and quotes what comes back, so
its percentage is the record page's percentage. If ROI isn't knowable, the
record gets marked not-yet-measurable with a revisit date rather than a guess.

**Discovery has no calculator.** `calculate_roi` is in every mode but that
one, on purpose: a Discovery conversation must not steer toward building,
and a percentage is the fastest way to end the thinking early.

**No dollar figures, ever.** ROI is counts, rates, and hours. The Coach
computes the percentage in hours — at one rate it is the same percentage as
in dollars — and, handed a dollar figure, asks for the hours behind it. A
revenue case is reported as counts and rates ("about two and a half more
deals a year"); its percentage belongs in Kate's confirmation note. This
holds for the Coach exactly as it does for the rest of the product.

**AI-built counts.** The Coach is told not to tell someone their case doesn't
qualify just because no AI runs at runtime — a tool built with Claude Code
satisfies the "AI tool & approach" gate. See
[approaches](../concepts/taxonomy.md#approaches).

**Proposals carry names, not ids.** A proposal says "Vamsi Chunduru", not a
UUID; the server resolves people and teams against the directory when you
accept. An unmatched name is kept as an unlinked display name rather than
dropped.

**You can reply to a card instead of clicking it.** A proposal card is a tool
call waiting on your click, and typing "change the net impact statement to…"
is the natural answer to a card that is nearly right. The Coach is told the
card was left undecided — neither accepted nor dismissed, nothing written —
and reads your reply. The card itself stays on screen and stays clickable;
that stand-in exists only in what the model reads, never in the saved
conversation, so a later click is still a real decision.

This used to lock the conversation. A tool call with no result makes the
whole transcript unsendable, and because the browser sends the whole history
every turn, every later message failed too — "hi" included. The repair is
`settleUndecidedCards` in `src/lib/ai/transcript-repair.ts`, and it is
unit-tested against the SDK's own converter. A *read* tool left hanging by a
cut-off stream is dropped instead: that is not a decision anyone declined to
make, and the Coach can simply look again.

**An older card can still be applied.** If the Coach proposes again after your
reply, both cards are live, and applying the earlier one applies the earlier
values. It is your click either way, which is the rule — but read which card
you are clicking.

**A turn is capped at six steps.** `stopWhen: isStepCount(6)` bounds how many
tool round-trips one message can trigger, so a confused conversation can't
loop indefinitely. After proposing, it is told to stop and wait for your
decision.

## What the Coach cannot see

**Comments.** They are not in `get_use_case`, not on the MCP surface, and not
in What's New generation. This is a decision, not an oversight: comments are
where people talk to each other, and the Coach is not in that conversation.

If the AI is ever given a voice there, it must arrive as a proposal card a
human confirms — like every other AI write.

## Conversations are saved

Chats persist to `coach_chats`, keyed by a chat id, with the messages stored
as JSON. The route checks ownership on every request: a chat id belonging to
someone else returns 403. Token usage for every turn is logged to `ai_usage`.

Each chat also stores **what it was opened to do** (`intent`) and, when it was
opened from a record, **which record** (`use_case_id`). Both are written once,
on the first turn, and never rewritten — they record what the person came to
do, not what the conversation drifted into.

They are also *authoritative*. Reopening a chat hits `/coach?chat=<id>`, which
carries no intent, so the server reads the stored one and runs the turn under
it. That is what keeps a reopened Discovery conversation in Discovery mode, and
it means a client cannot change an existing chat's intent or re-point it at
another record by sending different values. `src/lib/ai/coach-intent.ts` holds
the rule, and it is unit-tested.

## When a turn fails

The panel shows what happened, the underlying error in one line, and a
six-character **reference** — the same error note every other part of
Casespace uses, with the same **Report this** button, which files
[feedback](feedback.md) with the reference and detail attached.

The message names the cause where the cause is knowable: the gateway turned
down the key, the Coach is rate-limited, the model id isn't on the gateway,
the provider is down, the turn timed out. Anything else is "hit a snag" with
the real error underneath. `src/lib/ai/coach-error.ts` holds the mapping.

Every failure is also **kept**: a row in `coach_failures`, written whether or
not anyone presses Report, and listed for admins at the foot of the
[Feedback](feedback.md#coach-failures) page for 30 days. Runtime logs are
kept only for a while and take the CLI and the right search to read; the row
says who and when without either, and is still there when the logs are not.

The server also logs one line per failure, under the same reference:

```
[casespace error ZMGZIJ] coach turn failed {"kind":"gateway_auth","model":"…","userId":"…","chatId":"…","messages":4,"intent":"qa"} <the error>
```

`turn` is the whole turn failing; `tool` is one tool failing inside a turn
that carried on (the Coach is told, with the reference); `setup` is anything
before the stream opened. The line says who, which chat, and how long the
transcript was, followed by the error itself. **The transcript is never
logged or stored** — a conversation with the Coach is not log material. The
`coach_failures` row holds the same fields and the error's own name, message,
and HTTP status, and nothing else.

A failed turn keeps the message you sent and stores nothing for the reply
that never came. No tokens were used if the failure was before the model, so
there is nothing in `ai_usage` for it either.

See [troubleshooting](../operations/troubleshooting.md#the-coach-hit-a-snag).

## Without a gateway key

The route returns 503 with a plain notice and the panel says so. Everything
else in Casespace works. See [AI configuration](../operations/ai-config.md).

## Who can do what

Everyone can talk to the Coach, guests included. Accepting a proposal goes
through the normal permission checks, so a guest (viewer) can ask and read
but cannot accept a create. Everyone at Clever can, and what they accept is a
community record unless they are on the AI Leads roster.

## Related

- [Discovery Coach](discovery-coach.md) — working a fuzzy problem out
- [Course suggestions](course-suggestions.md) — what the wizard offers at the end
- [Logging a use case](logging-a-use-case.md) — the three doors
- [AI configuration](../operations/ai-config.md) — models, usage, the writes rule
- [Troubleshooting](../operations/troubleshooting.md#the-coach-hit-a-snag) — finding a failed turn in the logs
- [Gates and ROI](../concepts/gates-and-roi.md) — the bars it teaches
- [Comments](comments.md)
