---
title: What's New
surface:
  - /whats-new
  - /whats-new/[week]
  - /whats-new/[week]/edit
audience: everyone
updated: 2026-08-25
code:
  - src/app/(app)/whats-new/page.tsx
  - src/app/(app)/whats-new/[week]/page.tsx
  - src/app/(app)/whats-new/[week]/edit/page.tsx
  - src/components/whats-new/post-article.tsx
  - src/components/whats-new/post-controls.tsx
  - src/lib/weeks.ts
  - src/lib/post-excerpt.ts
  - src/server/whats-new.ts
  - src/server/actions-posts.ts
---

# What's New

A weekly post about what moved in the program. **Open to every user** —
reading it is not gated. Regenerating and editing are admin-only.

## Where a post lives

`/whats-new` is the archive: the newest post in full, every earlier week
beneath it as a card with an excerpt. Each post's permanent address is
`/whats-new/<week-start>` — the Monday of the week it covers, e.g.
`/whats-new/2026-08-10`. The date is the post's identity: it never changes,
however often the title is edited, so a shared link keeps working. Old
`?post=<id>` links and `/whats-new/<id>/edit` bookmarks redirect to the new
addresses.

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

## From the community

Anyone at Clever can log a use case, and the post says so. Records logged
outside the AI Leads roster get their own short section naming the people and
the teams they serve, stated plainly as not counting toward the two numbers.
They are kept out of "New in the casebook", out of the opening paragraph's
figures, and out of the scoreboard — every count in the post is program-only.
The section is skipped in a week with none.

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

## One post per week, never silently overwritten

`weekStart` is unique, so a week has exactly one post — and no path replaces
a post's text without first archiving the outgoing version to
`post_revisions`, in the same transaction. Nothing an admin wrote, and
nothing a reader already saw, is ever simply gone.

- **The cron is insert-only.** A Monday re-run that finds the week's post
  already there skips it — generated, edited, whatever. It also checks
  before calling the model, so a skipped week costs no tokens.
- **Only a human regenerates.** The Regenerate button replaces the post with
  fresh model output; if the post was hand-edited, the button asks first —
  "regenerating archives the edited version and starts over." Archived, not
  lost.
- **Edits are archived too.** Saving an edit stores the version it replaced,
  with who and when.

There is deliberately **no revisions UI yet** — the table is insurance,
readable in the database when someone needs it. Regenerating is for when
records changed after the cron ran and the post is now wrong; editing is the
safer tool for anything smaller.

## Related

- [Cron](../integrations/cron.md)
- [AI configuration](../operations/ai-config.md)
- [Statuses](../concepts/statuses.md) — the history the post reads
