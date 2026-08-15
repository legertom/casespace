---
title: Cron
surface: /api/cron/whats-new
audience: engineering
updated: 2026-08-14
code:
  - src/app/api/cron/whats-new/route.ts
  - src/server/whats-new.ts
  - vercel.json
---

# Cron

One scheduled job.

## What's New, weekly

| | |
|---|---|
| Route | `/api/cron/whats-new` |
| Schedule | **Mondays 13:00 UTC** (9am EDT), from `vercel.json` |
| Auth | `CRON_SECRET` as the Authorization bearer — Vercel sends it automatically |
| Does | Drafts the [What's New](../features/whats-new.md) post for the **prior** week |

The job gathers that week's status changes, program progress, and any new
pulse snapshots, then asks Sonnet 5 for the prose. The facts come from the
database; the model only writes them up. An admin reviews before it stands.

## Rules that surprise people

**It drafts for the prior week, not the current one.** Running Monday
morning, "this week" has barely happened. `priorWeekStart()` and `mondayOf()`
do the arithmetic in **America/New_York**, so a Monday-morning run in ET
lands on the right Monday regardless of UTC drift.

**Without `CRON_SECRET` the route rejects everything**, including Vercel.
Set it when you set up the project.

**Without an AI gateway key** the job degrades to a polite notice rather than
failing the deploy — see [AI configuration](../operations/ai-config.md).

## Running it by hand

An admin can regenerate a draft from the What's New page; there is no need to
trigger the cron route manually.

## Related

- [What's New](../features/whats-new.md)
- [Deploying](../operations/deploy.md)
