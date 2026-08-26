---
title: Counting rules
audience: everyone
updated: 2026-08-25
code:
  - src/lib/domain.ts
  - src/server/progress-report.ts
  - src/db/scopes.ts
  - src/lib/program-scope.ts
---

# Counting rules

Two numbers, two rules, both pure functions with tests. If a number on a page
disagrees with this doc, the doc or the page is wrong — the functions are the
source of truth.

## The 45

`countsTowardDocumented(status)` — true at **Qualified or better**. That is
Qualified *and* Confirmed Positive ROI.

Meeting the four documented gates is **not** enough. Qualified is an admin
gate that records Kate's approval; a record with all four gates ticked and no
promotion counts as *in flight*, not documented.

## The 15

`countsTowardRoi(status)` — true **only** at Confirmed Positive ROI.

Never derived from the ROI fields. A record can have a complete, positive,
well-measured ROI panel and still not count: the number tracks Kate's
explicit decision, made with a mandatory annual-ROI note. Because the status
is reachable only from Qualified, **every record in the 15 is also in the
45**.

## In flight

Shown beside the two numbers, **never folded into them**. Two figures:

- Records logged but not yet Qualified.
- How many of those already have all four documented gates met — i.e.
  waiting only on the Qualified gate.

## No pace math

The program does not track linear pace, so nothing in Casespace computes
"ahead" or "behind" a burn-down. Work does not arrive evenly and a pace
number would invent pressure that the program does not intend. Progress is
shown as counts against targets, plus what is in flight behind them.

## Program and community

Anyone with a `@clever.com` address can log a use case. Not every record
counts toward the two numbers.

`use_cases.in_program` decides it. It is **stamped once, at creation**, from
the record's **owner** (`inProgramAtCreation`): a record whose owner is on
the AI Leads roster is a program record, whoever typed it in. A record with
no linked owner falls back to whoever logged it — a lead's own unowned
record counts; anyone else's, employees and admins alike, is a **community**
record.

Community records are real records: full worksheet, full ROI section,
editable by whoever logged them, listed and searchable in the casebook. They
are simply not what the 45 and the 15 count.

**The rule the whole design turns on: metrics are program-only; lists are
everything, labeled.**

| Surface | Shows |
|---|---|
| The dashboard, `/goals`, `/graphs`, `GET /api/v1/progress`, the Coach's `get_progress`, the weekly post's numbers | Program only |
| The casebook, `GET /api/v1/use-cases`, the Coach's `search_use_cases`, MCP `list_my_use_cases` | Both, each record carrying `inProgram` |
| The casebook's default view | Program, with a filter to see community or both |
| Your own records on the home page | Both, always — you always see your own |

An admin can add a community record to the program or take one out, on the
record page. `GET /api/v1/progress` carries a `community.logged` count so the
exclusion is visible rather than silent.

### Rules that surprise people

**The owner decides, not the keyboard.** Most of the casebook is typed in by
whoever has the record in front of them — often an admin on a lead's behalf —
and that must not decide what counts (Tom's call, 2026-08-25, revising the
same-day logged-by rule). A record Tom enters for a lead counts; a workflow
Tom or Kate logs as their own starts as a community record, exactly like
anyone else's. The 45 is what the *AI Leads* own, and both gestures that
admit anything else — the toggle and promotion past the Qualified gate — are
admin-only, so an admin who means a record to count says so in one click.

**Membership is never re-derived.** It records whose the record was *at the
time*, which is the point: an AI Lead who leaves the roster does not
retroactively empty the casebook, a community record does not become program
work because its owner was added to the roster later, and changing a
record's owner afterward moves credit, not membership. Only an admin moves
membership, by hand.

**Promotion past the Qualified gate silently admits a record to the
program.** Moving anything to Qualified or Confirmed Positive ROI sets
`in_program` to true, because that transition *is* an admin saying the record
counts. Without it, an admin who qualifies a community record and forgets the
toggle would leave the Wins report and the dashboard's 15 disagreeing.
Demotion does **not** clear it — only the explicit toggle does.

**Movement and the weekly post filter on the record's current flag, not the
flag it had at the time.** Taking a record out of the program erases its
history from "Movement this week", and re-drafting an old What's New week
after a flip will produce different prose than the post people already read.
This is the right default — the flag answers "does this count?" — but it does
mean the flag is retroactive for those two surfaces.

**Coverage by team counts program records at every status.** It is the one
table that asks "did they start", not "did they finish", so it has no status
filter. It does have the program filter, and it needs it: without it, a team
whose lead logged nothing but whose colleagues logged three things would
render as having met its target.

**There is no audit trail for membership changes.** `status_changes` is for
statuses, and a `from === to` row there would poison Movement and the What's
New promotion/regression split, which both compare `statusRank`.

## ELT allocation

The 15 is allocated across ELT owners in `elt_orgs` — data, editable by
admins, not a constant. Departments with no confirmed owner (CSS, Business
Operations, Business Analytics) show as honestly **unallocated** rather than
being assigned to someone who hasn't agreed.

`targetSumWarning()` warns when per-org targets stop summing to 15. It warns;
it never blocks. See [people, roster, and ELT](people-and-elt.md).

## Related

- [Statuses](statuses.md)
- [Roles and permissions](roles-and-permissions.md)
- [The dashboard](../features/dashboard.md)
- [`GET /api/v1/progress`](../integrations/rest-api.md)
