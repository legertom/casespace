---
title: Data and seeds
audience: engineering
updated: 2026-08-25
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
- **24 AI Leads**, with emails confirmed against the AI Leads Google Group
  (the seeded count; admins add and remove leads in-app, so the live roster
  drifts from it — read `ai_leads`, don't quote this number)
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

**`ALTER TYPE ... ADD VALUE` cannot be undone.** Postgres has no `DROP
VALUE`. Reverting the code is fine; the value stays in the type forever.
Append new role and status values to the **end** of the array in
`src/lib/domain.ts` rather than inserting them in conceptual order — array
order is the Postgres enum order, and inserting mid-list can push drizzle-kit
into recreating the type. Read the generated SQL before applying it.

### The `in_program` backfill

`use_cases.in_program` shipped as `NOT NULL DEFAULT true`, and the default
*is* the backfill. That is correct because membership records who logged a
record **at the time**, and everything predating the column was logged when
only leads and admins could write — all of it program work.

Going forward the rule is narrower: only an AI Lead's record is stamped
in-program. So admin-logged rows from before this column keep counting while
new ones do not. That is the durable stamp working as intended. To bring the
old rows in line with the new rule instead, which **will** lower the 45:

```sql
update use_cases uc set in_program = false
from users u where u.id = uc.created_by_id and u.role = 'admin';
```

Do **not** be tempted to backfill it by joining `users.role` instead. Roles
are re-derived on every sign-in and roster rows are hard-deleted, so a lead
who has since left the roster reads as a `viewer` today — a role-join would
wrongly mark their past records as community.

## Tables

Identity: `users`, `user_emails`, `allowed_login_emails`, `app_settings` ·
People: `people`, `teams`, `ai_leads`, `ai_lead_teams`, `elt_orgs` ·
Records: `use_cases` (incl. `in_program`), `use_case_authors`, `use_case_links`, `use_case_urls`, `status_changes` ·
Program: `pulse_metrics`, `pulse_snapshots`, `posts` ·
Surfaces: `pats`, `ai_usage`, `coach_chats` ·
Conversation: `use_case_comments`, `notifications`, `feedback`

## Related

- [Deploying](deploy.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
