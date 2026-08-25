---
title: The record page
surface:
  - /use-cases/[id]
  - /use-cases/[id]/edit
audience: everyone
updated: 2026-08-25
code:
  - src/app/(app)/use-cases/[id]/page.tsx
  - src/app/(app)/use-cases/[id]/edit/page.tsx
  - src/components/record/record-header.tsx
  - src/components/record/record-about.tsx
  - src/components/record/record-worksheet.tsx
  - src/components/record/record-roi.tsx
  - src/components/record/record-activity.tsx
  - src/lib/activity.ts
  - src/components/record/record-credit.tsx
  - src/components/record/record-gates.tsx
  - src/components/record/inline-field.tsx
  - src/components/record/record-urls.tsx
  - src/components/record/edit-urls.tsx
  - src/components/use-case-url-rows.tsx
  - src/lib/use-case-urls.ts
  - src/components/record/gate-toggle.tsx
  - src/components/status-controls.tsx
  - src/components/use-case-form.tsx
---

# The record page

One use case, everything known about it. Open to everyone; editable by
whoever owns it.

## What's on it

- **Title, description, owner, authors, team, department, AI tools,
  approaches** — approaches are a set, so a record can be both Agentic and
  AI-built.
- **Status** with its controls.
- **The four documented gates**, as toggles.
- **The ROI panel** — success criterion, baseline and post with a stated
  methodology, net-impact statement, positive/negative, and **build effort**:
  a [self-reported estimate](../concepts/gates-and-roi.md#build-hours) of the
  hours spent building, shown whether or not ROI is measurable yet.
- **Where to find it** — links to the thing itself: the live tool, the
  GitHub repo, a Claude artifact/project/skill, or anything else with a label
  you write. As many as the workflow has. Not to be confused with
  [linked workflows](linked-workflows.md), which relate two *records*.
- **The seven scoping-worksheet ratings**.
- **[Linked workflows](linked-workflows.md)**.
- **Activity** — the record's story in one stream: every status change and
  every [comment](comments.md), interleaved oldest-first, with the comment
  box at the bottom where the story ends. Status events stay compact
  one-liners; comments keep their cards and their threading. History notes
  show with their entries — except the annual-ROI confirmation note, which
  only admins see here, for [the same reason Wins is gated](wins.md): it may
  carry dollar figures.

## Editing where you read

Fields are editable in place — you change a record on the page where you read
it, without a round trip through a separate form. `/use-cases/[id]/edit`
still exists for editing everything at once.

**Tooltips and hints** sit on every field whose name isn't self-explanatory.
The vocabulary here is program jargon; the record page explains it rather
than assuming.

## Rules that surprise people

**Links are edited as a set, not in place.** Every other field on this page
is click-to-edit; "Where to find it" opens a small editor with a Save button
instead. The in-place editor holds one value per field, and a list of links
is neither — it needs add, remove, and reorder. Linked workflows work the
same way, for the same reason.

**A link must start with `http://` or `https://`.** Anything else is refused
at save. These render as clickable anchors, so a `javascript:` or `data:`
URL would be a way to attack anyone reading the record — and every signed-in
person can read every record. The page checks a second time when it draws
each link, so a row written before the check existed still can't become a
dangerous one.

**Localhost and single-word hostnames are refused too.** `http://localhost:3000`
is useless to everyone except the person who pasted it.

**Editing everything at once can no longer blank a field you didn't touch.**
`/use-cases/[id]/edit` submits every field it holds, so any field the page
forgot to load first would save as empty. Build effort was lost this way on
every full-form edit until 2026-08-20. The form's starting values are now
derived from the record rather than hand-listed, and a test fails if a new
field is ever left out.

## Status controls

Who can move what is [the status rules](../concepts/statuses.md). The
controls only show the moves you can actually make — an AI Lead never sees a
Qualified button that would fail server-side.

Admins get two extra controls: **Qualify** (and reject, which drops the
record back to Launched with a visible reason) and **Confirm Positive ROI**,
which requires a note articulating the annual ROI. Confirming with an
incomplete ROI panel shows the gaps and proceeds anyway.

## Who can do what

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| Read everything | ✅ | ✅ | ✅ |
| Comment | ✅ | ✅ | ✅ |
| Edit fields, toggle gates | — | own | any |
| Move status (first five) | — | own | any |
| Link / unlink | — | any record | any |
| Qualify / reject / confirm ROI | — | — | ✅ |
| Delete | — | own | any |

"Own" means creator, named owner, or credited author.

## Program membership

Admins see a **Program** card in the aside with one checkbox: *Counts toward
the program*. Ticking it adds a community record to the 45 and the 15;
unticking removes a record from every number on the dashboard. Nobody else
sees the card, and the check is enforced server-side.

Moving a record to Qualified or Confirmed Positive ROI ticks it on its own —
that promotion *is* an admin saying the record counts.

Admins reach for this on their own records too: only an AI Lead's record is
stamped in-program at creation, so a workflow you log as an admin starts as a
community record and you tick the box if you mean it to count.

**There is no history entry for a membership change.** The status-change log
is for statuses, and a no-op entry there would corrupt Movement and the
weekly post, which both read it as a promotion or a regression. A record's
badge tells you where it stands now, not who moved it.

## Related

- [Statuses](../concepts/statuses.md)
- [Gates and ROI](../concepts/gates-and-roi.md)
- [Comments](comments.md)
