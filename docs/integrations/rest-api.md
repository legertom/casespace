---
title: REST API (v1)
surface:
  - /api/v1/use-cases
  - /api/v1/use-cases/[id]
  - /api/v1/progress
  - /api/v1/roster
audience: engineering
updated: 2026-08-15
code:
  - src/app/api/v1/use-cases/route.ts
  - src/app/api/v1/use-cases/[id]/route.ts
  - src/app/api/v1/progress/route.ts
  - src/app/api/v1/roster/route.ts
  - src/server/api-serializers.ts
  - src/lib/use-case-input.ts
---

# REST API (v1)

Everything under `/api/v1`. Authenticate with a
[personal access token](../features/profile.md) as a bearer token:

```bash
curl -H "Authorization: Bearer csp_…" https://<your-domain>/api/v1/progress
```

**Permissions follow the token owner's web role** — the API is not a way
around them.

## Endpoints

| Endpoint | Verb | Notes |
|---|---|---|
| `/api/v1/use-cases` | GET | Filters: `status`, `department`, `q`, `mine=1` |
| `/api/v1/use-cases` | POST | Sparse create — only `title` + `description` required |
| `/api/v1/use-cases/:id` | GET | Includes full status history |
| `/api/v1/use-cases/:id` | PATCH | Patch semantics — only provided fields change |
| `/api/v1/roster` | GET | AI Leads, with teams and unverified-email flags |
| `/api/v1/progress` | GET | The scoreboard: counts, targets, in flight, pipeline, per-org and per-team splits, attention flags |

Unknown values for `status` and `department` are **ignored**, not rejected —
a typo returns unfiltered results rather than an error.

## Creating

```bash
curl -X POST https://<your-domain>/api/v1/use-cases \
  -H "Authorization: Bearer csp_…" \
  -H "Content-Type: application/json" \
  -d '{"title":"Weekly report drafting","description":"Claude drafts the CSS weekly from ticket exports."}'
```

Returns `201` with `{ id, url }`. Everything not supplied defaults to the
emptiest honest value — see
[sparse is safe](../features/logging-a-use-case.md#sparse-is-safe).
Records created this way are stamped `source: api`.

## Status is not settable here

A create may include `status`, but only one of the five working statuses
(In Discovery through Launched). Qualified and Confirmed Positive ROI can
never be set over the API — they are granted in the app by an admin, and a
create naming either is rejected with `422`. On existing records, status
changes go through the app so the history stays complete and the admin gates
stay meaningful — `status` in a PATCH body never applies. See
[statuses](../concepts/statuses.md).

## Status codes

| Code | Means |
|---|---|
| `200` / `201` | Fine |
| `400` | Body wasn't valid JSON |
| `401` | Missing, malformed, or revoked token |
| `403` | Your role can't do that (`ForbiddenError`) |
| `404` | No such record |
| `422` | Validation failed — `issues` carries the tree |
| `500` | Logged server-side; the response says nothing more |

## Related

- [MCP](mcp.md) — the same operations as tools
- [Your profile](../features/profile.md) — creating a token
