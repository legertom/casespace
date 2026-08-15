---
title: The program
audience: everyone
updated: 2026-08-14
code:
  - src/lib/domain.ts
---

# The program

Casespace exists to run one thing: **KR 5 — AI Adoption**, Clever's H2 2026
AI Enablement program. Kate Schaff owns it; Tom Leger runs it. The program
window is **2026-07-01 → 2026-12-31** (`PROGRAM_START` / `PROGRAM_END`).

## The two numbers

| Target | Constant | Means |
|---|---|---|
| **45 documented use cases** | `TARGET_DOCUMENTED` | Records at Qualified or better |
| **15 with quantified, positive ROI** | `TARGET_ROI` | Records at Confirmed Positive ROI |

The 15 is always a subset of the 45 — by construction, not by convention.
See [counting rules](counting-rules.md).

Alongside the two numbers sit **adoption pulse goals** (daily-use and
readiness percentages, tracked from June baselines) — see
[the Goals page](../features/goals.md).

## What "documented" means

Four gates, all four required:

1. A named workflow with a clear description.
2. An identified AI tool & approach.
3. Adoption evidence beyond the author(s).
4. A named owner.

Meeting all four does not make a record count — an admin still has to move it
to Qualified. See [gates and ROI](gates-and-roi.md).

## Two rules that shape everything

**No dollar figures anywhere in the product.** The one exception is the
annual-ROI note Kate writes when confirming a win, which may contain dollars
— which is exactly why [Wins](../features/wins.md) is the only admin-only
report.

**No gamification.** No points, badges, streaks, or leaderboards. Recognition
is names on work: authors are credited, owners are named, and the
[weekly post](../features/whats-new.md) says who did what.

## Who is who

- **Everyone at Clever** sees everything (two read exceptions, listed in
  [roles and permissions](roles-and-permissions.md)).
- **AI Leads** contribute — 25 of them, ~2 workflows each
  (`WORKFLOWS_PER_LEAD`).
- **Admins** run the program: Qualified, Confirmed Positive ROI, targets,
  roster, and the weekly post.

## Open questions

Carried from the original brief, still unresolved:

1. ELT owners for CSS, Business Operations, and Business Analytics — or do
   they stay unallocated?
2. Kate's 3 — her own sponsored use cases, or a floating program bucket?
   (Currently a program-wide bucket; the note lives on the org row.)
3. Real AI Lead emails to replace the flagged placeholders.
4. The app name — "Casespace" is a working name; nothing depends on it.
5. Is 21 days the right stale threshold? (`app_settings.stale_days`.)

## Related

- [Counting rules](counting-rules.md)
- [Statuses](statuses.md)
- [People, roster, and ELT](people-and-elt.md)
