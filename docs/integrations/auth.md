---
title: Authentication
surface:
  - /signin
  - /api/auth/[...nextauth]
audience: engineering
updated: 2026-08-26
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

## Roles on every request

The stamp above records who you were at your **last sign-in**, and a session
outlives a sign-in by weeks. So the `employee` rung — and only that rung — is
re-derived on every request by `deriveRequestRole`, with `employeeStanding`
in `auth-provision.ts` doing its reads. A stored `viewer` who holds a
`clever.com` alias is read as an employee; a stored `employee` drops to
`viewer` the moment the kill switch closes.

This runs on both authenticated paths — the browser (`getCurrentUser`) and
API tokens (`authenticatePat`) — so a tab and a token always agree about
their owner.

It re-derives the bottom two rungs and nothing above them: `admin` and
`contributor` come from `admin_emails` and the roster, which are sign-in
questions, and they pass through untouched. Nothing here can hand out power
the sign-in ladder wouldn't.

Why both directions, and not just the stamp: when the app opened to everyone
at Clever on 2026-08-25, everyone still holding a session from before that
day kept a `viewer` stamp — no *Log a use case* button and no writes, on an
app telling them it was theirs — until they happened to sign in again.
Migration `0016` promoted those rows once; this is what keeps the hole from
reopening the next time the switch is turned back on.

### The kill switch

`app_settings.open_to_employees` gates the `employee` rung. Absent or `true`
means on, which is the default — the setting exists so the app can be closed
back up in one row without a deploy, not so it has to be opened in one. Set
it to `false` and every non-roster `clever.com` address drops to `viewer` on
their **next request**, browser and token alike — see above, it does not wait
out anyone's session — which restores exactly the behaviour before
2026-08-25. Admins and AI Leads are unaffected either way: the switch must
never lock the program out of its own tool.

The row is seeded on fresh databases; on one seeded before the setting
existed, an `UPDATE` matches nothing and silently does nothing, so use the
upsert form. Off-ish hand-written values (`"false"`, `"off"`, `0`) also
count as off — `employeesOpen` in `lib/login-role.ts` parses defensively.

```sql
insert into app_settings (key, value) values ('open_to_employees', 'false'::jsonb)
on conflict (key) do update set value = 'false'::jsonb;
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
That role is the owner's **real** role, re-derived per request like the
browser's — tokens are deliberately not subject to `view as` — so the same
`POST /api/v1/use-cases` body creates a program record from an AI Lead's
token and a community record from an employee's. See [counting rules](../concepts/counting-rules.md#program-and-community).

## Related

- [Roles and permissions](../concepts/roles-and-permissions.md)
- [Deploying](../operations/deploy.md)
