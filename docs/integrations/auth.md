---
title: Authentication
surface:
  - /signin
  - /api/auth/[...nextauth]
audience: engineering
updated: 2026-08-14
code:
  - src/app/signin/page.tsx
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

## Multi-alias identity

One human can have several addresses. `user_emails` maps every known alias to
one `users` row, so signing in with a second address resolves to the same
identity rather than creating a second account — and records credited to
either address land on the same person.

## Roles on provision

| You are | Role |
|---|---|
| A seeded admin (Tom, either alias; Kate) | `admin` |
| On the AI Leads roster | `contributor` |
| Any other `clever.com` address | `viewer` |

`allowed_login_emails` carries any explicitly permitted exceptions.

## Dev login

With `AUTH_DEV_LOGIN=1`, `/signin` also offers an email-only login so you can
try any role locally:

- `tom.leger@clever.com` → admin
- any roster email (e.g. `vamsi.chunduru@clever.com`) → contributor
- any other `clever.com` address → viewer

**Development only.** It is hard-disabled outside development builds, in
addition to being off by default — do not set it in production.

## Tokens

[Personal access tokens](../features/profile.md) are the non-browser path.
They carry the owner's role and are checked on every API and MCP request.

## Related

- [Roles and permissions](../concepts/roles-and-permissions.md)
- [Deploying](../operations/deploy.md)
