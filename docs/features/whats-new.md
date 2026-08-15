---
title: What's New
surface:
  - /whats-new
  - /whats-new/[id]/edit
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/whats-new/page.tsx
  - src/app/(app)/whats-new/[id]/edit/page.tsx
  - src/components/whats-new/post-controls.tsx
  - src/server/whats-new.ts
  - src/server/actions-posts.ts
---

# What's New

A weekly post about what moved in the program. **Open to every user** —
reading it is not gated. Drafting and editing are admin-only.

## How a post gets written

A [cron job](../integrations/cron.md) runs **Mondays at 13:00 UTC (9am
EDT)** and drafts the post for the prior week from real data:

- Status changes in that week, from `status_changes` — who moved what, from
  where to where
- Program progress at the time of writing
- Pulse snapshots, where there are new ones

Sonnet 5 writes the prose; the facts come from the database, not the model.
An admin reviews and edits before it stands.

## What it never contains

- **Dollar figures.** Nowhere in the product, this post included.
- **Comments.** The Coach and the post generator neither read nor write them.
- **Gamification.** No leaderboards, no rankings. Recognition is names on
  work — the post says who did what.

## Who can do what

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| Read posts | ✅ | ✅ | ✅ |
| Draft / regenerate a post | — | — | ✅ |
| Edit a post | — | — | ✅ |

Admin gating is enforced in the server actions, not just by hiding the
buttons.

## Regenerating

An admin can regenerate a draft — useful when records changed after the cron
ran. Regenerating replaces the draft body; an already-published post is
edited, not regenerated behind readers' backs.

## Related

- [Cron](../integrations/cron.md)
- [AI configuration](../operations/ai-config.md)
- [Statuses](../concepts/statuses.md) — the history the post reads
