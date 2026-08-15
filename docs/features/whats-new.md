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
reading it is not gated. Regenerating and editing are admin-only.

## How a post gets written

A [cron job](../integrations/cron.md) runs **Mondays at 13:00 UTC (9am
EDT)** and writes the post for the prior week from real data:

- Status changes in that week, from `status_changes` — who moved what, from
  where to where
- Program progress at the time of writing
- Pulse snapshots, where there are new ones

Sonnet 5 writes the prose; the facts come from the database, not the model.

**It publishes itself.** There is no draft state and no approval step — a
post is live the moment the cron writes it, and everyone can read it before
any admin has seen it. `posts` has no published column; the page lists every
row there is. An admin editing a post is correcting something already
public, not clearing it for release.

That is a deliberate trade — a weekly post nobody has to approve is a weekly
post that actually goes out — but it means the model's prose reaches readers
unreviewed. The [editorial instructions](../operations/ai-config.md) are the
only thing standing between a bad sentence and the whole company.

## What it never contains

- **Dollar figures.** Nowhere in the product, this post included.
- **Comments.** The Coach and the post generator neither read nor write them.
- **Gamification.** No leaderboards, no rankings. Recognition is names on
  work — the post says who did what.

## Who can do what

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| Read posts | ✅ | ✅ | ✅ |
| Regenerate a post | — | — | ✅ |
| Edit a post | — | — | ✅ |

Admin gating is enforced in the server actions, not just by hiding the
buttons.

## One post per week, overwritten in place

`weekStart` is unique, so a week has exactly one post. Regenerating does not
create a second one — it **overwrites the existing post**, including one
people have already read, and clears `editedAt`.

Two consequences worth knowing before you click it:

- **Regenerating discards an admin's edits.** If someone fixed a name or cut
  a sentence, a regenerate throws that away and puts fresh model output in
  its place.
- **Readers see the change with no trace.** There is no revision history and
  nothing marks a post as having been rewritten.

Useful when records changed after the cron ran and the post is now wrong.
Editing is the safer tool for anything smaller.

## Related

- [Cron](../integrations/cron.md)
- [AI configuration](../operations/ai-config.md)
- [Statuses](../concepts/statuses.md) — the history the post reads
