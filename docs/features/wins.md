---
title: Wins
surface: /wins
audience: admin
updated: 2026-08-14
code:
  - src/app/(app)/wins/page.tsx
  - src/server/wins-queries.ts
  - src/components/wins/copy-wins.tsx
---

# Wins

The end-of-year report: every confirmed win with the annual-ROI note behind
it. **Admin-only** (`canViewWins`).

## Why this page is gated

It is one of only two read exceptions in the app. Annual-ROI confirmation
notes may carry **dollar figures**, and dollars never appear on an open
surface. The wins themselves are not secret — every record on this page is
readable by everyone in [the casebook](casebook.md). The *notes* are what's
gated.

## What's on it

For each record at Confirmed Positive ROI:

- Title, department, team, ELT org
- Owner and credited authors
- When it was confirmed, and by whom
- **The annual-ROI note** from the confirming status change
- The net-impact statement from the record

Sorted newest confirmation first. **Copy** lifts the whole report for the
end-of-year write-up.

## Where the note comes from

The note is read from the most recent promotion into Confirmed Positive ROI
in `status_changes`. A record that was demoted and re-confirmed carries its
**latest** confirmation — the note that reflects the current decision.

This is why the note is mandatory at confirmation time: this page is the
reason it exists.

## Related

- [Statuses](../concepts/statuses.md)
- [Gates and ROI](../concepts/gates-and-roi.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
