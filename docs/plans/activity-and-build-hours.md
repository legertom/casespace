# Execution plan: one Activity stream on the record, and hours-to-build

**Audience: the agent executing this work.** Self-contained — you should not
need the originating conversation. Two independent changes; ship them as two
commits in the order below. Requested by Kate Schaff (Slack, 2026-08-15).
Decisions by Tom Leger, 2026-08-16.

## Where this came from

Kate, on a record page:

> the comments get a bit lost below the text box. Perhaps we integrate them
> into the history or put the comments to the right of the history section
> instead of below?
>
> We also should ask folks to estimate approx hours spent building their
> workflow. That way we can validate ROI (time spent vs time saved)

Her screenshot shows the real defect: History, then a "Comments · 1" heading,
then an **empty composer**, and only then the one actual comment. The eye
stops at the text box. She is also, in that same screenshot, doing Part 2 by
hand in a comment: *"Time to build = 10-12 hours Net time saved = ~300 hours
/ yr"* — which is the signal that hours-to-build belongs in the schema
instead of in prose.

**Rejected: comments to the right of history.** The record already has a
20rem right rail (Credit / Gates / Status controls) in
`src/app/(app)/use-cases/[id]/page.tsx`. A second right-hand column means a
three-column record or evicting that rail, threads nested six deep with
markdown bodies do not survive a narrow column, and on mobile it collapses
back to "below" anyway — which is the thing she is reporting. Do not build
this.

---

# Part 1 — merge History and Comments into one Activity stream

## What you are building

One `Activity` section replacing the current History section and Comments
section, rendering status changes and top-level comments interleaved in a
single chronological list, **oldest first**, with the composer at the
**bottom**.

## Rules that decide the design

1. **Oldest first.** History currently comes back newest-first
   (`desc(statusChanges.createdAt)`, `src/server/use-case-queries.ts:160`)
   and comments oldest-first (`asc`, `src/server/comment-queries.ts:38`).
   A merged stream has to pick one, and oldest-first with the composer at
   the end is what makes a conversation read correctly — and it is what
   fixes Kate's complaint, because the box is now where your eye *ends*.
   **Do not change either query.** Sort inside the merge helper. The
   history query is inline in `getUseCase`, and its other consumers depend
   on newest-first: the REST route serializes `uc.history` in query order
   (`src/app/api/v1/use-cases/[id]/route.ts:24`), and the coach takes
   `uc.history.slice(0, 6)` as "the six most recent"
   (`src/app/api/coach/route.ts:148`) — flip the order and the coach
   silently starts reasoning from the record's six *oldest* events.
   (`dashboard-queries.ts` and `wins-queries.ts` run their own
   `statusChanges` queries and are unaffected either way.)
2. **Only top-level comments are stream items.** A reply does not get its
   own slot in the timeline — it stays nested under its root comment, at
   the root's position, exactly as `buildCommentTree` nests it today.
   Getting this wrong destroys threading.
3. **A status event and a comment must stay visually distinguishable.**
   Status events keep their current compact one-line form (date column,
   `From → To`, actor, note underneath). Comments keep their card
   treatment. This is one list, not one uniform row type.
4. **Presentational change only.** No schema change, no query change, no
   change to what the Coach can see. Comments stay out of `get_use_case`,
   the MCP surface, and What's New generation (AGENTS.md) — merging two
   sections in the UI does not give the AI a voice here.
5. **Server-side redaction stays exactly where it is.** The page already
   maps history through `visibleHistoryNote(h, user.role)` before render
   (`page.tsx:124`) so a non-admin never receives an annual-ROI note in
   their HTML. Keep that call on the page, in the same place, redacting
   before the merge — not inside the new component.
6. **`#comment-<id>` anchors must still resolve.** Notification links are
   built as `/use-cases/${useCaseId}#comment-${commentId}`
   (`src/server/actions-notifications.ts:30`). Keep the `id` and the
   `scroll-mt-6 target:bg-accent-wash` treatment on the comment `<li>`.

## Files

- **New** `src/lib/activity.ts` — the pure merge, plus
  `src/lib/activity.test.ts`. Program/display logic that can be tested
  without a DB belongs in `src/lib/` under Vitest (AGENTS.md).

  ```ts
  export type ActivityItem<C> =
    | { kind: "status"; at: Date; entry: StatusChangeEntry }
    | { kind: "comment"; at: Date; node: CommentNode<C> };
  ```

  `buildActivity(history, roots)` merges and sorts ascending by `at`, with
  a deterministic tiebreak (equal timestamps: status before comment, then
  by `id`) so the render never flickers between requests. Test: empty
  history, empty comments, both empty, interleaving, and a same-timestamp
  tie.

  Import `StatusChangeEntry` and `CommentNode` with `import type` only —
  nothing in `src/lib/` imports from `src/server/` at runtime today, and a
  type-only import keeps it that way so Vitest never loads a DB module.

- **New** `src/components/record/record-activity.tsx` — server component.
  Takes the redacted `history`, the `comments` rows, `people`,
  `currentUserId`, `isAdmin`, `useCaseId`. Calls `buildCommentTree` then
  `buildActivity`, renders the merged `<ol>`, then the
  `CommentComposer` beneath it. Heading: `Activity`, with the live comment
  count appended when non-zero (`countLiveComments` already exists in
  `src/lib/comment-tree.ts`).

- **Delete** `src/components/record/record-history.tsx`; move its row
  markup into the status branch of the new component.

- **`src/components/comments/comment-thread.tsx`** — keep the recursive
  `Comment` component (it is the whole comment card: `CommentControls`,
  `CommentBody`, nested replies) but export it so `record-activity.tsx`
  can render one comment at a time. The `CommentThread` wrapper itself —
  heading, composer-on-top, thread-below — goes away with its only caller.
  Do not reimplement the card.

- **`src/app/(app)/use-cases/[id]/page.tsx`** — replace the `RecordHistory`
  and `CommentThread` renders with one `RecordActivity`. Keep the
  `visibleHistoryNote` map and its comment.

- **Empty states.** No comments: the stream is just the status events and
  the composer — keep a version of the existing "No comments yet.
  Questions, ideas, and requests all belong here." line above the composer.
  A record always has at least one status event (the birth event), so the
  stream is never empty.

## Docs (required — AGENTS.md)

- `docs/features/record.md`: swap `record-history.tsx` for
  `record-activity.tsx` in `code:`, add `src/lib/activity.ts`, bump
  `updated:`, and rewrite the History section as Activity.
- `docs/features/comments.md`: same treatment; comments no longer have
  their own section on the page, and the composer is now at the bottom.
  Add the oldest-first ordering to "Rules that surprise people" — the rest
  of the app's timelines are newest-first, and that inconsistency is
  deliberate here.
- `docs/changelog.md`: entry under a `## 2026-08-17` heading (or the real
  ship date), `Requested by: Kate Schaff`, written for the newsletter
  reader — history and comments now read as one story on a record, and the
  comment box sits at the bottom where you'd expect it.

---

# Part 2 — hours spent building

## What you are building

One nullable number on the use case — roughly how many hours went into
building the workflow — asked at intake, editable inline on the record, and
displayed next to the ROI measurements.

## Hard constraints

1. **It never blocks anything.** Kate can move a record to any status at
   any time regardless of what the record contains — that is Tom's
   standing rule and the code already works this way: `roiGaps` warns and
   explicitly says *"You can still confirm — the call is yours"*
   (`src/components/status-controls.tsx:97`), and `setStatus` checks
   `canSetStatus` (role and from/to only), never record contents. **Do not
   add `buildHours` to `roiComplete` or `roiGaps` in `src/lib/domain.ts`.**
   Doing so would retro-gap every already-confirmed record and change the
   bar for the 15, which is a program decision and Kate's to make, not
   ours.
2. **No dollars.** Hours only. The units rule for ROI (counts and rates,
   never dollars) is unchanged and applies here.
3. **Do not compute a net figure automatically.** `baselineUnit` is free
   text ("hours, tickets, %"), so build-hours-minus-savings only means
   something when the unit happens to be hours. Store it, show it, and let
   `netImpactStatement` carry the sentence — which is what Kate already
   writes by hand. No unit parsing, no guessing.
4. **Estimates, not timesheets.** Ask in plain words and accept a rough
   number. Precision here is fake, and asking for precision is how you get
   blanks.

## Files, in order

1. **`src/db/schema.ts`** — `buildHours: doublePrecision("build_hours")`,
   nullable, in the ROI block of `use_cases` (near `baselineValue`, around
   line 291), with a one-line comment saying it is a self-reported
   estimate and never gates anything. Then `pnpm db:generate` for the
   migration; do not hand-write the SQL.
2. **`src/lib/use-case-input.ts`** — `buildHours: z.number().finite().min(0).nullish()`
   beside `baselineValue`, and `?? null` in the defaults block (~line 165).
   This one addition is what makes inline editing work: `InlineField`
   patches through `patchUseCaseAction` → `useCaseUpdateSchema` generically,
   so no allowlist to update.
3. **`src/components/use-case-form.tsx`** — a number field in the
   "Success & ROI" section (~line 503). Label: *"Roughly how many hours
   went into building this?"*, hint: *"A rough estimate is fine — we use
   it to weigh time spent against time saved."* Optional, like everything
   else in that section.
4. **`src/components/record/record-roi.tsx`** — an `InlineField` with
   `editor={{ kind: "number" }}` inside the measurement box, rendered in
   both branches of the `roiStatus` conditional (a record that is "not yet
   measurable" still has a build cost). Reads e.g. **Build effort** —
   *~11 hours (estimated)*, with an `<Empty>not estimated yet</Empty>`
   fallback for editors.
5. **`src/server/api-serializers.ts`** — include `buildHours` in the
   serialized record so the REST and MCP surfaces see it.
6. **`scripts/demo-data.ts`** — populate it on a couple of demo records
   only; leave others null so the empty state is exercised.
7. **`src/lib/ai/proposal.ts`** — add `buildHours` to the extraction schema
   so "took me about a day" in pasted notes becomes a proposed number. The
   AI still only proposes; a human confirms (AGENTS.md). If this turns out
   to need eval changes, skip it and note it — it is the least important
   item here.

## Docs (required)

- `docs/concepts/gates-and-roi.md`: what build hours are, that they are a
  self-reported estimate, and — under "Rules that surprise people" — that
  they are **deliberately not** part of the ROI checklist and never block
  a status change.
- `docs/features/logging-a-use-case.md` and `docs/features/record.md`: the
  new question and where it is edited. Bump `updated:` on each.
- `docs/changelog.md`: entry, `Requested by: Kate Schaff`, framed as Kate
  framed it — we can now weigh time spent building against time saved.

---

## Verification before you call it done

- `pnpm typecheck`, `pnpm test` (the docs test enforces `surface:`/`code:`
  front matter — a missing doc fails the suite), `pnpm db:migrate`.
- Load a record with several status changes and a threaded comment:
  events and comments interleave in date order, replies stay under their
  parents, the composer is at the bottom, and a notification link to
  `#comment-<id>` still scrolls to and highlights the right comment.
- Sign in as a non-admin against a confirmed record: the annual-ROI note
  is still absent from the HTML, not merely hidden.
- As an admin, move a record with an empty ROI block straight to Confirmed
  Positive ROI: the checklist warning appears, the move still succeeds.

## Two things for Tom to take back to Kate

1. **Should a missing build estimate ever count against a record?** Shipping
   it non-blocking per the rule above. If Kate wants it on the checklist
   for the 15, that is a one-line change to `roiGaps` — but it changes the
   bar, so it is her call, not a code decision.
2. **Confirmed Positive ROI is still reachable only from Qualified**
   (`canSetStatus`, `src/lib/domain.ts`) — the 15 being a subset of the 45
   by construction. That is a status-graph rule, not a
   what's-in-the-record rule, so this plan leaves it alone. If "any status
   at any time" is meant literally enough to include skipping Qualified,
   say so and it comes out.
