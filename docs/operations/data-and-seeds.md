---
title: Data and seeds
audience: engineering
updated: 2026-08-14
code:
  - scripts/seed.ts
  - scripts/demo-data.ts
  - src/db/schema.ts
  - data/casebook-v2-org-chart.json
---

# Data and seeds

## `pnpm db:seed` — real seeds, idempotent

Safe to run repeatedly. It seeds:

- **Admins** — Tom (both aliases) and Kate
- **The directory** — 299 people from `data/casebook-v2-org-chart.json`
- **22 teams**
- **25 AI Leads**, with emails confirmed against the AI Leads Google Group
- **ELT orgs**, with targets summing to 15
- **Pulse baselines** (June 2026)

### The clobber rule

**Emails a human verified in the app are never overwritten by re-seeding.**
Any address still unverified is flagged on [the roster](../features/roster.md).
This is the one place where re-running the seed could destroy real work, so it
doesn't.

## `pnpm db:demo` — dev-only

Sample use cases for development. Clearly separated from the real seeds;
never run against production.

## The directory is a snapshot

`data/casebook-v2-org-chart.json` is a 299-person company snapshot, **not
live HR data**. It is admin-editable in the app and will drift from reality.
Author and owner pickers, roster links, and ELT rollups all resolve against
it — see [people, roster, and ELT](../concepts/people-and-elt.md).

## Migrations

Drizzle. `pnpm db:generate` writes a migration from schema changes;
`pnpm db:migrate` applies it. The production build runs `drizzle-kit migrate`
before `next build`, so **deploys migrate themselves** — you rarely run
migrate against production by hand.

Adding a value to one of the fixed vocabularies means changing both
`src/lib/domain.ts` **and** the matching `pgEnum` in `src/db/schema.ts`. See
[taxonomy](../concepts/taxonomy.md).

## Tables

Identity: `users`, `user_emails`, `allowed_login_emails`, `app_settings` ·
People: `people`, `teams`, `ai_leads`, `ai_lead_teams`, `elt_orgs` ·
Records: `use_cases`, `use_case_authors`, `use_case_links`, `status_changes` ·
Program: `pulse_metrics`, `pulse_snapshots`, `posts` ·
Surfaces: `pats`, `ai_usage`, `coach_chats` ·
Conversation: `use_case_comments`, `notifications`, `feedback`

## Related

- [Deploying](deploy.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
