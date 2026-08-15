---
title: The Coach
surface:
  - /coach
  - /api/coach
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/coach/page.tsx
  - src/app/api/coach/route.ts
  - src/components/coach/coach-chat.tsx
  - src/components/coach/proposal-card.tsx
  - src/components/coach/coach-launcher.tsx
  - src/components/coach/ask-coach-selection.tsx
  - src/components/coach/notes-door.tsx
  - src/lib/ai/coach-prompt.ts
  - src/lib/ai/proposal.ts
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
7. ROI if it's knowable — baseline, post, method. Otherwise marked not-yet-
   measurable with a revisit date.
8. Adoption evidence — who uses it beyond the authors?

Then it assembles everything into **one** proposal card. If you want to stop
early it proposes what it has: a half-filled record that exists beats a
perfect one that doesn't.

### Review a record's ROI

Ask it to review a use case, or work the "launched but unscored" list. It
fetches the record, checks the evidence against the confirmation bar, and
produces a **Kate-ready packet** — a one-page markdown summary with a verdict,
the evidence, the success criterion, adoption, and (when not ready) the
specific gaps with who could close each one.

It is instructed to be strict about methodology: *a number without a method is
not evidence*, and never to pad a weak case.

### Take a question about something on the page

Highlight any text inside a record and an **Ask the Coach** button appears
over the selection. Individual fields have their own Coach button. Both drop
the quoted text — with the record named so the Coach can look it up — into the
composer.

## The rule that shapes everything: it never writes

The Coach has five tools. Three read; two propose. The difference is
structural, not a policy someone remembers to follow:

| Tool | Does |
|---|---|
| `search_use_cases` | Search the casebook |
| `get_use_case` | One record in full, including ROI gaps and history |
| `get_progress` | The scoreboard |
| `propose_use_case` | **Renders a card.** No execute path |
| `propose_update` | **Renders a card.** No execute path |

The read tools have an `execute` function and run on the server. The proposal
tools **deliberately have none**. A tool with no `execute` cannot run — the AI
SDK surfaces it to the browser as a call awaiting a result, which is the
proposal card. Your click *is* the tool result the model gets back.

So there is no code path by which the model saves a record, and adding one
would mean adding an `execute`. The only write is `acceptProposalAction`, and
it runs as **you** — your role, your permissions. A viewer who somehow got a
card would get a
`ForbiddenError`, because the Coach's proposal doesn't carry authority; you do.

The system prompt also tells it not to propose to viewers at all, and to point
them at the AI Lead for their team instead.

## Rules that surprise people

**Text lands in the composer, not in a sent message.** Every "ask the Coach
about this" path prefills the box and leaves the caret at the end. You add
your question — or think better of it — before anything reaches the model.
Nothing is sent on your behalf.

**It will not invent a number.** The instructions are explicit: never invent
or estimate an ROI figure the human didn't give. If ROI isn't knowable, the
record gets marked not-yet-measurable with a revisit date rather than a guess.

**No dollar figures, ever.** ROI is counts, rates, and hours. This holds for
the Coach exactly as it does for the rest of the product.

**AI-built counts.** The Coach is told not to tell someone their case doesn't
qualify just because no AI runs at runtime — a tool built with Claude Code
satisfies the "AI tool & approach" gate. See
[approaches](../concepts/taxonomy.md#approaches).

**Proposals carry names, not ids.** A proposal says "Vamsi Chunduru", not a
UUID; the server resolves people and teams against the directory when you
accept. An unmatched name is kept as an unlinked display name rather than
dropped.

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

## Without a gateway key

The route returns 503 with a plain notice and the panel says so. Everything
else in Casespace works. See [AI configuration](../operations/ai-config.md).

## Who can do what

Everyone can talk to the Coach, viewers included. Accepting a proposal goes
through the normal permission checks, so a viewer can ask and read but cannot
accept a create.

## Related

- [Logging a use case](logging-a-use-case.md) — the three doors
- [AI configuration](../operations/ai-config.md) — models, usage, the writes rule
- [Gates and ROI](../concepts/gates-and-roi.md) — the bars it teaches
- [Comments](comments.md)
