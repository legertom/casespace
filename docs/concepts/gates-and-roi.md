---
title: Gates and ROI evidence
audience: everyone
updated: 2026-08-14
code:
  - src/lib/domain.ts
  - src/lib/gap-flags.ts
  - src/components/record/gate-toggle.tsx
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
