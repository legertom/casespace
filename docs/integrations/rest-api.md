---
title: REST API (v1)
surface:
  - /api/v1/use-cases
  - /api/v1/use-cases/[id]
  - /api/v1/progress
  - /api/v1/roster
audience: engineering
updated: 2026-08-25
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
| `/api/v1/use-cases` | GET | Filters: `status`, `department`, `q`, `mine=1`, `inProgram=1\|0` |
| `/api/v1/use-cases` | POST | Sparse create — only `title` + `description` required |
| `/api/v1/use-cases/:id` | GET | Includes full status history |
| `/api/v1/use-cases/:id` | PATCH | Patch semantics — only provided fields change |
| `/api/v1/roster` | GET | AI Leads, with teams and unverified-email flags |
| `/api/v1/progress` | GET | The scoreboard: counts, targets, in flight, pipeline, per-org and per-team splits, attention flags, `community.logged` |

Unknown values for `status` and `department` are **ignored**, not rejected —
a typo returns unfiltered results rather than an error.

History entries name their step, date, and who moved it — but `note` comes
back `null` unless the token's owner is an admin. Notes are in-app context
(rejection reasons, the annual-ROI confirmation), and the API takes the
stricter line: admin tokens get them all, other tokens get none. Read them
in the app, on the record's History.

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

## Links on a record

`urls` is an array of `{ kind, label?, url }`, where `kind` is one of `live`,
`github`, `claude`, or `other` (default `other`) — see
[URL kinds](../concepts/taxonomy.md#url-kinds). It appears on every use-case
response and is accepted on POST and PATCH. A PATCH replaces the whole list;
`[]` clears it, and omitting the key leaves it alone.

```bash
-d '{"title":"…","description":"…","urls":[
      {"kind":"github","url":"https://github.com/clever/thing"},
      {"kind":"other","label":"Runbook","url":"https://example.com/runbook"}]}'
```

Only `http://` and `https://` are accepted; anything else is a `422`, as are
single-label hosts like `http://localhost:3000`. This is a security rule —
these render as clickable links inside the app.

## Status is not settable here

A create may include `status`, but only one of the five working statuses
(In Discovery through Launched). Qualified and Confirmed Positive ROI can
never be set over the API — they are granted in the app by an admin, and a
create naming either is rejected with `422`. On existing records, status
changes go through the app so the history stays complete and the admin gates
stay meaningful — `status` in a PATCH body never applies. See
[statuses](../concepts/statuses.md).

## Program and community

Anyone at Clever can log a use case; only records logged by an AI Lead or an
admin count toward the program. Every record carries **`inProgram`**.

The two endpoints deliberately disagree, and this is the thing to know before
you file a bug about it:

- **`/api/v1/use-cases` returns everything.** Silently shrinking a documented
  collection would break scripts already reading it. Narrow it yourself with
  `?inProgram=1` (program) or `?inProgram=0` (community); omit it for both.
- **`/api/v1/progress` counts program records only** — every field in it.
  `community.logged` carries the number excluded, so the gap between the two
  endpoints is always explainable.

**A token stamps according to its owner's real role.** Tokens are not subject
to `view as`, so the same `POST /api/v1/use-cases` body creates a program
record from an AI Lead's token and a community record from an employee's.
Membership is not settable through the API at all — it is stamped at creation
and changed only by an admin in the app, for the same reason
[status is not settable here](#status-is-not-settable-here).

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
