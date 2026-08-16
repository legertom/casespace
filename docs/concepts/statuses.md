---
title: Statuses
audience: everyone
updated: 2026-08-15
code:
  - src/lib/domain.ts
  - src/components/status-controls.tsx
  - src/components/status-badge.tsx
---

# Statuses

Every use case sits at exactly one of seven statuses. The order is the
pipeline; nothing skips ahead except by someone choosing to set it.

| # | Status | Short label | Who can move it |
|---|---|---|---|
| 1 | In Discovery | Discovery | Editors |
| 2 | Approved by Functional Leader | FL Approved | Editors |
| 3 | Under Construction | Building | Editors |
| 4 | In Testing | Testing | Editors |
| 5 | Launched | Launched | Editors |
| 6 | **Qualified** | Qualified | **Admins only** |
| 7 | **Confirmed Positive ROI** | ROI Confirmed | **Admins only** |

"Editors" means an admin, or a contributor who created, owns, or is credited
as an author on the record (`canEditUseCase`).

## The movement rules

`canSetStatus(role, from, to)` is the whole rule, and it is unit-tested:

- **Viewers never move a record.**
- Editors move records **freely among the first five statuses**, forward or
  backward. People fix mistakes, and a record that went to Testing too early
  should be able to go back.
- **Anything entering or leaving Qualified or Confirmed Positive ROI is
  admin-only.** Both record Kate's decisions, in both directions.
- **Confirmed Positive ROI is reachable only from Qualified.** This is what
  makes the 15 a subset of the 45 structurally rather than by agreement, and
  it matches Kate's flow: qualify first, confirm ROI once it's measured.
- **A record is never created at a gated status.** Every door — the form,
  the wizard, the notes parser, the REST API, and MCP — can start a record
  at any of the first five statuses (`SETTABLE_STATUSES`), and only those.
  Qualified and Confirmed Positive ROI are reached exclusively through the
  transition rules above.

## The Qualified gate

Qualified is where the four documented gates get checked by a person. An
admin can **reject** instead of promoting — the record drops back to
Launched with a visible reason, so the author knows what to fix rather than
watching a record sit still.

## Confirming ROI

Promoting to Confirmed Positive ROI **requires a note** articulating the
annual ROI. That note is the artifact the end-of-year report is built from;
it is why the note is mandatory and why [Wins](../features/wins.md) is
admin-only. The [ROI evidence checklist](gates-and-roi.md) warns about gaps
at confirmation time but never blocks — the call is Kate's.

## Every change is logged

Every status change writes a row to `status_changes`: who, when, from → to,
and the note. Nothing writes a status outside the transition helpers, so the
history is complete. Three features read it:

- **Movement this week** on [the dashboard](../features/dashboard.md)
- **Needs attention** flags (a record stale in its status ≥ 21 days)
- The weekly [What's New](../features/whats-new.md) post

## Related

- [Counting rules](counting-rules.md)
- [Gates and ROI](gates-and-roi.md)
- [The record page](../features/record.md)
