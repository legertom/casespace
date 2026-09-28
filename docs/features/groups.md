---
title: Saved groups
surface:
  - /groups
  - /groups/[id]
audience: admin
updated: 2026-09-27
code:
  - src/app/(app)/groups/page.tsx
  - src/app/(app)/groups/[id]/page.tsx
  - src/components/groups/group-report.tsx
  - src/components/groups/group-run-controls.tsx
  - src/server/actions-live-groups.ts
  - src/server/meeting-group-models.ts
  - src/db/schema.ts
  - src/lib/ai/meeting-breakouts.ts
---

# Saved groups

## What it does

Every successful live sorting attempt in the [Coach](coach.md) is stored as a
separate run. `/groups` lists the attempts and their assignments. Open one for
a printable explanation report covering the possible commonality, casebook
evidence, why that mix might be useful, and a discussion opener for each group.

## Who can do what

Only admins can view the history, open reports, form groups, or delete a run.
The page and server actions both enforce that role.

## How to use it

Select the AI Leads present in Coach, review their credited use cases, then run
Jev or Claude Opus. A successful run saves immediately, even if you try the
other method or never click **Use this plan**. Open **Saved groups** from the
Coach workspace or account menu. On a report, **Print or save PDF** produces a
document you can bring to the meeting. **Delete attempt** removes that run and
its report.

## Rules that surprise people

- Each method click creates a new run. Repeating a method does not overwrite an
  earlier attempt.
- Groups have at least 2 and at most 5 people; everyone selected appears once.
- Jev chooses among complete candidate partitions. Claude Opus writes the
  explanation report for either method, so the report does not claim Jev wrote
  prose. If explanation generation fails, a cautious case-based report is
  saved with the successful assignment.
- When at least two attendees have no credited cases, Jev keeps them together
  to compare the AI work they are exploring. Their report poses a question to
  discover in the room, since the casebook has no evidence of a shared theme.
- Commonalities are discussion hypotheses based on logged use cases. Today's
  obstacles are supplied by people in the room, not inferred from records.
- Deletion is permanent and affects only the selected run, not Coach chats or
  use cases.

## Related

- [The Coach](coach.md)
- [The AI Leads roster](roster.md)
