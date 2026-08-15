---
title: Counting rules
audience: everyone
updated: 2026-08-14
code:
  - src/lib/domain.ts
  - src/server/progress-report.ts
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

## ELT allocation

The 15 is allocated across ELT owners in `elt_orgs` — data, editable by
admins, not a constant. Departments with no confirmed owner (CSS, Business
Operations, Business Analytics) show as honestly **unallocated** rather than
being assigned to someone who hasn't agreed.

`targetSumWarning()` warns when per-org targets stop summing to 15. It warns;
it never blocks. See [people, roster, and ELT](people-and-elt.md).

## Related

- [Statuses](statuses.md)
- [The dashboard](../features/dashboard.md)
- [`GET /api/v1/progress`](../integrations/rest-api.md)
