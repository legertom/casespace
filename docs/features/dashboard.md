---
title: The dashboard
surface: /dashboard
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/dashboard/page.tsx
  - src/components/dashboard/program-dashboard.tsx
  - src/server/dashboard-queries.ts
---

# The dashboard

The program scoreboard. Open to everyone — every number here is visible to
every authenticated user.

## The sections, in order

### The two numbers

The 45 and the 15 against their targets, with **in flight** beside them:
records logged but not yet Qualified, and how many of those already have all
four documented gates met. In flight is never folded into either number, and
nothing computes ahead/behind — see [counting rules](../concepts/counting-rules.md).

### The pipeline

Every record by status, in pipeline order, so you can see where work is
piling up. Shaded by depth through the pipeline.

### The 15, by ELT owner

Confirmed wins against each ELT org's target. Owners are clickable through to
their records. Departments with no confirmed owner appear as
**unallocated** — an honest gap, not an assignment. When per-org targets stop
summing to 15 a warning appears; it never blocks.

### Coverage by team

Which teams have records and which have none. This is the "who hasn't
started" view.

### Movement this week

Status changes in the last seven days, read straight from `status_changes` —
who moved what, from where to where. The same history the
[weekly post](whats-new.md) is written from.

### Needs attention

Two flags:

- **Stale** — a record that has sat in its current status for ≥ 21 days
  (`app_settings.stale_days`, `isStale()`).
- **Ready but not qualified** — all four gates met, still waiting on an
  admin.

## Who can do what

Read-only for everyone, all roles. Nothing on this page is gated and nothing
on it is editable — the numbers change by records changing.

## Related

- [Counting rules](../concepts/counting-rules.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
- [`GET /api/v1/progress`](../integrations/rest-api.md) — the same report as JSON
