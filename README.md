# Casespace

Clever's internal casebook of AI use cases — and the live scoreboard for the
H2 2026 AI Enablement program.

The program (KR 5 — AI Adoption, owned by Kate Schaff, run by Tom Leger):

- **45+ documented AI use cases** by December 31 — "documented" means four
  gates: a named workflow with a clear description, an identified AI tool &
  approach, adoption evidence beyond the author(s), and a named owner.
- **15 with quantified, positive ROI** (**Confirmed Positive ROI**) —
  allocated across ELT owners. An explicit stage after Qualified, set only by
  an admin, and only with a note articulating the annual ROI. Those notes
  roll up on the admin-only `/wins` page for the end-of-year report.
- Adoption pulse goals (daily-use and readiness percentages) tracked from
  June baselines.

Everyone at Clever sees everything; AI Leads contribute; admins run the
program. The only gated surface is the admin-only **What's New** weekly blog.
No dollar figures exist anywhere in the product, and there is no
gamification — recognition is names on work.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Neon/Postgres + Drizzle ·
Auth.js v5 (Google, domain-gated, multi-alias identity) · Vercel AI SDK v7 via
AI Gateway (Sonnet 5 for the Coach & weekly post, Haiku 4.5 for extraction) ·
Recharts · Vitest · MCP SDK v2 (`mcp-handler`).

## Local development

```bash
pnpm install
cp .env.example .env.local        # fill in DATABASE_URL + AUTH_SECRET at minimum
pnpm db:migrate                   # apply schema
pnpm db:seed                      # idempotent real seeds (directory, roster, orgs, goals)
pnpm db:demo                      # optional: sample use cases for development
pnpm dev
```

Local Postgres via Homebrew works fine
(`brew services start postgresql@16`, then `createdb casespace` and
`DATABASE_URL=postgresql://$USER@localhost:5432/casespace`).

With `AUTH_DEV_LOGIN=1` (development only), `/signin` offers an email-only
dev login so you can try any role: `tom.leger@clever.com` (admin),
any roster email like `vamsi.chunduru@clever.com` (contributor), any other
`clever.com` address (viewer).

`pnpm test` runs the domain suite — status transitions, the two counting
rules, the ROI evidence checklist, permissions, sparse-create defaults,
target-sum warnings, view-as role resolution. `pnpm typecheck` and
`pnpm build` should both stay green.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (or `vercel link`).
2. **Database**: install the Neon integration
   (`vercel integration add neon` or the dashboard) — it provisions
   `DATABASE_URL`. The build runs `drizzle-kit migrate`, so deploys migrate
   themselves. Run the seed once against production:
   `pnpm dotenv -e <prod-env> -- pnpm db:seed` (or run it locally with the
   pulled env).
3. **Auth**: create a Google OAuth client (Google Cloud Console → OAuth 2.0
   client, web application) with redirect URI
   `https://<your-domain>/api/auth/callback/google`; set `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`, and a generated `AUTH_SECRET`.
4. **AI**: enable AI Gateway on the project (or set `AI_GATEWAY_API_KEY`).
   Without it, the Coach, notes parsing, and the weekly post degrade to
   polite notices; everything else works.
5. **Cron**: `vercel.json` schedules `/api/cron/whats-new` Mondays 13:00 UTC
   (9am EDT). Set `CRON_SECRET`; Vercel sends it automatically as the
   Authorization bearer for cron invocations.
6. Do **not** set `AUTH_DEV_LOGIN` in production (it is also hard-disabled
   outside development builds).

## The three doors

Every use case is one record, reachable three ways from "Log a use case":

1. **Walk me through it** — the Coach's guided wizard (`/coach?intent=wizard`).
2. **Start from notes** — paste anything; the parser pre-fills what it can
   defend and flags gaps (`/use-cases/from-notes`).
3. **Just the form** — no AI required (`/use-cases/new`).

All three converge on the same review-before-save screen. The AI never
writes a record without an explicit human confirmation — its proposal tools
have no execute path; the only writes are the buttons a person clicks.

## Filing from anywhere

Create a personal access token on `/profile` (shown once, SHA-256 at rest,
revocable). Token permissions follow your web role.

**MCP** (Claude Code / Cursor), streamable HTTP:

```bash
claude mcp add --transport http casespace https://<your-domain>/api/mcp \
  --header "Authorization: Bearer csp_…"
```

Tools: `log_use_case` (title + description suffice), `update_use_case`,
`list_my_use_cases`, `get_progress`.

**REST** under `/api/v1` with the same bearer token:

| Endpoint | Verb | Notes |
|---|---|---|
| `/api/v1/use-cases` | GET | filters: `status`, `department`, `q`, `mine=1` |
| `/api/v1/use-cases` | POST | sparse create — only `title` + `description` required |
| `/api/v1/use-cases/:id` | GET / PATCH | patch semantics; permissions enforced |
| `/api/v1/roster` | GET | AI Leads roster |
| `/api/v1/progress` | GET | the scoreboard: counts, targets, what's in flight |

## How the numbers work

- **The 45** counts records at Qualified **or better** — Qualified is the
  admin gate that records Kate's approval (rejections drop a record back to
  Launched with a visible reason), and Confirmed Positive ROI still counts.
- **The 15** counts records at **Confirmed Positive ROI** — an explicit
  admin-only promotion from Qualified that requires a note articulating the
  annual ROI. Always a subset of the 45. The ROI panel (success criterion,
  baseline + post with the same methodology, net-impact statement, positive
  outcome) is the evidence checklist behind the decision — gaps warn at
  confirmation time but never block; the call is Kate's.
- **In flight** sits beside the two numbers but is never folded into them:
  records logged but not yet Qualified, and how many already have all four
  documented gates met (waiting only on the Qualified gate). The program
  does not track linear pace, so nothing computes ahead/behind.
- **ELT allocation** is data (`elt_orgs`), editable by admins; departments
  with no confirmed owner (CSS, Business Operations, Business Analytics)
  stay honestly **unallocated** on the dashboard. Targets warn (never block)
  when they stop summing to 15.
- Every status change is logged (who, when, from → to, note) — the movement
  feed, attention flags, and the weekly post all read from that history.

## Data & seeds

- `data/casebook-v2-org-chart.json` — the 299-person company snapshot seeded
  into `people` (admin-editable; not live HR data). Author/owner pickers,
  roster links, and ELT rollups resolve against it.
- `scripts/seed.ts` — idempotent: admins (Tom with both aliases + Kate),
  directory, 22 teams, 25 AI Leads with emails confirmed against the
  AI Leads Google Group (any still-unverified address is flagged on
  `/roster`; emails a human verified in-app are never clobbered by
  re-seeding), ELT orgs summing to 15, pulse baselines.
- `scripts/demo-data.ts` — dev-only sample records, clearly separated.

## Open questions for Tom / Kate (carried from the brief)

1. ELT owners for CSS, Business Operations, Business Analytics — or do they
   stay unallocated? (Edit in `/roster`-adjacent admin data / `elt_orgs`.)
2. Kate's 3 — her own sponsored use cases, or a floating program bucket?
   (Currently modeled as a program-wide bucket; note stored on the org row.)
3. Real AI Lead emails to replace the flagged placeholders (`/roster`).
4. The app name — "Casespace" is a working name; nothing depends on it.
5. Is 21 days the right stale threshold? (`app_settings.stale_days`.)
