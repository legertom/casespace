---
title: Goals and the adoption pulse
surface: /goals
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/goals/page.tsx
  - src/components/goals/pulse-chart.tsx
  - src/components/goals/snapshot-form.tsx
  - src/server/actions-goals.ts
---

# Goals

The program's targets, and the adoption pulse behind them.

## Targets

The 45 and the 15 against progress — the same counting rules as everywhere
else. Open to everyone.

## The adoption pulse

Survey readings tracked from June 2026 baselines: daily-use and readiness
percentages, charted over time (`pulse_metrics` + `pulse_snapshots`).

**The pulse charts are admin-only** (`canViewPulse`) — one of only two read
exceptions in the app. Admins add a snapshot from this page; the chart picks
it up.

The casebook, every record, and every record's status stay open to everyone.
The pulse is survey data about people, which is why it is the exception.

## Who can do what

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| See targets and progress | ✅ | ✅ | ✅ |
| See pulse charts | — | — | ✅ |
| Add a pulse snapshot | — | — | ✅ |

## Related

- [The program](../concepts/program.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
