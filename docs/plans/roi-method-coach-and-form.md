# ROI the way Kate teaches it — the Coach and the form

Status: **built 2026-10-21, on branch `roi-method`** (six commits, Parts 1–6
below), after Tom's direction: hours are the unit, with flexibility coming
from the baseline's period and from "not sure yet" keeping the free-text
fields. Decisions 1–5 were taken as recommended. Decision 6, the
`roi-wksp` update, is **deferred at Tom's direction (2026-10-21)** —
Casespace drops the module's dollar lines on paste, so nothing here waits
on it. Still open on this side: the optional "Ask Kate to confirm" button
(the @mention copy shipped), and the question for Kate at the end. Drafted 2026-10-21 from the async ROI training module,
[`legertom/roi-wksp`](https://github.com/legertom/roi-wksp) at `7d06eb3` (live
at https://roi-wksp.vercel.app — Kate Schaff's ROI workshop as a 30-minute
self-paced module), read in full against Casespace `main` at `8a9d53a`.

Two asks from Tom: make the Coach help people **calculate and report** ROI,
and make the manual form's ROI questions **make sense**.

## Summary

The training teaches AI Leads one method. Casespace can hold about half of it.

The module's method is six steps (its section 8): define the impact and a
baseline before building; at launch, enter build hours and **expected ROI**;
set a revisit date; on that date, enter the **actual ROI**; notify Kate; chase
anything unconfirmed before year-end. In between, it teaches a formula, a
payback period, two kinds of value, what counts as cost, and five judgment
calls.

Casespace records the *actual* half (a baseline, a post-measurement, a method,
a net-impact sentence) in one flat panel, plus build hours. It has nowhere to
put the *expected* half. Step 2 tells leads to "enter build hours and expected
ROI," but there is no expected-ROI field. The baseline has no period ("10
hours" a month? per onboarding?). There is no value type and no recurring
cost, and nothing does the arithmetic: the form computes nothing, and the
Coach is told never to estimate. A lead who finishes the module and opens
Casespace finds different words, a different order, and no number.

The proposal, one line per part:

1. **One calculator, in hours** (`src/lib/roi.ts`). Kate's formula and
   payback, tested against the module's own worked examples. At a single
   hourly rate, ROI in hours *is* the ROI in dollars (the rate cancels), so
   Casespace computes it without breaking the no-dollars rule.
2. **Five nullable fields** so a record can hold the plan: value type,
   baseline period, measured-or-estimated, expected after-value, and yearly
   maintenance hours.
3. **The form's Success & ROI section follows Kate's steps.** *Before you
   build → At launch → On the revisit date*, in the training's words, with
   ROI and payback computed live.
4. **The Coach learns the method.** A `calculate_roi` tool that computes and
   never writes; a prompt section carrying the module's rules and judgment
   calls; a rewritten wizard ROI step; ROI mode extended from *reviewing* a
   number to *working it out*; and evals built from the module's knowledge
   check.
5. **Close the loop with the training.** Casespace parses the module's "Copy
   for CaseSpace" text. The module gets the real field names and stops
   copying dollar figures.
6. **Kate's steps 5 and 6** (smaller, optional): a "revisit due" flag, and a
   way to tell Kate a record is ready for her.

What does **not** change: the bar for the 15 (`roiComplete` / `roiGaps`), the
rule that the AI never writes, no dollars on open surfaces, and sparse is safe.
Every new field is optional and blocks nothing.

---

## What the training teaches, against what Casespace holds

| Concept | The module | Casespace today |
|---|---|---|
| Formula | `ROI = (value − cost) ÷ cost × 100`. Payback = build ÷ monthly net, "next to ROI every time." | Nothing computed. `gates-and-roi.md`: "No net figure is computed." |
| Value type | Revenue (top line) vs productivity (bottom line). Coverage and never-formalized processes count as productivity. | No field. |
| Expected vs actual | Expected (before or at launch) decides whether to build. Actual (after enough usage) is what Kate confirms and what counts toward the 15. | Actual only (baseline → post). The target lives in prose inside the success criterion. |
| Baseline | A rate per period ("10 h/month"). No timesheet? The calendar heuristic: "How much time would I put on my calendar to do this?" State the assumption. | Value plus free-text unit. No period, no measured-vs-estimated. |
| Cost | Build hours, always. Maintenance and tokens when recurring and material. Ignore small one-offs; "don't split hairs." | Build hours only (a self-reported estimate). |
| Revisit date | Set at launch, about three runs of the process out. | Shown only when ROI status is "Not yet measurable" (`use-case-form.tsx:596`). |
| Multi-year | A negative first year is a result. Show payback and year two. Never invent year-end ROI. | Nothing. |
| Notify Kate | Step 5. The module marks the notification path "pending." | No path, apart from @mentioning her in a comment. |
| Year-end follow-up | Step 6: a measured number, a new revisit date, or a decision to decommission. "Never a blank." | Partly: `launchedUnscored` (`dashboard-queries.ts:323`) lists Launched records not yet scored. |

The module's own calculator reproduces every worked number, checked by hand:
MPR expected 35% (payback ~9 months, year two 440%, two-year 116%), MPR actual
20%, this module 900%, knowledge-check #1 −20% (payback 15 months), win rate
67% (break-even 53%). Those are the test cases for Part 1.

## Four tensions, and how this plan resolves each

**1. Dollars.** The module prices time at $75/h, and its revenue example is
in dollars. `AGENTS.md`: "No dollar figures anywhere in the product." The
resolution is to compute in hours. With one rate for everyone's time,
`(value − cost) ÷ cost` has no unit: MPR is 35% in hours exactly as in
dollars. That is an assumption, and the form should say so: it treats an
hour of build time and an hour of saved time as worth the same, which is
exactly what the workshop does with its flat $75. Where the two rates
differ a lot, the hours figure is still what Kate asked leads to report;
the dollar version is hers to add in the confirmation note.

- **Revenue cases** report counts and rates. The module itself says the
  sales version is "about two and a half more deals a year."
- **A revenue ROI percentage** needs dollars, so it belongs in Kate's
  annual-ROI note, which is admin-only and already allowed to carry them
  (`/wins`).
- **Token costs** are dollars by nature, so they get no field. A recurring,
  material token cost is described in the net-impact sentence and weighed by
  Kate. → *Decision 1.*

**2. Estimates.** The module says "back-of-the-napkin welcome." The Coach is
told "NEVER invent or estimate a number the human didn't give you"
(`coach-prompt.ts:76`). Stated precisely, these don't conflict. The **human**
estimates. The Coach may *ask* for an estimate (the calendar question) and
records it marked as estimated. The Coach still never supplies a number
itself. Arithmetic on numbers the human gave isn't inventing, but the model
shouldn't do it in its head, so a tool does (Part 4a).

**3. Expected ROI and the 15.** Expected ROI is planning information. It must
not touch `roiComplete`, `roiGaps`, or what counts. Putting it on the
checklist would retroactively add a gap to every confirmed record, which is
the same reasoning that kept build hours off it (`gates-and-roi.md`, "Rules
that surprise people"). → *Decision 3.*

**4. A percentage on every record vs "no gamification."** A record showing its
own ROI and payback is reporting. Sorting, ranking, or tiling records by it
would be gamification. So: no ROI sort in the casebook, no leaderboard, no
dashboard tile.

---

## Part 1 — The calculator, `src/lib/roi.ts`

Pure and Vitest-covered, like the rest of the domain logic. One function used
by the form, the record page, the proposal card, and the Coach's tool, so all
four show the same number.

- **Inputs:** baseline and after-value (hours per period), the period, build
  hours, and maintenance hours per year.
- **Outputs:**
  - hours saved per month and per year
  - year-one net
  - year-one ROI %
  - payback in months
  - year-two ROI %
  - two-year cumulative ROI %
- **Returns null** with a reason when an input is missing, or when the record
  isn't a time-saved case.

Semantics follow the module's `calc()` (`index.html` ~L651):

- Year-one cost is the build.
- Year-two cost is maintenance.
- Payback is build ÷ monthly saving.

Display rules also follow the module's `fmtMo`: "under a month", "about N
months", "over 3 years", "never".

Tests that must pass, all in hours:

| Case | Inputs | Expected |
|---|---|---|
| MPR, expected | 10 h/mo → 1 h/mo after; build 80; maintenance 20 h/yr | 108 h/yr saved · **35%** · payback about 9 months · year two **440%** · two-year **116%** |
| MPR, actual | 10 → 2 h/mo after; build 80 | 96 h/yr · **20%** |
| This module | 10 h of value; build 1 | **900%** |
| Knowledge check #1 | saves 4 h/mo; build 60 | **−20%** · payback about 15 months |
| Missing build hours | MPR without build | null, "needs build hours" |

**No unit parsing.** The old reason not to compute was that `baselineUnit` is
free text, so build-hours-minus-savings would mean guessing. The value type
removes the guess instead of parsing it: a time-saved case is in hours by
definition, and nothing else computes a percentage.

## Part 2 — Five fields, one migration

| Column | Type | Why |
|---|---|---|
| `valueType` | enum `time_saved` · `revenue`, nullable | Module §2. Decides what the form asks and whether ROI computes. The module files coverage cases (the legal agent) and never-formalized processes (CaseSpace itself) as time saved. |
| `baselinePeriod` | enum `week` · `month` · `quarter` · `year`, nullable | "10 hours" means nothing without it. One period for baseline, expected, and actual, so before and after compare by construction. |
| `baselineEstimated` | boolean, nullable | Measured, or a calendar-heuristic estimate. Kate sees which. The method field carries the assumption. |
| `expectedValue` | double, nullable | The expected after-value, in the baseline's unit and period. With the baseline, this is expected ROI (Kate's step 2). |
| `maintenanceHoursPerYear` | double, nullable | Recurring cost, applied from year two. |

Existing fields keep their meaning:

- `postValue` is the actual after-value.
- `measurementMethod` is now asked up front, in step 1: decide how you'll
  measure before you build, which is the module's step 1.
- `buildHours`, `netImpactStatement`, `isPositive`, `roiStatus`, and
  `revisitOn` are unchanged.

For time saved, the form fixes `baselineUnit` to "hours". For revenue, the
three values are rates (%), and no percentage ROI is computed.

**A record with no value type looks exactly as it does today.** Every
existing record has `valueType` null, and null means "not sure yet": the
free-text unit stays, nothing is computed, and no readout appears. The new
behaviour starts when someone picks a type. There is no backfill and
nothing to migrate.

**Plumbing:** `buildHours` (August) is the template. It touches exactly:

- `src/db/schema.ts`, then `pnpm db:generate`
- `src/lib/use-case-input.ts` and its test
- `src/lib/ai/proposal.ts` (schema, `proposalPatchToUpdateInput`,
  `proposalToCreateInput`). This also covers MCP input: `log_use_case`
  takes `proposalSchema` as its `inputSchema` (`api/mcp/route.ts:53`).
- `useCaseCreateApiSchema` / `useCaseUpdateApiSchema` in
  `use-case-input.ts`, which the REST routes parse with — plus a row each in
  `docs/integrations/rest-api.md` and `mcp.md`.
- `src/components/coach/proposal-card.tsx`
- `src/server/api-serializers.ts` (REST and MCP output)
- `src/lib/backup.ts`
- `src/lib/coach-learnings.ts` and its test (so corrections to the new fields
  are counted)
- `scripts/demo-data.ts`

**One extra:** `get_use_case` in `src/app/api/coach/route.ts` (~L251). It
doesn't return `buildHours` today, so in ROI review the Coach can't see build
effort. Add it, the five new fields, and the computed result from Part 1.

---

## Part 3 — The form

### What is unclear today

These are specific to Success & ROI (`use-case-form.tsx:523–707`):

1. **Three moments in one panel.** The target, the build cost, the before,
   the after, and the verdict sit side by side. Nothing says which you fill
   in now and which you fill in months from now, so someone logging an idea
   meets a post-measurement field.
2. **The revisit date hides** unless ROI status is "Not yet measurable"
   (L596). The module says to set it at launch, whatever the status.
3. **The baseline has no period,** and its unit is free text.
4. **Nowhere for "expected."** The target goes into the success criterion's
   prose, so it can never be compared with the actual.
5. **Build hours sits between** "Success criterion met?" and the ROI box
   (L563), away from the costs it belongs with.
6. **The training's words don't appear.** The module teaches impact, how
   you'll know, baseline, expected improvement, revisit date, and confirmed
   ROI. The form says baseline metric, post value, and ROI status
   "Complete."
7. **Nothing is computed.** A lead who did the module's worksheet redoes the
   arithmetic in their head and types it into "Net impact."
8. **Status comes last** (L709), so the form can't adapt to the stage the
   work is at.
9. **The record page hides the baseline exactly when the method says to
   enter it.** `record-roi.tsx:96` shows only the revisit date while ROI is
   "Not yet measurable" and puts the baseline fields in the other branch.
   Kate's step 1 is to record the baseline *before* building, which is
   precisely when ROI isn't measurable yet. Today an owner at that stage
   can't see or edit it inline.

### Proposed: the section follows Kate's steps

This replaces L523–707. The heading stays "Success & ROI", followed by one
line: *"Kate's ROI method in three steps. Fill in the step you're at and come
back for the rest. Estimates are fine — just say so."* It links to the
training module.

**1 · Before you build — the plan**

- *What kind of value?* Time saved · Revenue · Not sure yet.
- *How will you know it worked?* This is `successCriterion`, and the current
  hint stays.
- *Baseline.* "Today this takes [ ] hours per [month ▾]." For revenue:
  "today's rate [ ]%". Then Measured · Estimated, with the hint: *"No
  timesheet? Ask how much time you'd block on your calendar to do it by
  hand."*
- *How you'll measure it* (`measurementMethod`): *"Use the same method on
  the revisit date."*

**2 · At launch — expected ROI**

- *Hours spent building*, moved here from L563.
- *Expected after:* "[ ] hours per month". One input, in hours. Beside it,
  the form shows "= 90% of that time removed", since that is how the
  workshop phrases it, but it is a readout, not a second control.
- *Maintenance hours per year*, optional: *"Count it if it's more than a few
  hours a year."*
- *Readout*, for time saved with a baseline, an expected value, and build
  hours: **Expected ROI, year one: 35% · payback about 9 months · year two:
  440%**, with the working shown as `(108 h − 80 h) ÷ 80 h`. The footer says:
  *"In hours, never dollars — at one hourly rate it's the same percentage."*
- *Revisit date*, always visible: *"When will the process have run about
  three times?"*

**3 · On the revisit date — actual ROI**

- *Actual after* (`postValue`): "measured the same way."
- *Readout:* **Actual ROI: 20%**, with "expected 35%" beside it.
- *Net impact.* A **Use the numbers** button fills an editable sentence from
  the readout, for example: "Saves about 8 hours a month. The 80-hour build
  pays back in about 10 months. Year-one ROI 20%." It's a template, not AI.
- *Was the success criterion met?* (`successCriterionMet`), moved here from
  its spot under the criterion. It is answered on the revisit date, not
  before.
- *Positive and attributable to the AI workflow?* Unchanged.
- *Where's the measurement?* This is `roiStatus` with new labels: Not
  measurable yet · Measuring now · Measured.

**It follows the stage, without hiding anything.**

- On create, step 1 is open, and steps 2 and 3 are collapsed to one line
  each ("At launch: build hours and expected ROI").
- On edit and on the record page, the step matching the status opens:
  - `in_discovery`, `approved`, `under_construction`: step 1.
  - `in_testing`, `launched`: step 2.
  - `qualified`, `confirmed_positive_roi`, or any status once the revisit
    date has passed: step 3.
- Every step is always one click away, and all three are always rendered.
  On the record page that fixes defect 9: the baseline is editable at
  every stage. Sparse is still safe.
- This is compatible with the August plan's Option B. If the create form
  later shrinks to "the basics", the three steps simply live on the edit
  form and the record page, which is where most ROI entry happens anyway.

**Gap flags**, which are prompts and never validation: two small changes
to `computeGapFlags`. "No revisit date for ROI" fires when there is no
revisit date *and* no actual after-value, rather than on ROI status, since
the date is now always visible. And one new prompt, "No expected ROI at
launch", when a time-saved record is at Launched or beyond with no expected
after-value — Kate's step 2 as a nudge. → *Decision 3 still holds: neither
touches `roiGaps`.*

**Prerequisite: status moves to the top of the create form.** The August plan
(`coach-form-improvements.md`, Part 1, "Section order") agreed this and it
hasn't shipped. The form can't open the right step if it asks the stage
last. On edit, status is already read from the record.

**The record page** (`record-roi.tsx`) gets the same three steps, inline-
editable, with the same readouts. The Qualified gap list is unchanged.

**Out of scope here, still open from August:** the Option B step-1 split,
removing the ELT field, and the gates section re-asking what the form already
knows. These are independent of this plan, and only the status move above is
a prerequisite.

---

## Part 4 — The Coach

### 4a. A `calculate_roi` tool

Its `execute` is the Part 1 function. It touches no database and writes
nothing, so like `get_progress` it is a read, and the AI-never-writes rule
holds. It is defined beside `get_progress` in `api/coach/route.ts`, not in
`proposal-tools.ts`, whose test asserts that nothing there has an
`execute`.

It goes in the tool table for `wizard`, `roi_review`, and `qa`, and **not
for `discovery`**. Discovery's instructions are explicit that it must not
steer toward building and that most turns need no tool at all; a calculator
in that mode is an invitation to end the thinking with a percentage.

Why a tool rather than the prompt: model arithmetic drifts ("about 9
months," 8.9, 9.4), and a tool makes the Coach's number the form's number.
It calls no model, so there is nothing to log to `ai_usage`. A unit test
asserts the tool's output equals `roi.ts` for the Part 1 cases.

The six-step cap per turn (`stopWhen: isStepCount(6)`) is not a problem:
the heaviest ROI-mode turn is `get_use_case` → `calculate_roi` →
`propose_update`, three steps.

### 4b. An "ROI method" section shared by every mode

The module's sections 2–8 and 10, condensed into prompt rules:

- The formula. Payback always goes beside ROI.
- Two value types. Coverage and never-formalized processes are time saved,
  and the baseline is what the work would cost done by hand.
- Expected vs actual: when each is taken, and that only the actual counts
  toward the 15.
- Costs:
  - Build, always.
  - Maintenance, if it's substantial.
  - Small one-time token costs are ignored.
  - A recurring, material token cost is described in words.
- The calendar heuristic for a missing baseline.
- The five judgment calls, from the knowledge check:
  1. A negative first year is reported as negative, with payback and year
     two. Never invent a year-end number.
  2. Coverage is valued in hours, with quality stated beside it as a
     condition.
  3. A suite of apps: claim the saving that's measurable now as its own
     record, and give the long-horizon effect a separate record and revisit
     date. The [linked workflows](../features/linked-workflows.md) feature
     can tie the two.
  4. Material recurring tokens are included. Decommission when tokens exceed
     value.
  5. No baseline: estimate it, state the assumption, and measure from
     launch.
- Revisit after about three runs of the process.
- Hours, never dollars. If someone gives a dollar figure, ask for the hours
  behind it. If they don't know, leave it off the record and say it belongs
  in Kate's confirmation note.

The wizard's "NEVER invent" line (`coach-prompt.ts:76`) becomes the precise
version: *never supply a number yourself; you may ask the person to estimate
one (the calendar question) and record it as estimated; do arithmetic only
with `calculate_roi`.*

### 4c. Wizard step 9, rewritten

Still one question at a time, and skipped freely:

1. Value type.
2. Baseline per period. If there's no data, ask the calendar question, then
   whether the number is measured or estimated.
3. How they'll measure it.
4. The expected after-value.
5. Maintenance, but only if the workflow will need real upkeep.
6. Call `calculate_roi` and give a one-line readout.
7. The revisit date: suggest about three runs from launch, and let them
   choose.
8. If it's already measured: the actual after-value, `calculate_roi` again,
   a net-impact sentence drafted from the numbers, and whether the outcome is
   positive.

Build hours stays at step 6, where it is today.

The proposal card shows "Expected ROI 35% · payback about 9 months," computed
by `roi.ts` when the card renders, so the card never shows a number the
model typed.

### 4d. ROI mode: from reviewing to working it out

`roi_review` exists (`coach/page.tsx:73`) but only reviews.

- **When a record's ROI is incomplete,** the Coach works it out with the
  owner, following 4c from wherever the record already is, and ends in
  `propose_update`.
- **When it's complete,** it produces the Kate-ready packet as today. The
  packet adds expected vs actual, ROI %, payback, and whether the baseline
  was estimated.
- **For admins,** it offers a draft annual-ROI sentence, in hours, which
  Kate edits in the status dialog. The Coach can't move status and still
  won't.

Entry points:

- A "Work out ROI with the Coach" link in the record's ROI panel, beside the
  per-field Coach buttons.
- Each item in the revisit-due list (Part 6).

### 4e. Evals — `evals/coach-roi.eval.ts`

From the module's knowledge check, plus the guard rails:

1. "No idea how long it takes" → the Coach asks the calendar question, and
   proposes no number until one is given.
2. Build 60, saves 4 h/month → the Coach reports −20%, a payback of about
   15 months, and year two, and doesn't call it positive.
3. Three related apps, one with an immediate saving → the Coach proposes that
   saving now and suggests a separate record for the later effect.
4. "Saves us $9,000 a year at $75 an hour" → no dollar figure appears
   anywhere in the proposal.
5. All the numbers given → `calculate_roi` is called, and the card's numbers
   match it.
6. Negative control → the Coach never sets `isPositive` or marks ROI
   "Measured" on its own judgment.

`pnpm eval` costs money, so it's run deliberately (`docs/operations/evals.md`).

---

## Part 5 — Close the loop with the training module

**In Casespace**

- **Paste the worksheet.** The module's "Copy for CaseSpace" emits a fixed
  format (`wsText`, `index.html` ~L1036), with lines like "Value type:",
  "Baseline:", and "Expected improvement:". A deterministic
  `parseRoiWorksheet` in `src/lib/`, tested on the module's own MPR
  output, runs inside `parseNotesAction` (`server/actions-ai.ts:43`)
  before the `generateText` call. Its fields win over the model's; the
  model fills whatever it didn't recognise. A fixed format deserves a
  parser, not a model. The mapping:

  | Worksheet line | Field |
  |---|---|
  | `Value type: Productivity` / `Revenue` | `valueType` time_saved / revenue |
  | `Baseline: 10 h/month` | `baselineValue` 10, `baselinePeriod` month, `baselineUnit` hours |
  | `Expected improvement: 90% of that time removed → 108 h/year` | `expectedValue` 1 (from the baseline and the %) |
  | `Build: 80 h × $75 = $6,000` | `buildHours` 80; the dollars are dropped |
  | `Recurring: 20 h/year maintenance; …` | `maintenanceHoursPerYear` 20; tokens dropped |
  | `Revisit date: 2027-02-21` | `revisitOn` |
  | `How I will confirm actual ROI: …` | `measurementMethod` |
  | `Intended impact:`, `Metric that should move:` | left to the model, as description and success-criterion material |
  | `Expected ROI, year one: 35% · …` | ignored — Casespace recomputes from the inputs |
- **Link the module** from the Success & ROI heading and from ROI mode.

**In `roi-wksp`** (Tom's repo, a separate change):

- **Section 8:** replace "Field labels above are descriptive" with the real
  labels from Part 3. The module's own pre-publish checklist has "Confirm
  exact CaseSpace fields" open, and this answers it.
- **`wsText`:** emit hours, not dollars ("Build: 80 h," not "80 h × $75 =
  $6,000"). **Today, pasting it into any Casespace text field puts dollar
  figures on a page every user can read.**
- **Step 2** ("enter build hours and expected ROI") will finally have
  somewhere to go.
- **Step 5's "pending" notification path:** point it at whatever Part 6
  decides.

## Part 6 — Kate's steps 5 and 6 (smaller, optional)

- **Revisit due.** A new attention flag next to `launchedUnscored`: program
  records whose `revisitOn` has passed with no actual measurement. It shows
  on the dashboard's attention list and in `get_progress`, so the Coach can
  work through the list. This is the module's step 6.
- **Ready for Kate.** No new code is needed for a first version: the ROI
  section's copy tells owners to @mention Kate in a comment once step 3 is
  filled, which notifies her today. If that proves too quiet, add an "Ask
  Kate to confirm" button: one new `notification_kind` value, sent to
  admins. Either way, status still moves only by Kate's hand, and the Coach
  stays out of comments. → *Decision 5.*

---

## Decisions needed — recommendations first

1. **Dollars:** compute in hours; revenue in counts and rates; no token
   field. *Recommend yes.*
2. **Value types:** two (time saved, revenue), as the module teaches, with
   coverage as time saved. A third "other" would only collect what the two
   don't fit. *Recommend two plus "not sure yet."* A later, optional
   addition for revenue: a count of opportunities per period, so the
   readout can say "about 2.5 more deals a year" — the module's own
   audience-language line, and still no dollars. Not in this plan.
3. **Expected ROI stays off the 15's checklist.** *Recommend yes.* Changing
   that is Kate's call, not a side effect of a new column.
4. **ROI % is visible on every record, to everyone.** It's a percentage of
   hours, so no dollars are involved. *Recommend yes, with no ranking
   anywhere.*
5. **Telling Kate:** start with the @mention in the copy, and build the
   button if she wants it. *Recommend the @mention first.*
6. **Update `roi-wksp`** (Part 5) the same week the form ships, so the
   module and the product use the same words. *Recommend yes.*

Worth a line to Kate before building: the module says Kate confirms the
*actual* ROI. Does she also want to see the *expected* figure at launch, or
only on the revisit date? That decides whether step 2's readout appears in
her review packet.

## Sequencing

Each step ships with its doc and changelog entry (`AGENTS.md`). Sizes are
rough, in the units this repo's history suggests: *small* is a commit in an
afternoon, *medium* a day or two, *large* several days.

1. **`roi.ts` and its tests.** Pure, deployable alone. *Small.*
2. **The migration and Part 2's plumbing,** including `get_use_case`'s
   missing `buildHours`, the REST/MCP docs rows, and the backup column
   list. *Small–medium; wide but mechanical, with `buildHours` as the
   template.*
3. **Status to the top of the create form, then the form and record panel**
   (Part 3), with the gap-flag tweaks. Docs: `gates-and-roi.md`,
   `logging-a-use-case.md`, `record.md`. "Rules that surprise people" gets
   an entry: "ROI is computed in hours, and only for time-saved cases."
   *Large — this is the bulk of the work.*
4. **The Coach:** the tool, the prompt section, the wizard step, ROI mode,
   the card line, and evals (Part 4). Docs: `coach.md`, including the new
   row in its tool table. *Medium, plus an eval run.*
5. **The worksheet parser, and the `roi-wksp` update** (Part 5). *Small
   each.*
6. **Revisit due and the Kate path** (Part 6). *Small.*

Steps 1–3 are the form ask and stand on their own. Step 4 is the Coach ask
and depends on 1–2.

## Non-goals

- No change to `roiComplete`, `roiGaps`, or either counting rule.
- The AI still never writes. `calculate_roi` computes, and proposals still
  wait for a click.
- No dollars on open surfaces, and no hourly-rate field.
- No ROI ranking, sort, or leaderboard.
- No required fields.
- No change to comments. The Coach neither reads nor writes them, and the
  @mention path is a person's action.
- No Slack or email; the in-app bell only.

## What this review covered, and what it didn't

- **Read in full:** `roi-wksp`'s `index.html` (ten sections, calculator,
  worksheet, knowledge check), `PLAN.md`, and `README.md`. Every worked
  number was rechecked by hand.
- **Read in Casespace:** the ROI concept and feature docs, the August
  form/Coach and Confirmed-Positive-ROI plans, `use-case-form.tsx`,
  `record-roi.tsx`, `coach-prompt.ts`, `proposal.ts`, `get_use_case`, gap
  flags, and the attention flags.
- **Verified on a second pass** (2026-10-21): every worked number in Part 1
  by hand; that `get_use_case` really omits `buildHours` (the grep of every
  `buildHours` reference has no hit in `api/coach/route.ts`); that MCP
  takes `proposalSchema` and REST takes the `*ApiSchema` pair; where the
  notes parser runs; and that the record page hides the baseline while ROI
  is not yet measurable.
- **Not looked at:** production records. How leads actually fill the ROI
  fields today, and whether anyone has pasted the module's worksheet text
  yet, would sharpen Part 3. A count from the latest backup is a cheap
  check before building.
