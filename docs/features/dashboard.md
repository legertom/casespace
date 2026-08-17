---
title: The dashboard
surface: /dashboard
audience: everyone
updated: 2026-08-17
code:
  - src/app/(app)/dashboard/page.tsx
  - src/components/dashboard/program-dashboard.tsx
  - src/components/dashboard/pipeline-conversion.tsx
  - src/components/dashboard/pipeline-switcher.tsx
  - src/lib/pipeline-chart.ts
  - src/lib/platform-queue.ts
  - src/server/actions-preferences.ts
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

Two drawings of the same seven counts, and **you pick which one you see**.
The choice is remembered on your user row (`users.pipeline_chart`), so it
follows you between devices rather than living in a cookie. Everyone starts
on **Funnel**.

- **Funnel** — bar length is how many records reached that stage *or any
  stage beyond it*, with the step conversion from the stage above. Steps
  under 60% are flagged.
- **Platforms** — a transit line: one station per status, one standing figure
  for every record waiting there now. A crowd wraps into ranks of eight
  (`queueRanks()`), spread evenly rather than filling the front rank first,
  because a greedy fill leaves one figure standing alone in the back rank and
  that reads as a rendering bug.

Both are rendered on the server and handed to the switcher, so changing view
costs a click and not a page load. Every stage in either drawing clicks
through to its own records.

The reasoning behind both, and the twenty-four drawings that lost, is at
[/graphs](graphs.md).

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

**Funnel bars are two-tone, and the solid part is the clickable one.** The
pale bar is how many reached that stage or beyond; the solid bar inside it is
how many are sitting there now, which is what the row's link delivers. A
single-tone funnel would show one number and hand you a different one on
click. The invariant — solid never exceeds pale — is asserted in
`pipeline-conversion.test.ts`.

**Funnel widths cannot warn you.** Reaching a stage or beyond is a suffix sum,
so it only ever falls along the pipeline: the funnel narrows tidily whatever
the data does. Platforms is the drawing that can look wrong, which is the
whole reason both are offered rather than one being settled on.

**A funnel implies "passed through"; this shows "at or beyond".** An admin can
move a record from any status to any other, including straight to Confirmed
Positive ROI without it ever being Qualified. The widths stay true of the
casebook right now, but the conversion percentages are computed from that
snapshot rather than from the transitions in `status_changes`. Reading them as
real conversion needs that query first.

**Viewers can set this, and only this.** Viewers are read-only everywhere
else; the preference is the exception, because it writes nothing about the
program and shows nobody anything they could not already see.

**A figure is always the same size** in Platforms. A busier station stands
deeper, never denser, so one record looks like one record wherever it is. Past
roughly sixteen at a single station the crowd reads as an area rather than a
queue length, which is why the count sits under every platform in numerals.

## Who can do what

Read-only for everyone, all roles. Nothing on this page is gated and nothing
on it is editable — the numbers change by records changing.

## Related

- [Counting rules](../concepts/counting-rules.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
- [`GET /api/v1/progress`](../integrations/rest-api.md) — the same report as JSON
