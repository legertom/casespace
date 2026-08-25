---
title: The casebook
surface: /use-cases
audience: everyone
updated: 2026-08-25
code:
  - src/app/(app)/use-cases/page.tsx
  - src/server/use-case-queries.ts
  - src/lib/program-scope.ts
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
| Program scope | `program` | `program` (the default), `community`, or `all` |

## Rules that surprise people

**The casebook defaults to the program, not to everything.** This is the one
deliberate exception to "the casebook shows everything", and it is there
because this is the page the program is run from. Anyone at Clever can log a
use case; records logged outside the AI Leads roster carry a **Community**
badge and sit behind `?program=community` or `?program=all`. When the program
view is empty but community records exist, the empty state says so and links
straight to them. See
[counting rules](../concepts/counting-rules.md#program-and-community).

Two places deliberately ignore this default: your own records on the home
page, and `GET /api/v1/use-cases`. You always see your own work, and an API
collection that silently shrank would break every script already reading it.

**Only community records are badged.** In-program is the norm, and a chip on
every other row would be noise. No badge means it counts.

**An empty result never reads as an empty casebook.** When filters are
active and match nothing, the page says so and offers to clear them — a
filtered miss and a genuinely empty program look completely different, on
purpose.

**"Mine" is broader than "I created it."** A record counts as yours if you
created it, own it, or are credited as an author.

**One person, several spellings.** Your login name and your directory name
are often written differently — "Tom Leger" signing in, "Tom Léger" on the
org chart — and credit typed by hand uses whichever one the writer reached
for. `mine=1` and `person=` match across all of them: case and accents are
folded before comparing. This is not fuzzy matching. "Tom Leger" and
"Tom Léger" are the same name once the accent is off; "Tom Legere" is still
a different person.

## Who can do what

Everyone reads everything. **Log a use case** appears for AI Leads and
admins.

## Related

- [The record page](record.md)
- [Logging a use case](logging-a-use-case.md)
- [`GET /api/v1/use-cases`](../integrations/rest-api.md) — same filters
