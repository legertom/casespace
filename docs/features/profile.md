---
title: Your profile and access tokens
surface: /profile
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/profile/page.tsx
  - src/components/profile/pat-manager.tsx
  - src/server/actions-pats.ts
  - src/server/pat.ts
---

# Your profile

Your identity in Casespace, and the tokens that let you file from outside the
web app.

## Personal access tokens

Create a token, name it, and use it as a bearer token against
[MCP](../integrations/mcp.md) or [the REST API](../integrations/rest-api.md).

- **Shown once.** Copy it when it's created; it is stored as a SHA-256 hash
  and cannot be shown again.
- **Format** `csp_` + 48 hex characters.
- **Revocable** at any time, from this page.
- **Last used** is recorded, so you can tell a live token from a forgotten one.
- **Permissions follow your web role.** A token doesn't grant anything your
  account doesn't already have — a viewer's token can read, not create.

## Filing from anywhere

The page carries copy-paste setup for both surfaces — the `claude mcp add`
command and the REST endpoint table.

## Who can do what

Everyone has a profile and can create their own tokens. Tokens are personal;
nobody sees anyone else's.

## Related

- [MCP](../integrations/mcp.md)
- [REST API](../integrations/rest-api.md)
- [Authentication](../integrations/auth.md)
