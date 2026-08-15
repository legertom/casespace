# Casespace

Clever's internal casebook of AI use cases — and the live scoreboard for the
H2 2026 AI Enablement program.

The program (KR 5 — AI Adoption, owned by Kate Schaff, run by Tom Leger):

- **45+ documented AI use cases** by December 31 — "documented" means four
  gates: a named workflow with a clear description, an identified AI tool &
  approach, adoption evidence beyond the author(s), and a named owner.
- **15 with quantified, positive ROI** (**Confirmed Positive ROI**) —
  allocated across ELT owners. An explicit stage after Qualified, set only by
  an admin, and only with a note articulating the annual ROI.
- Adoption pulse goals (daily-use and readiness percentages) tracked from
  June baselines.

Everyone at Clever sees everything; AI Leads contribute; admins run the
program. No dollar figures exist anywhere in the product, and there is no
gamification — recognition is names on work.

## Documentation

**[`docs/`](docs/README.md)** — every feature, concept, integration, and
operational runbook. The same pages are served in the app at **`/docs`**.

Start with [the program](docs/concepts/program.md), then
[logging a use case](docs/features/logging-a-use-case.md).

| If you want to | Read |
|---|---|
| Understand the two numbers | [Counting rules](docs/concepts/counting-rules.md) |
| Know who can do what | [Roles and permissions](docs/concepts/roles-and-permissions.md) |
| File from Claude Code | [MCP](docs/integrations/mcp.md) |
| Call the API | [REST API](docs/integrations/rest-api.md) |
| Run it locally | [Local development](docs/operations/local-dev.md) |
| Deploy it | [Deploying](docs/operations/deploy.md) |
| Fix something broken | [Troubleshooting](docs/operations/troubleshooting.md) |

**Adding a feature?** Ship its doc in the same commit — `pnpm test` fails when
a route has no doc. See
[keeping the docs updated](docs/README.md#keeping-this-updated).

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Neon/Postgres + Drizzle ·
Auth.js v5 (Google, domain-gated, multi-alias identity) · Vercel AI SDK v7 via
AI Gateway (Sonnet 5 for the Coach & weekly post, Haiku 4.5 for extraction) ·
Recharts · Vitest · MCP SDK v2 (`mcp-handler`).

## Quick start

```bash
pnpm install
cp .env.example .env.local        # DATABASE_URL + AUTH_SECRET at minimum
pnpm db:migrate                   # apply schema
pnpm db:seed                      # idempotent real seeds
pnpm dev
```

> **Check what `DATABASE_URL` points at first.** On the primary dev machine
> `.env.local` shares `prod.env`'s database, so `db:migrate` and `db:seed`
> land on production. See
> [local development](docs/operations/local-dev.md).

`pnpm test`, `pnpm typecheck`, and `pnpm build` should all stay green.

## Open questions for Tom / Kate

Carried from the brief, tracked in
[the program](docs/concepts/program.md#open-questions).
