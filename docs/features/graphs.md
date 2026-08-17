---
title: Pipeline drawings
surface: /graphs
audience: everyone
updated: 2026-08-17
code:
  - src/app/(app)/graphs/page.tsx
  - src/components/graphs/graph-gallery.tsx
  - src/components/graphs/specimens.tsx
  - src/components/graphs/proposals.tsx
  - src/lib/pipeline-shapes.ts
  - src/lib/pipeline-ramp.ts
---

# Pipeline drawings

The design review behind the pipeline chart on [the dashboard](dashboard.md),
kept in the app rather than in a slide deck. Twenty-six drawings of the same
seven counts:

| Group | Numbered | Count |
|---|---|---|
| The bar chart that was replaced | 00 | 1 |
| The design that shipped | 01 | 1 |
| Sales-funnel restructurings, under review | 02–06 | 5 |
| Designs 01 was chosen over | 07–20 | 14 |
| Proposals needing data we do not query yet | 21–25 | 5 |

If those numbers stop adding to 26, the copy on the page is wrong: the intro,
the alternatives heading, and the link from the dashboard each state a count.

Numbers are **assigned from display order**, not written next to each drawing
(`NUMBERS` in `graph-gallery.tsx`), so they always read 00, 01, 02 … as you
scroll and reordering a family renumbers what follows. They are reference
handles for talking about a drawing — "look at 09" — and mean nothing else.
Ranking is the page's prose, not its numbering.

Open to everyone, read-only, nothing on it is editable.

## The data control

One control at the top drives every drawing at once:

- **Live** — the real casebook, read through `getProgramCounts()`.
- **At target** — a plausible shape for 45 documented records.
- **Shuffle** — 45 split into seven **distinct** counts in random stage order
  (`distinctSplit()`).

Comparing designs under the same data is the entire point of the page. Shuffle
in particular is the test that eliminated several otherwise strong options,
and distinct counts are deliberate: two stages coincidentally matching
flatters a design that cannot separate close values.

## The three families

Drawings are grouped by what they encode, not by how they look, because that
is what decides which question a chart can answer:

- **Read the counts directly** — only what sits at each stage now.
- **Read how far work got** — `cumulativeReach()`, how many reached a stage or
  beyond.
- **Read it as a transit map** — uniform line, stations, and who is waiting.

## Rules that surprise people

**A drawing that cannot look wrong is a liability.** Cumulative reach is a
suffix sum, so it can only fall along the pipeline. Every chart in that middle
family therefore looks plausible whatever the data does — shuffle it and none
of them ever look surprised. Six otherwise strong options were rejected on
that ground alone, and the page says so.

**The last five drawings show invented numbers.** The proposals need a
dimension the dashboard does not query — days in status, weekly history, team
roll-up — so their figures are derived from the live counts rather than
measured. They carry a **Needs new data** badge and a warning above the group.
Nothing else on the page is illustrative.

**This page has no primary nav entry.** It is reached from the pipeline
section of the dashboard, where the question it answers actually occurs. The
nav is for program surfaces; this is a design record.

## Related

- [The dashboard](dashboard.md) — where the chosen chart lives
- [Statuses](../concepts/statuses.md) — the seven stages being drawn
