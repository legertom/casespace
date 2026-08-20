---
title: MCP server
surface: /api/mcp
audience: everyone
updated: 2026-08-20
code:
  - src/app/api/mcp/route.ts
  - src/lib/ai/proposal.ts
  - src/server/progress-report.ts
---

# MCP server

File a use case from Claude Code or Cursor, mid-build, without leaving your
editor. Streamable HTTP, at `/api/mcp`.

## Setup

Create a token on [your profile](../features/profile.md), then:

```bash
claude mcp add --transport http casespace https://<your-domain>/api/mcp --header "Authorization: Bearer csp_…"
```

## Tools

| Tool | Does |
|---|---|
| `log_use_case` | Files a use case. **Title + description suffice.** People are given as full names; the server links them to the directory. `urls` takes `{ kind, label?, url }` entries — `http(s)` only, see [URL kinds](../concepts/taxonomy.md#url-kinds) |
| `update_use_case` | Updates fields on a record you created, own, or authored. Only provided fields change |
| `list_my_use_cases` | The records that credit you |
| `get_progress` | The full scoreboard — counts, targets, in flight, pipeline, per-org and per-team splits, attention flags |

## Rules that surprise people

**Status isn't settable from MCP.** `update_use_case` deliberately leaves it
alone — status changes happen in the app so the history stays complete and
the admin gates keep meaning something.

**Names, not ids.** You pass "Vamsi Chunduru", not a UUID; the server
resolves against the directory. An unmatched name is kept as an unlinked
display name rather than dropped.

**Comments are not here.** No MCP tool reads or writes them. See
[the Coach](../features/coach.md#what-the-coach-cannot-see).

## Auth

Bearer token, format `csp_` + 48 hex. Rejected tokens get no session at all
(`required: true`). Every accepted call stamps `lastUsedAt` on the token, and
records created this way are stamped `source: mcp`.

Permissions follow the token owner's web role.

## Related

- [REST API](rest-api.md)
- [Logging a use case](../features/logging-a-use-case.md)
