---
title: Authentication
surface:
  - /signin
  - /api/auth/[...nextauth]
audience: engineering
updated: 2026-08-25
code:
  - src/lib/login-role.ts
  - src/lib/auth-provision.ts
  - src/app/signin/page.tsx
  - src/app/layout.tsx
  - src/app/opengraph-image.tsx
  - src/app/api/auth/[...nextauth]/route.ts
  - src/lib/auth-provision.ts
  - src/lib/current-user.ts
---

# Authentication

Auth.js v5, Google OAuth, **domain-gated to `clever.com`**. There is no
password anywhere in Casespace.

## Signing in

`/signin` offers Google. A successful sign-in from a `clever.com` address
provisions a `users` row on first visit. Addresses outside the domain are
turned away.

## What an anonymous visitor sees

Every page redirects an anonymous request to `/signin`, so that page is
Casespace's entire public face. It carries what a link unfurl (Slack,
iMessage) or an AI scraper needs to understand the app: a paragraph of prose
describing what's inside, Open Graph and Twitter tags with the app's public
description (in the root layout, so every route serves them), a generated
social card at `/opengraph-image`, and schema.org JSON-LD. The public
description lives in one place — `PUBLIC_DESCRIPTION` in
`src/app/layout.tsx`. It names the program's targets, which are public in
this repo, and nothing else.

## Multi-alias identity

One human can have several addresses. `user_emails` maps every known alias to
one `users` row, so signing in with a second address resolves to the same
identity rather than creating a second account — and records credited to
either address land on the same person.

## Roles on provision

The ladder is `deriveLoginRole` in `src/lib/login-role.ts` — pure and
unit-tested. It is checked against **every alias on the account**, not just
the address used to sign in, so Tom signing in with gmail is still an admin
and a lead whose roster address differs from the one they used is still a
contributor.

| You are | Role |
|---|---|
| A seeded admin (Tom, either alias; Kate) | `admin` |
| On the AI Leads roster | `contributor` |
| Any `clever.com` address | `employee` |
| Anything else that may sign in at all | `viewer` |

`allowed_login_emails` carries the non-`clever.com` addresses permitted to
sign in — contractors, a personal alias — and those are the accounts that
land on `viewer`. **Viewer now means "signed in but not a Clever employee."**

Because the role is recomputed on every sign-in, roster and `admin_emails`
changes need no migration; they take effect the next time that person signs
in. There is no manual role override.

### The kill switch

`app_settings.open_to_employees` gates the `employee` rung. Absent or `true`
means on, which is the default — the setting exists so the app can be closed
back up in one row without a deploy, not so it has to be opened in one. Set
it to `false` and every non-roster `clever.com` address drops to `viewer` on
next sign-in, which is exactly the behaviour before 2026-08-25. Admins and
AI Leads are unaffected either way: the switch must never lock the program
out of its own tool.

```sql
update app_settings set value = 'false'::jsonb where key = 'open_to_employees';
```

## Dev login

With `AUTH_DEV_LOGIN=1`, `/signin` also offers an email-only login so you can
try any role locally:

- `tom.leger@clever.com` → admin
- any roster email (e.g. `vamsi.chunduru@clever.com`) → contributor
- any other `clever.com` address → employee
- an address in `allowed_login_emails` → viewer

**Development only.** It is hard-disabled outside development builds, in
addition to being off by default — do not set it in production.

## Tokens

[Personal access tokens](../features/profile.md) are the non-browser path.
They carry the owner's role and are checked on every API and MCP request.
That role is the owner's **real** database role — tokens are deliberately not
subject to `view as` — so the same `POST /api/v1/use-cases` body creates a
program record from an AI Lead's token and a community record from an
employee's. See [counting rules](../concepts/counting-rules.md#program-and-community).

## Related

- [Roles and permissions](../concepts/roles-and-permissions.md)
- [Deploying](../operations/deploy.md)
