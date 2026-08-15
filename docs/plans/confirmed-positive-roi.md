# Confirmed Positive ROI: a stage Kate sets, not a formula she trips

Status: **built 2026-08-13.** Tom's direction: "do what Kate says — she is
the customer," which resolved every open decision in Kate's favor (her 7:02
model): no rename of Qualified; new stage named Confirmed Positive ROI;
promotion admin-only and only from Qualified; the annual-ROI note is the one
hard requirement (ROI-panel gaps warn, never block); the wins roll-up is the
admin-only `/wins` page with copy-as-Markdown; the one existing Q+ record is
Kate's to re-promote by hand so its note exists. Sourced from Kate's Slack
messages of 2026-08-12 (6:53–7:02 PM, verbatim in the appendix).

## Summary

Kate asked for four things, and the last three are really one feature:

1. **Counting**: the 45 counts anything Qualified or better; the 15 counts
   only workflows with measured, positive ROI. A workflow must be able to
   count toward the 45 *without* counting toward the 15.
2. **An additional stage** in the "Move it forward" dropdown that she moves a
   workflow to when its ROI is confirmed — her words: "maybe I just need an
   additional option here?"
3. **A forced comment** when moving to that stage, articulating the annual
   ROI.
4. **Retrievable later**: she wants to roll all those comments up into an
   EOY report of the wins.

Today the 15 is *derived*: `isQualifiedPlus` = status `qualified` AND
`roiComplete` over the seven structured ROI-panel fields
(`src/lib/domain.ts:187`). Nobody chooses it; the record Kate qualified
happened to have complete ROI scoring, so it silently counted in both tiles.
That mechanism has a real timing problem she called out: she'll qualify many
workflows now and confirm ROI months later. The plan replaces the derived
marker with an explicit seventh status she controls.

## What the thread actually decided (read it closely)

- Kate's 6:53 ask — *rename* Qualified to "Confirmed positive ROI" — was
  **superseded by her own 7:02 model**: Qualified stays the 45-gate
  ("launched and meet all 4 gates"), and a *new* designation marks the ones
  that also count toward the 15. Tom said in Slack "I'll change the stage
  name to Confirmed Positive ROI" before that refinement landed.
  **This plan does not rename Qualified.** The new stage takes the name
  "Confirmed Positive ROI" instead. Worth a one-line confirmation back to
  Kate before building.
- Tom confirmed the arithmetic: 45 Qualified-or-better, of which ~15 (so
  effectively "30 Qualified, 15 Q+" if the 15 lands) — the 15 is a subset of
  the 45, never a separate pool.

## Part 1 — The new status

Append `confirmed_positive_roi` to the pipeline, after `qualified`:

> In Discovery → Approved by FL → Under Construction → In Testing →
> Launched → Qualified → **Confirmed Positive ROI**

- `src/lib/domain.ts`: add to `STATUSES`; label "Confirmed Positive ROI",
  short label "ROI Confirmed". `statusRank` works unchanged.
- **Counting functions become the single source of truth:**
  - `countsTowardDocumented(status)` → `qualified` **or**
    `confirmed_positive_roi`. (Critical: without this, confirming a
    workflow's ROI would *drop it out of the 45*.)
  - New `countsTowardRoi(status)` → `confirmed_positive_roi` only. Replaces
    `isQualifiedPlus` at every call site.
- `canSetStatus`: any transition entering or leaving *either* of the top two
  stages is admin-only (today's rule for `qualified`, extended).
- **Promotion path**: `confirmed_positive_roi` is reachable **only from
  `qualified`** — that's Kate's stated workflow ("mark many as qualified,
  then wait a bit to see if we get the positive ROI") and it keeps the
  subset invariant structural. Demotion goes back to `qualified` (or lower,
  admin's call).
- `roiComplete` / `roiGaps` and the ROI panel **stay**, demoted from gate to
  evidence checklist: shown as a warning on promotion (see Part 2) and still
  driving the Coach's ROI-review flow and the API's gap list.

### DB migration

- `uc_status` is a `pgEnum` (`src/db/schema.ts:40`): one drizzle migration,
  `ALTER TYPE uc_status ADD VALUE 'confirmed_positive_roi'`. Enum additions
  must commit before first use — fine as its own migration file, deployed
  before the code that writes it.
- Two new columns on `use_cases`, mirroring the `qualifiedAt`/`approvedById`
  pair: `roiConfirmedAt`, `roiConfirmedById`. Cleared on demotion. The EOY
  report wants the date; "who confirmed" is one column while we're here.
- **No data migration.** Prod has exactly one record counting as Q+ today
  (Kate's screenshot: 1 of 15). Auto-promoting it would create a confirmed
  record *without* the annual-ROI comment — the artifact the whole feature
  exists to capture. Kate re-promotes it by hand in under a minute.
- `scripts/demo-data.ts`: give the demo set a confirmed record or two.

## Part 2 — The forced annual-ROI comment

Mechanics ride on what exists: `statusChanges.note` (`src/db/schema.ts:323`)
already stores an optional note per transition, and `StatusControls` already
renders the input.

- **UI** (`src/components/status-controls.tsx`): when the selected target is
  `confirmed_positive_roi`, the note field becomes required — relabeled
  "Annual ROI (required)", placeholder to the effect of "State the measured
  annual ROI — this line is what rolls up into the end-of-year wins report."
  Textarea rather than the one-line input; button disabled while blank.
- **Server** (`setStatus`, `src/server/use-case-service.ts:246`): reject the
  transition with a clear error when the note is blank. Server-side rule,
  not just UI — the MCP/API path must enforce it too.
- **ROI panel completeness is a warning, not a blocker**: if `roiGaps`
  is non-empty at promotion time, show the gaps above the confirm button
  ("Heads up — the ROI panel says: no post-measurement, …") but let Kate
  proceed. She asked for exactly one hard requirement — the comment. The
  gate is her judgment, same as Qualified records her approval. (Flagged as
  a decision below in case Tom wants the panel complete first.)

## Part 3 — Where the old derived Q+ shows up, and what each spot becomes

Every `isQualifiedPlus` call site, from a sweep of the code:

| Surface | Today | Becomes |
| --- | --- | --- |
| `getProgramCounts` (`dashboard-queries.ts:39`) | `qualifiedPlus` derived per row | count of the new status; `qualified` tile-1 count becomes qualified + confirmed |
| Dashboard tile 2 (`program-dashboard.tsx`) | "Quantified, positive ROI — Qualified+" | "Quantified, positive ROI — Confirmed"; sub-line "N Qualified, awaiting ROI confirmation" |
| Pipeline chart | six bars | seven bars |
| `getEltProgress` three-shade bars | qualifiedPlus / qualified-in-flight / pipeline | same three shades, now by status; legend copy updates |
| Movement feed `becameQualifiedPlus` | derived at read time | `toStatus === "confirmed_positive_roi"` |
| `QualifiedPlusBadge` (`status-badge.tsx:29`, tooltip says "never hand-set") | derived marker | delete; the status badge itself is the marker (new `bg-st-*` color) |
| Use-cases list `?status=qualified_plus` pseudo-filter (`use-cases/page.tsx:70`) | filters qualified + roiComplete | real status filter; keep the old param as an alias so old links work |
| API serializers `qualifiedPlus`, `gapsToQualifiedPlus` | derived | keep field names for PAT consumers, semantics become status-based; note it on `/developers` when that ships |
| `whats-new.ts` generator | flags `nowQualifiedPlus` on qualified promotions | celebrate promotions *to* Confirmed Positive ROI by name — these are the wins |
| Coach prompt (`coach-prompt.ts:22–67`) | explains derived Q+, "never hand-set" | rewrite: pipeline has seven stages; Coach's ROI review becomes "get the record ready for Kate's confirmation" — work `roiGaps`, help draft the annual-ROI statement |
| `progress-report.ts` `awaitingRoi` | qualified − qualifiedPlus | count of status `qualified` (unchanged arithmetic, clearer meaning) |

Tests to update alongside: `domain.test.ts` (counting + `canSetStatus`
matrix), service-level tests for the forced note and the
qualified-only promotion path, plus whatever serializer tests exist.

## Part 4 — The wins roll-up

- **Data**: for each record currently at `confirmed_positive_roi`, the most
  recent `statusChanges` row with `toStatus = confirmed_positive_roi` — its
  `note` is the annual-ROI statement; `roiConfirmedAt` is the date.
- **Surface**: a "Wins" section, **admin-only**, following the
  `canViewPulse` precedent on Goals — either a section there or a small
  `/wins` page (recommend `/wins`; Goals is already dense). Each row: title
  (linked), owner, team/department, ELT org, confirmed date, the annual-ROI
  comment, and the ROI panel's net-impact statement beside it.
- **Export**: a "Copy as Markdown" button (and/or CSV download) so the EOY
  report is one paste into a doc. This is the deliverable Kate described.
- **Why admin-only**: the dashboard's own rule is "counts and percentages
  only — never dollars." Annual-ROI comments will contain dollars. They must
  not render on any open surface. If Kate later wants AI Leads to see it,
  that's the same one-line role check the goal overview already went
  through.
- Optional, cheap: expose the same list as an MCP tool / API endpoint so the
  Coach can answer "what are our wins so far?" for admins. Not required for
  v1.

## Sequencing

1. Domain + enum migration + new columns (pure, tested, deployable alone).
2. `setStatus` rules + `StatusControls` UI with the forced comment.
3. The counting sweep (Part 3's table, top to bottom).
4. Wins page + export.
5. Demo data, AGENTS.md/README wording pass ("Qualified+" → "Confirmed
   Positive ROI" everywhere prose mentions it).

Steps 1–3 are one coherent PR; 4 can follow separately.

## Decisions needed from Tom (recommendations inline)

1. **Confirm the no-rename with Kate.** Slack said "I'll change the stage
   name"; her 7:02 model made that moot. Recommend: keep Qualified, new
   stage named Confirmed Positive ROI.
2. **Promotion only from Qualified?** Recommend yes (her stated flow;
   keeps the subset invariant).
3. **ROI panel at promotion: warn or block?** Recommend warn — the comment
   is the one hard requirement she asked for.
4. **Wins visibility**: admin-only (recommend, dollars rule) vs. AI Leads.
5. **The one existing Q+ record**: Kate re-promotes by hand (recommend, so
   the comment exists) vs. auto-migrate.

## Non-goals

- No rename of `qualified` (pending #1 above).
- The structured ROI panel is not removed or weakened as a data model —
  only its role changes from silent gate to visible checklist.
- The team-coverage vs. ELT ambiguity stays in
  `docs/dashboard-target-ambiguity.md` — related vocabulary, separate fix.
- Jira-style comments (Part 5 of `coach-form-improvements.md`) are
  untouched. The ROI note lives in status history now; if/when record
  comments ship, surfacing or cross-posting it there is trivial.

## Appendix — Kate's messages, verbatim (Slack, 2026-08-12)

> **k8, 6:53 PM** — How are we distinguishing between qualified vs qualified
> with measured, positive ROI in case space? I'm wondering if we should
> count anything as Launched or Qualified towards the 45 workflows target,
> and then just qualified in the positive ROI target?
> Can we change the "qualified" stage name to "Confirmed positive ROI"?

> **tom, 6:54 PM** — Yes that's how it works—45 qualified, 15 Q+. Which
> means I guess 30 qualified, 15Q+. Does that sound right? I'll change the
> stage name to Confirmed Positive ROI.

> **k8, 6:56 PM** — Oh gotcha. So maybe I just need an additional option
> here? [screenshot of the Change status… dropdown]

> **k8, 7:02 PM** — Here's how I'm thinking about it:
> - 45 documented use cases (at least) will get marked qualified (meaning
>   they are launched and meet all 4 gates.
> - Of those, at least 15 (hopefully) will have measured, quantified ROI
>
> So I want to be able to denote if a workflow counts towards just the 45
> workflows goal or both goals (the ones with positive ROI will appear in
> both metrics)
>
> Right now when I select Qualified it is counting towards both goals which
> shouldn't be the case for all workflows. And I'll likely mark many
> workflows as qualified and then we'll need to wait a bit to see if we
> actually get the positive ROI.
>
> Another small thing - If we add a stage for me to move a workflow to count
> towards positive ROI, can you force me to leave a comment articulating the
> annual ROI? (edited)
>
> I want to be able to access those comments later so I can roll up a report
> of all the wins at EOY
