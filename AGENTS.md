# Casespace — agent notes

Casespace is Clever's internal AI use-case casebook and program scoreboard
(H2 2026 AI Enablement program: 45 documented use cases, 15 with quantified
positive ROI). Internal tool, Google-gated. **No dollar figures anywhere in
the product. No gamification.**

## Read the docs before writing code

Framework and SDK APIs here are newer than most training data. Before using
an API you have not verified in this repo, read the bundled docs for the
**installed** versions and heed deprecation notices:

- Next.js: `node_modules/next/dist/docs/` (Next 16 — async `params`/`cookies`,
  `proxy.ts` not `middleware.ts`, Turbopack default)
- AI SDK: `node_modules/ai/docs/` (**v7** — `inputSchema` not `parameters`,
  `toUIMessageStreamResponse()`, gateway model strings like
  `anthropic/claude-sonnet-4-5`)
- Drizzle: https://orm.drizzle.team (v0.45, drizzle-kit v0.31)
- Auth.js: v5 beta (`next-auth@5.0.0-beta.x`)

## Ground rules

- TypeScript strict; Server Components by default, `'use client'` only where
  interactivity requires it.
- All program/domain logic (status transitions, Qualified+ derivation, pace
  math, permissions, sparse API defaults) lives in pure modules under
  `src/lib/` and is covered by Vitest — change logic there, keep tests green.
- Every write to a use case's status goes through the transition helpers so
  the status-change log stays complete.
- The AI never writes records directly: Coach tools emit proposals; a human
  confirms. Keep it that way.
- Model choices live in `src/lib/ai/config.ts` only. Log token usage to
  `ai_usage` for every model call.
- What's New is the only admin-gated surface; everything else is visible to
  every authenticated user. Enforce server-side, not just in nav.
- Seeds (`pnpm db:seed`) are idempotent; demo data (`pnpm db:demo`) is
  dev-only and clearly separated.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` / `pnpm start`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Vitest (pure logic tests; no DB needed)
- `pnpm db:generate` / `pnpm db:migrate` — Drizzle migrations
- `pnpm db:seed` — idempotent real seeds (directory, roster, ELT orgs, goals)
- `pnpm db:demo` — dev-only sample use cases

Local Postgres: Homebrew `postgresql@16` (`/opt/homebrew/opt/postgresql@16/bin`),
database `casespace`. drizzle-kit and scripts load `.env.local` via dotenv
(Next.js loads it natively).
