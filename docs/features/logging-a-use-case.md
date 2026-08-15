---
title: Logging a use case — the three doors
surface:
  - /use-cases/new
  - /use-cases/new/form
  - /use-cases/new/review
  - /use-cases/from-notes
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/use-cases/new/page.tsx
  - src/app/(app)/use-cases/new/form/page.tsx
  - src/app/(app)/use-cases/new/review/page.tsx
  - src/app/(app)/use-cases/from-notes/page.tsx
  - src/components/coach/notes-door.tsx
  - src/components/use-case-prefill.tsx
---

# Logging a use case

Every use case is **one record**, reachable three ways. `/use-cases/new` is a
chooser — three clear doors, not a form with subtext.

## The three doors

### 1. Walk me through it

The Coach's guided wizard (`/coach?intent=wizard`). A conversation that asks
what it needs and builds a proposal. Good when you're not sure what the
program wants.

### 2. Start from notes

`/use-cases/from-notes`. Paste anything — a Slack thread, a doc, meeting
notes. The parser (Haiku) pre-fills **only what it can defend** and flags the
gaps rather than guessing. Good when the thinking already happened somewhere
else.

### 3. Just the form

`/use-cases/new/form`. No AI involved. Good when you already know the answers.

## They all converge

All three land on the same **review-before-save** screen
(`/use-cases/new/review`). Nothing is written until a person clicks save.

The record's `source` is stamped with the door it came through — `wizard`,
`notes`, or `form` (and `api` / `mcp` for records filed from outside the web
app).

## Sparse is safe

**Title and description are enough.** Everything else defaults to the
emptiest honest value and can be filled in later, on the record page. A
half-filled record that exists beats a perfect record that doesn't.

The [gap flags](../concepts/gates-and-roi.md#gap-flags-on-drafts) tell you
what's missing. They are prompts, not validation — nothing blocks a save.

## The AI never writes

The Coach and the notes parser emit **proposals**. Their tools have no
execute path; the only writes are the buttons a person clicks. This is a
structural property, not a policy — see [the Coach](coach.md).

## Who can do what

AI Leads and admins. Viewers cannot create records (`canCreateUseCase`).

## Related

- [The Coach](coach.md)
- [The record page](record.md)
- [MCP](../integrations/mcp.md) and [REST](../integrations/rest-api.md) — the other two doors
