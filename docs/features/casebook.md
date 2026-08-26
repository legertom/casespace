---
title: The casebook
surface: /use-cases
audience: everyone
updated: 2026-08-26
code:
  - src/app/(app)/use-cases/page.tsx
  - src/server/use-case-queries.ts
  - src/lib/program-scope.ts
  - src/components/use-case-filters.tsx
  - src/lib/search-parse.ts
  - src/server/actions-search.ts
  - src/server/search-events.ts
---

# The casebook

Every use case at Clever, in one list. Open to everyone.

## Filters

All filters are URL parameters, so a filtered view is a shareable link.
There is no Filter button: every control applies the moment it changes,
program scope is the page's tabs, and the seven statuses sit in pipeline
order as a clickable rail with live counts (plus **The 45** — qualified or
better). Active filters read back as chips, each removable on its own.

| Filter | Param | Notes |
|---|---|---|
| Search | `q` | Matches title, description, and owner |
| Status | `status` | One of the seven, or `documented` for the 45's slice |
| Department | `department` | One of the seven |
| Mine | `mine=1` | Records that credit you — created, owned, or authored |
| Person | `person` | Set by clicking a name, or from a search suggestion |
| ELT org | `elt` | Set by clicking an owner on the dashboard |
| Program scope | `program` | `program` (the default), `community`, or `all` |

### The search box speaks the program's vocabulary

Typing suggests use cases, people, departments, and statuses as you go.
People match by name-part the way credit does — accents folded — plus the
abbreviations people actually type: "pati" finds Patricia even though
Patricia doesn't start with "pati". A phrase the rules understand, like
`launched in css by lotte`, offers to become filters in one click; the
filters it applies are ordinary chips you can see and remove.

When the rules can't read a query, an **Ask AI** row appears (only when AI
is configured). Clicking it — and only clicking it — sends the query to the
extraction model, which maps it onto the same URL params. A name the
directory doesn't know is dropped and said out loud, never guessed.

## Rules that surprise people

**The casebook defaults to the program, not to everything.** This is the one
deliberate exception to "the casebook shows everything", and it is there
because this is the page the program is run from. Anyone at Clever can log a
use case; records owned outside the AI Leads roster carry a **Community**
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

**The AI never watches you type.** Suggestions and the phrase parser are
plain rules running in your browser. The model runs only when you click the
Ask AI row, its call is metered in `ai_usage` like every other feature, and
its output is filters you can see — never a result list nobody can explain.

**Searches are logged, keystrokes are not.** A settled query (you stopped
typing), an applied parse, and an Ask AI click each write one row to
`search_events` — query text, how it resolved, how many records matched.
That log is how the parser's vocabulary grows and how the AI fallback proves
it earns its keep. Nothing records partial keystrokes.

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
