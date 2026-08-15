---
title: The casebook
surface: /use-cases
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/use-cases/page.tsx
  - src/server/use-case-queries.ts
---

# The casebook

Every use case at Clever, in one list. Open to everyone.

## Filters

All filters are URL parameters, so a filtered view is a shareable link.

| Filter | Param | Notes |
|---|---|---|
| Search | `q` | Matches title, description, and owner |
| Status | `status` | One of the seven |
| Department | `department` | One of the seven |
| Mine | `mine=1` | Records that credit you — created, owned, or authored |
| Person | `person` | Set by clicking a name anywhere in the app |
| ELT org | `elt` | Set by clicking an owner on the dashboard |

## Rules that surprise people

**An empty result never reads as an empty casebook.** When filters are
active and match nothing, the page says so and offers to clear them — a
filtered miss and a genuinely empty program look completely different, on
purpose.

**"Mine" is broader than "I created it."** A record counts as yours if you
created it, own it, or are credited as an author.

## Who can do what

Everyone reads everything. **Log a use case** appears for AI Leads and
admins.

## Related

- [The record page](record.md)
- [Logging a use case](logging-a-use-case.md)
- [`GET /api/v1/use-cases`](../integrations/rest-api.md) — same filters
