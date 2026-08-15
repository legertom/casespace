---
title: The record page
surface:
  - /use-cases/[id]
  - /use-cases/[id]/edit
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/use-cases/[id]/page.tsx
  - src/app/(app)/use-cases/[id]/edit/page.tsx
  - src/components/record/inline-field.tsx
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
- **Status** with its controls, and the full status history.
- **The four documented gates**, as toggles.
- **The ROI panel** — success criterion, baseline and post with a stated
  methodology, net-impact statement, positive/negative.
- **The seven scoping-worksheet ratings**.
- **[Linked workflows](linked-workflows.md)**.
- **[Comments](comments.md)**.

## Editing where you read

Fields are editable in place — you change a record on the page where you read
it, without a round trip through a separate form. `/use-cases/[id]/edit`
still exists for editing everything at once.

**Tooltips and hints** sit on every field whose name isn't self-explanatory.
The vocabulary here is program jargon; the record page explains it rather
than assuming.

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

## Related

- [Statuses](../concepts/statuses.md)
- [Gates and ROI](../concepts/gates-and-roi.md)
- [Comments](comments.md)
