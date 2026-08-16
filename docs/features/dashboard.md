---
title: The dashboard
surface: /dashboard
audience: everyone
updated: 2026-08-16
code:
  - src/app/(app)/dashboard/page.tsx
  - src/components/dashboard/program-dashboard.tsx
  - src/lib/platform-queue.ts
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

A transit line. One station per status in pipeline order, and one standing
figure for every record waiting at that station now. Shaded by depth through
the pipeline, and each station clicks through to its records.

A crowd wraps into ranks of eight (`queueRanks()`), spread evenly rather than
filling the front rank first — a greedy fill leaves the back rank holding
whatever is left over, and one figure standing alone reads as a rendering
bug. The drawing grows only as tall as the deepest crowd needs.

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

## Rules that surprise people

**A figure is always the same size.** A busier station stands deeper, never
denser — the count of ranks is the encoding, and one record looks like one
record wherever it is. Past roughly sixteen at a single station the crowd
reads as an area rather than a queue length, which is why the count sits
under every platform in numerals.

**The pipeline chart says nothing about how far work got.** It is a snapshot
of where records are sitting today, not a funnel — nothing on it is
cumulative, so a thin station means "few here", never "few made it this
far". Attrition is a different question and does not have a view yet.

## Who can do what

Read-only for everyone, all roles. Nothing on this page is gated and nothing
on it is editable — the numbers change by records changing.

## Related

- [Counting rules](../concepts/counting-rules.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
- [`GET /api/v1/progress`](../integrations/rest-api.md) — the same report as JSON
