---
title: Feedback
surface: /feedback
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/feedback/page.tsx
  - src/components/feedback/feedback-item.tsx
  - src/server/actions-feedback.ts
  - src/components/error-note.tsx
---

# Feedback

Tell the people running Casespace that something is wrong or missing.

## Two ways in

- **The feedback page** — write it directly.
- **From an error.** When something breaks, the error note says what
  happened and offers to report it, carrying the context with it. Errors that
  say what happened beat errors that say "something went wrong".

## Who can do what

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| Submit feedback | ✅ | ✅ | ✅ |
| See open and resolved items | ✅ | ✅ | ✅ |
| Resolve an item | — | — | ✅ |

Open items are listed first; resolved ones stay visible below, so nobody
files the same thing twice.

## Related

- [Roles and permissions](../concepts/roles-and-permissions.md)
