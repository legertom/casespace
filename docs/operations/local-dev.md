---
title: Local development
audience: engineering
updated: 2026-08-15
code:
  - package.json
  - drizzle.config.ts
  - .env.example
  - vitest.eval.config.ts
---

# Local development

```bash
pnpm install
cp .env.example .env.local        # DATABASE_URL + AUTH_SECRET at minimum
pnpm db:migrate                   # apply schema
pnpm db:seed                      # idempotent real seeds
pnpm db:demo                      # optional: sample use cases
pnpm dev
```

## ⚠️ Check what `DATABASE_URL` points at

**The `.env.local` on this machine currently points at the production
database** — the same URL as `prod.env`. Under that configuration:

- `pnpm db:migrate` migrates **production**.
- `pnpm db:seed` seeds **production**.
- `pnpm dev` reads and writes **production** data.

If that is deliberate, migrate and deploy in the same breath so the running
code and the schema never disagree. If it is not what you want, point
`DATABASE_URL` at a local database first:

```bash
brew services start postgresql@16 && createdb casespace
```

then set `DATABASE_URL=postgresql://$USER@localhost:5432/casespace`.

## Signing in locally

Set `AUTH_DEV_LOGIN=1` and `/signin` offers an email-only dev login, so you
can try any role:

| Email | Role |
|---|---|
| `tom.leger@clever.com` | admin |
| any roster email, e.g. `vamsi.chunduru@clever.com` | contributor |
| any other `clever.com` address | viewer |

Development only — it is hard-disabled outside development builds.

## Commands

| Command | Does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` / `pnpm start` | Production build — **build runs migrations first** |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest — pure logic, no database needed |
| `pnpm eval` | [Evals](evals.md) for the weekly post — real model calls, ~100s |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations |
| `pnpm db:seed` | Idempotent real seeds |
| `pnpm db:demo` | Dev-only sample use cases |

`pnpm typecheck`, `pnpm test`, and `pnpm build` should all stay green.

## What the tests cover

Status transitions, the two counting rules, the ROI evidence checklist,
permissions, sparse-create defaults, target-sum warnings, view-as role
resolution, comment threading and notification fan-out, link grouping and
notifications, and [docs coverage](../README.md#keeping-this-updated).

drizzle-kit and the scripts load `.env.local` via dotenv; Next.js loads it
natively.

## Related

- [Deploying](deploy.md)
- [Data and seeds](data-and-seeds.md)
