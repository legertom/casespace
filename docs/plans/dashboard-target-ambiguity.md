# Dashboard: two target systems read as one, and they aren't

Status: draft problem statement + rough plan, for review. No code changed yet.
Revised after a code check — see "What isn't the problem" for a claim that
didn't survive it.

## Summary

The main dashboard shows two unrelated quota systems in adjacent sections. A
viewer reasonably reads them as the same kind of progress toward the same
thing. They are not — they count different things, against different rules,
with no visible link between them.

- **"Coverage by team"** — every AI Lead's personal quota of 2 use cases.
- **"The 15, by ELT owner"** — each ELT org's share of Qualified+ (ROI
  documented) records.

Reported confusion (verbatim intent): "agents need to do two use cases each
and of those, those ELT members (teams) need 2 or 3 ROI documented use cases."
The "and of those" is the tell — it implies the second number is a subset or
consequence of the first. In the product today, it isn't visibly either.

## The problem, in three parts

### 1. Adjacent widgets, different counting rules

Both live in `src/components/dashboard/program-dashboard.tsx`:

- Team coverage (`program-dashboard.tsx:290-357`) counts **every logged use
  case for the team**, regardless of status — see
  `useCaseCount: cases.filter((c) => c.teamId === t.id).length` in
  `src/server/dashboard-queries.ts:151`. No status filter beyond
  not-deleted. A team can show "2 of 2" with both records still in
  `in_discovery`, none of the four documentation gates met.
- ELT rollup (`program-dashboard.tsx:217-287`) counts **only Qualified+**
  records against `elt_orgs.target` (`src/server/dashboard-queries.ts:76`).
  Everything short of that (Qualified-awaiting-ROI, still mid-pipeline)
  renders as a lighter shade, not a filled slot.

A lead's "2 of 2" is not partial progress toward an ELT org's "2 of 3." They
are unrelated currencies that happen to both be small integers.

Both widgets do share a *metaphor* — N discrete slots against a small integer
target, filling left to right — which is enough for someone to carry "filled
= done" from one to the other. That's a labeling problem, not a styling one
(see below).

### 2. No visible arithmetic connects either target to the two headline numbers

- Team target = `assigned leads × 2`, computed live from roster
  (`getTeamCoverage`, `src/server/dashboard-queries.ts:145`).
- ELT target = a stored, admin-edited value on `elt_orgs.target`, intended
  to sum to 15 (`targetSumWarning`, `src/lib/domain.ts:233`).

`TARGET_DOCUMENTED = 45`, `TARGET_ROI = 15`, and `WORKFLOWS_PER_LEAD = 2`
sit in `src/lib/domain.ts:12-15` as three independent constants with no
asserted relationship between them, and the UI never draws one.

Confirmed with Tom: **leads × 2 is not expected to reach 45.** It's a
contributor, not the whole plan — the remainder gets sourced outside the AI
Lead quota. That's a deliberate design, and it's exactly the kind of thing
the page should say out loud, because a viewer doing the arithmetic will
otherwise conclude the numbers don't add up and assume something is broken.

### 3. Overloaded vocabulary in the one place it matters most

The "45" hero number is explicitly labeled "Qualified or better"
(`program-dashboard.tsx:149`). Team coverage's table headers do name their
bar — the columns read "Logged" and "Toward 2 per lead"
(`program-dashboard.tsx:298-300`).

What's left vague is the one prose line above them: "Every AI Lead builds two
workflows for their function" (`program-dashboard.tsx:293`). "Builds" is
silent on status, and it sits directly over a column labeled Logged. That
sentence is where someone is most likely to ask "does this count toward the
45?" and it's the only part of the widget that doesn't answer.

## What isn't the problem

An earlier draft claimed the two widgets share visual grammar — "a row of
small rounded dots, same size, same section of the page" — and proposed
restyling one of them. The code doesn't support it:

- ELT slots are `h-full flex-1 rounded-[3px]` — rectangles stretching the
  full row width. Team slots are `size-2.5 rounded-full` — fixed 10px
  circles. A 3-slot ELT bar is ~600px; a 2-slot team strip is ~24px.
- The ELT bar sits under a full-width clickable link row; the team dots sit
  in the fourth column of a table beside a numeric "Logged" column.
- They're separate `<section>` elements with their own `<h2>` and prose.
- The ELT section prints a three-shade legend directly above its bars
  (`program-dashboard.tsx:227-240`). Team coverage has none, because its
  dots are binary and have nothing to explain.

They already look nothing alike, and the confusion happened anyway. The
reported quote is about arithmetic — whether one number is a subset of the
other — not appearance. Restyling can't answer "does my team's logged 2
count toward the 15." Only copy can. Dropped from the plan.

## Open product question (needs a decision before any UI fix)

Does the per-lead "2" quota mean:

- (a) **log 2** — any two records exist for the team, regardless of status
  (today's actual behavior), or
- (b) **document 2** — two records reach the same "Qualified or better" bar
  the 45 uses, or
- (c) something else Tom/Kate intend that isn't encoded yet.

The UI fix depends on this answer. If (a) is actually the intent, the fix is
purely about copy. If (b), `getTeamCoverage`'s count needs a status filter.

**The migration cost is currently zero.** Counted against prod on 2026-08-09:
22 teams, all with a target, and **not one is full**. 21 of 22 have nothing
logged at all; the single exception (App Partnerships) has 1 logged, 0
Qualified. Total Qualified+ across every team is 0.

So the earlier worry — that (b) would drop a wall of teams from "2 of 2" to
"0 of 2" overnight — doesn't apply. There is no number to regress. Whichever
definition is right, **now is the cheapest moment to encode it**, and that
cost only goes up as leads start logging. This argues for deciding (a) vs (b)
on the merits, not on migration pain.

## Rough early plan (not decided — for review)

1. **Answer the open question above first.** Everything else follows from
   it.
2. **Rewrite the one vague line under "Coverage by team."** Replace "builds
   two workflows" with something that names the bar the dots actually
   measure — matching whichever answer (1) produces. One sentence.
3. **Say how the numbers relate, including that they don't fully add up.**
   A line under "Coverage by team" to the effect that lead quotas are one
   source of the 45 rather than all of it, and that ELT owners claim 15 of
   the 45 as Qualified+. Exact wording TBD — needs Tom/Kate's voice, not
   invented here.
4. **Audit "documented" vs "logged" vs "Qualified" vs "Qualified+" for
   consistent use** across `program-dashboard.tsx`, the roster page, and the
   README, so the same word always means the same status boundary. Scoped to
   word choice; no component changes expected.

## Non-goals for this pass

- Not changing `getTeamCoverage`'s underlying query until (1) is answered.
- Not restyling either widget — they're already visually distinct, and the
  reported confusion isn't visual.
- Not touching the ELT allocation logic (`elt_orgs.target`,
  `targetSumWarning`) — that side is already well-defined and not part of
  the reported confusion.
- Not redesigning the dashboard's overall layout — scoping to the two
  specific widgets and their copy.
