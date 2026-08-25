---
title: Deploying
audience: engineering
updated: 2026-08-25
code:
  - vercel.json
  - package.json
  - drizzle.config.ts
---

# Deploying

Vercel. The build is `drizzle-kit migrate && next build`, so **deploys
migrate themselves**.

## First-time setup

1. **Import the repo** in Vercel (or `vercel link`).

2. **Database** — install the Neon integration (`vercel integration add neon`
   or the dashboard); it provisions `DATABASE_URL`. Run the seed once against
   production:
   ```bash
   pnpm dotenv -e prod.env -- pnpm db:seed
   ```

3. **Auth** — create a Google OAuth client (Google Cloud Console → OAuth 2.0
   client, web application) with redirect URI
   `https://<your-domain>/api/auth/callback/google`. Set `AUTH_GOOGLE_ID`,
   `AUTH_GOOGLE_SECRET`, and a generated `AUTH_SECRET`.

4. **AI** — enable AI Gateway on the project, or set `AI_GATEWAY_API_KEY`.
   Without it the Coach and notes parsing degrade to polite notices, the
   weekly post is skipped entirely, and everything else works.

5. **Cron** — `vercel.json` schedules `/api/cron/whats-new` for Mondays 13:00
   UTC. Set `CRON_SECRET`; Vercel sends it as the Authorization bearer
   automatically.

6. **Do not set `AUTH_DEV_LOGIN`.** It is also hard-disabled outside
   development builds, but don't rely on that.

## Environment variables

| Variable | Required | For |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon/Postgres |
| `AUTH_SECRET` | ✅ | Auth.js session encryption |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ✅ | Google sign-in |
| `AI_GATEWAY_API_KEY` | — | Coach, notes parsing, weekly post |
| `CRON_SECRET` | — | Required for the weekly post to run |
| `AUTH_DEV_LOGIN` | — | **Development only** |

On Vercel, `VERCEL_OIDC_TOKEN` satisfies gateway auth in place of
`AI_GATEWAY_API_KEY`.

## Because local points at production

`.env.local` on the primary dev machine shares `prod.env`'s `DATABASE_URL`.
A local `pnpm db:migrate` therefore lands on the production database, and
production will be running the *old* code until you deploy. **Migrate and
deploy in the same breath**, or point local at a local database — see
[local development](local-dev.md).

`drizzle.config.ts` loads `.env.local` through dotenv, which does **not**
override variables already set in the environment. So an inline override
genuinely wins, and this is the safe way to apply a migration locally:

```bash
DATABASE_URL=postgresql://localhost:5432/casespace pnpm db:migrate
```

Never run `pnpm db:migrate` bare on that machine.

### Rolling back a role change

Reverting the code is safe but not total: an added enum value and an added
column both stay (see [data and seeds](data-and-seeds.md#migrations)). Rows
already written with a newer role would be read by older code as an unknown
role, which fails every permission check — so they degrade to **read-only**,
not to elevated access. To close the app back up without a deploy, use the
`open_to_employees` switch in
[authentication](../integrations/auth.md#the-kill-switch).

## Related

- [Local development](local-dev.md)
- [Data and seeds](data-and-seeds.md)
- [Cron](../integrations/cron.md)
