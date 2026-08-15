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
- All program/domain logic (status transitions, the two counting rules, the
  ROI evidence checklist, permissions, sparse API defaults) lives in pure
  modules under `src/lib/` and is covered by Vitest — change logic there,
  keep tests green.
- Every write to a use case's status goes through the transition helpers so
  the status-change log stays complete.
- The AI never writes records directly: Coach tools emit proposals; a human
  confirms. Keep it that way.
- Records carry **comments** (`use_case_comments`, threaded six deep) and
  comments raise in-app **notifications** (the header bell). **The Coach
  neither reads nor writes them** — they are not in `get_use_case`, the MCP
  surface, or What's New generation, and that is a decision, not an
  oversight. If the AI is ever given a voice here it must be a proposal card
  a human confirms, like every other AI write. Comments are public to every
  authenticated user and writable by every role — `canComment` is true for
  viewers too, the one deliberate exception to viewers being read-only.
- Model choices live in `src/lib/ai/config.ts` only. Log token usage to
  `ai_usage` for every model call.
- Every page is visible to every authenticated user — What's New included.
  Two read exceptions: the adoption pulse charts on Goals (`canViewPulse`)
  and the `/wins` report (`canViewWins` — annual-ROI notes may carry
  dollars, which never appear on open surfaces). The casebook and every
  record's status stay open to all. Admin gating is otherwise for writes
  (drafting/editing posts, program controls); enforce it server-side, not
  just in nav.
- Seeds (`pnpm db:seed`) are idempotent; demo data (`pnpm db:demo`) is
  dev-only and clearly separated.
- **Add a changelog entry with every feature.** `docs/changelog.md`, in the
  same commit. The weekly What's New post reads it, so an entry is how a
  change reaches everyone at Clever — no entry means it shipped invisibly.
  Write it for the newsletter's reader (what they can now do), not for the
  engineer. Credit whoever asked with `Requested by: <name>`, and leave the
  line off rather than inventing one. Add `Feedback: <id>` when it closes an
  in-app report. Group under an `## YYYY-MM-DD` ship date, newest first.
- **Ship the doc with the feature.** Reference documentation lives in
  `docs/` (rendered in-app at `/docs`); `docs/plans/` is working documents
  and doesn't count. A new route needs a doc claiming it in `surface:` front
  matter — `pnpm test` fails otherwise — plus its files in `code:`, a bumped
  `updated:`, and a row in `docs/README.md`. Put deliberate-looking-wrong
  decisions under "Rules that surprise people"; that section is why the docs
  are worth reading.

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
