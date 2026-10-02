---
title: Cron
surface:
  - /api/cron/whats-new
  - /api/cron/backup
audience: engineering
updated: 2026-10-02
code:
  - src/app/api/cron/whats-new/route.ts
  - src/app/api/cron/backup/route.ts
  - src/server/whats-new.ts
  - vercel.json
---

# Cron

Two scheduled jobs, both declared in `vercel.json` and both authenticated
with `CRON_SECRET`.

## Backup, daily

| | |
|---|---|
| Route | `/api/cron/backup` |
| Schedule | **daily, 07:00 UTC** (3am EDT) |
| Does | Takes a backup of the casebook and stores it in a private Blob store |

No model call, and nothing anyone reads. Without a connected Blob store it
returns 503 and saves nothing. [Backup and restore](../operations/backup.md)
has the rest, including how a missed run shows up.

## What's New, weekly

| | |
|---|---|
| Route | `/api/cron/whats-new` |
| Schedule | **Mondays 13:00 UTC** (9am EDT), from `vercel.json` |
| Auth | `CRON_SECRET` as the Authorization bearer — Vercel sends it automatically |
| Does | Writes **and publishes** the [What's New](../features/whats-new.md) post for the **prior** week |

The job gathers that week's status changes, program progress, and any new
pulse snapshots, then asks Sonnet 5 for the prose. The facts come from the
database; the model only writes them up.

**The post goes live unreviewed.** There is no draft state and no approval
step — whatever the model writes is readable by everyone at Clever the
moment the job finishes. Admins can edit or regenerate afterwards, but they
are correcting something already public.

## Rules that surprise people

**It writes for the prior week, not the current one.** Running Monday
morning, "this week" has barely happened. `priorWeekStart()` and `mondayOf()`
do the arithmetic in **America/New_York**, so a Monday-morning run in ET
lands on the right Monday regardless of UTC drift.

**Without `CRON_SECRET` the route rejects everything**, including Vercel.
Set it when you set up the project.

**Without an AI gateway key the job skips the week entirely** — it returns
503 and writes nothing. No post, no placeholder. This is unlike the Coach and
the notes door, which show a notice in the UI; here there is nobody watching,
so the week simply has no post. See
[AI configuration](../operations/ai-config.md).

**Re-running the job overwrites that week's post**, since `weekStart` is
unique — it does not add a second one, and it discards any admin edits. See
[one post per week](../features/whats-new.md#one-post-per-week-overwritten-in-place).

## Running it by hand

An admin can regenerate from the What's New page; there is no need to trigger
the cron route manually.

## Related

- [What's New](../features/whats-new.md)
- [Deploying](../operations/deploy.md)
