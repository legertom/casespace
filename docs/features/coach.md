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
  - src/lib/ai/coach-prompt.ts
  - src/lib/ai/proposal.ts
---

# The Coach

A conversation that helps you scope a workflow and file it. Sonnet 5, via the
Vercel AI Gateway.

## What it does

- **Guided wizard** (`/coach?intent=wizard`) — walks you through logging a
  use case, one question at a time.
- **Open conversation** — ask about scoping, the program's bars, whether
  something counts.
- **Ask about a selection** — highlight text anywhere in the app and ask the
  Coach about it. The composer is seeded once per ask, so the question
  arrives with its context and you can edit it before sending.
- **Proposal cards** — when the Coach has enough to suggest a record (or a
  change to one), it renders a card. You review it and click to accept.

## The Coach never writes

Its tools emit proposals; there is **no execute path**. Every write is a
button a human clicks. When you accept a proposal card, the accept action
does the write — the model doesn't.

Keep it that way when adding capability.

## What the Coach cannot see

**Comments.** They are not in `get_use_case`, not on the MCP surface, and not
in What's New generation. This is a decision, not an oversight: comments are
where people talk to each other, and the Coach is not in that conversation.

If the AI is ever given a voice there, it must arrive as a proposal card a
human confirms — like every other AI write.

## Without a gateway key

The Coach degrades to a polite notice. Everything else in Casespace works.
See [AI configuration](../operations/ai-config.md).

## Who can do what

Everyone can talk to the Coach. Accepting a proposal that creates or edits a
record still goes through the normal permission checks — a viewer can ask,
but cannot accept a create.

## Related

- [Logging a use case](logging-a-use-case.md)
- [AI configuration](../operations/ai-config.md)
- [Comments](comments.md)
