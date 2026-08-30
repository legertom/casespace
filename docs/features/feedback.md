---
title: Feedback
surface: /feedback
audience: admin
updated: 2026-08-29
code:
  - src/app/(app)/feedback/page.tsx
  - src/components/feedback/feedback-item.tsx
  - src/server/actions-feedback.ts
  - src/components/error-note.tsx
  - src/components/coach/feedback-proposal-card.tsx
  - src/lib/ai/feedback-proposal.ts
---

# Feedback

Tell the people running Casespace that something is wrong or missing.

Anyone signed in can file. **The page itself is admin-only** — reporters see
their report land and nothing else. It is not a public issue tracker, and it
is not a place to watch other people's complaints.

## Two ways in

- **From an error.** When something breaks, the error note says what happened
  and offers to report it, carrying the underlying error with it. Errors that
  say what happened beat errors that say "something went wrong".
- **Through the Coach.** Say the tool is broken or awkward and the Coach asks
  what you were doing and what you expected, then shows a card with the report
  it drafted. Nothing files until you click.

There is no free-text form on the page. That is deliberate: both doors capture
the context that makes a report actionable, and a bare textarea does not.

## What the Coach files

A one-line gripe helps nobody triage, so the Coach gathers before it writes.
The report it drafts carries:

- **What happened**, in the reporter's terms, with their steps where they gave
  them — not a cause the Coach inferred.
- **What they expected** instead, when they said.
- **Where** — the page or feature, stored in the same `path` column the error
  banner fills. The Coach takes the route from the reporter or from what they
  were plainly doing; it never guesses one from a feature's name.
- **The Coach's read** — bug, gap, request, or confusion — left empty when the
  report is too thin to call.

Two of those are the reporter's account and two are the Coach's. The filed
message keeps them apart: the report reads first, then one trailer line naming
who filed it and what the Coach made of it. An admin reading the page can tell
a person's words from a model's guess without asking.

The reporter's role in that trailer comes from the session, never from the
model — see `composeFeedback` in `src/lib/ai/feedback-proposal.ts`. It is the
one line on the card an admin reads as fact, so nothing the Coach can be
talked into reaches it.

## Who can do what

| | Everyone signed in | Admin |
|---|---|---|
| Report from an error | ✅ | ✅ |
| File through the Coach | ✅ | ✅ |
| See the feedback page | — | ✅ |
| Resolve or reopen an item | — | ✅ |

Open items are listed first; resolved ones stay visible below, so nobody files
the same thing twice.

## Related

- [Coach](coach.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
