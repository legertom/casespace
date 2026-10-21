---
title: Gates and ROI evidence
audience: everyone
updated: 2026-10-21
code:
  - src/lib/domain.ts
  - src/lib/roi.ts
  - src/lib/gap-flags.ts
  - src/components/record/gate-toggle.tsx
  - src/components/record/roi-readout.tsx
---

# Gates and ROI evidence

Two checklists live on every record. They look similar and do different jobs:
the **gates** describe whether a workflow is documented; the **ROI panel** is
the evidence behind a confirmation decision.

## The four documented gates

Booleans on the record, toggled by anyone who can edit it:

| Field | Gate |
|---|---|
| `gateNamed` | A named workflow with a clear description |
| `gateTool` | An identified AI tool & approach |
| `gateAdoption` | Adoption evidence beyond the author(s) |
| `gateOwner` | A named owner |

`documentedGatesComplete()` is all four. A record with all four is *ready for*
Qualified — it is not Qualified. See [counting rules](counting-rules.md).

## The ROI evidence checklist

`roiComplete()` is true when **all** of these hold:

- `successCriterion` is written, and `successCriterionMet` is `yes`
- `baselineMetric` named and `baselineValue` recorded
- `postValue` recorded
- `measurementMethod` stated — and it must be the **same methodology** as the
  baseline's, which is the point of the field
- `netImpactStatement` written
- `isPositive` is `true`
- `roiStatus` is `complete` (vs `not_yet_measurable` / `in_progress`)

`roiGaps()` turns whatever is missing into plain sentences ("No baseline
measurement", "Measurement method not stated (must match the baseline's)").

**Gaps warn; they never block.** When an admin confirms positive ROI on a
record with gaps, the gaps are shown and the confirmation still goes through.
The checklist informs Kate's judgment; it does not replace it.

## Build hours

`buildHours` is a **self-reported estimate** of roughly how many hours went
into building the workflow — asked at intake, editable on the record, shown
with the ROI measurements. It exists so the program can weigh time spent
building against time saved. A rough number is the intended precision;
nothing audits it against a timesheet.

It is the cost side of the arithmetic below.

## Kate's method, in hours

Kate's ROI workshop (the
[self-paced version](https://roi-wksp.vercel.app)) teaches one method, and
the Success & ROI section on the form and the record page follows it as
three steps:

1. **Before you build — the plan.** What kind of value (`valueType`: time
   saved or revenue, or null for "not sure yet"), how you'll know it worked
   (`successCriterion`), what you're measuring (`baselineMetric`), the
   baseline with its period (`baselineValue`, `baselineUnit`,
   `baselinePeriod` — per week, month, quarter or year), whether it was
   measured or estimated (`baselineEstimated`), and how you'll measure it
   (`measurementMethod`). No timesheet? The calendar heuristic — "how much
   time would I block to do this by hand?" — is a fine baseline, as long as
   the record says it is an estimate.
2. **At launch — expected ROI.** `buildHours`, the expected after-value
   (`expectedValue`, same unit and period), `maintenanceHoursPerYear` when
   it is more than a few, and `revisitOn` — about three runs of the process
   after launch.
3. **On the revisit date — actual ROI.** `postValue`, measured the same way,
   the `netImpactStatement`, whether the success criterion was met, and
   whether the outcome is positive and attributable. This is the half Kate
   confirms.

All three steps are always on the page; the one that matches the record's
stage opens first (`roiStepFor()`). Everything in the plan half is optional,
and a record with no value type renders exactly as it did before these
fields existed.

For a **time-saved** case, `src/lib/roi.ts` works the figures out from those
inputs — expected from `expectedValue`, actual from `postValue`:

```
ROI = (hours saved a year − build hours) ÷ build hours × 100
payback = build hours ÷ hours saved a month
year two = (hours saved a year − maintenance) ÷ maintenance × 100
```

The workshop prices time at one flat rate, and at one rate the rate cancels
out of the ratio: 108 hours saved against an 80-hour build is 35% whether
an hour is worth $75 or $200. That is what lets the percentage appear here
without a dollar figure anywhere in the product. It is also an assumption,
stated under every readout: an hour of build time and an hour of saved time
are treated as worth the same, which is exactly what the workshop does.

A **revenue** case is counts and rates — a win rate from 50% to 55%, "about
two and a half more deals a year". Turning that into a percentage needs a
deal value, and deal values are dollars, so the percentage belongs in
Kate's confirmation note (admin-only, allowed to carry them). Token costs
are dollars by nature too, so there is no field for them; a material
recurring token cost is described in the net-impact sentence.

The same function feeds the form, the record page, the proposal card, the
REST shape, and the Coach's calculator tool, so all of them show the same
number. Its tests are the workshop's own worked examples.

## Rules that surprise people

- **Build hours are deliberately not on the ROI checklist.** A record with no
  estimate has no gap: `roiComplete()` and `roiGaps()` ignore `buildHours`,
  and no status change ever blocks on it. Putting it on the checklist would
  retroactively gap every already-confirmed record and raise the bar for
  the 15 — a program decision, Kate's to make, not a side effect of adding
  a column.
- **Neither is anything in the plan half.** Value type, period, estimated,
  expected value, maintenance: none of them is in `roiComplete()` or
  `roiGaps()`. The bar for the 15 is what it was. Expected ROI is planning
  information; `computeGapFlags()` prompts a launched time-saved record for
  it, and that is as far as it goes.
- **ROI is computed in hours, and only for time-saved cases.** Not because
  revenue matters less — because the percentage needs dollars and the
  product carries none. A revenue case is reported in the audience's
  language.
- **The baseline is editable at every stage.** It used to hide behind "not
  yet measurable", which is precisely the stage Kate's step 1 says to write
  it down at. All three steps are always rendered now.
- **A percentage on every record is reporting, not gamification.** There is
  no ROI sort in the casebook, no leaderboard, no dashboard tile, and there
  should not be.

## Gap flags on drafts

`computeGapFlags()` is the draft-time cousin, shared by the notes door and
the Coach's proposal cards. It flags what a new record is missing before it
can clear the program's bars — no owner, no authors, no department, no
success criterion, no AI tool or approach, a missing ROI baseline (or a
missing revisit date when ROI isn't yet measurable), and no adoption evidence.

These are prompts on a draft, not validation. A record with every flag lit
still saves — a half-filled record that exists beats a perfect one that
doesn't.

## Related

- [Statuses](statuses.md) — where the gates get checked by a person
- [The record page](../features/record.md)
- [Wins](../features/wins.md)
