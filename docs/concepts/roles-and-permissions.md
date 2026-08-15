---
title: Roles and permissions
audience: everyone
updated: 2026-08-14
code:
  - src/lib/permissions.ts
  - src/lib/view-as.ts
  - src/lib/current-user.ts
---

# Roles and permissions

Three roles: **viewer**, **contributor** (an AI Lead), **admin**.

## The visibility rule

**Every page is visible to every authenticated user.** What's New included.
The casebook, every record, and every record's status stay open to all.

There are exactly **two read exceptions**:

| Surface | Helper | Why |
|---|---|---|
| Adoption pulse charts on Goals | `canViewPulse` | Survey readings, admin-only |
| The Wins report | `canViewWins` | Annual-ROI notes may carry dollar figures, which never appear on an open surface |

Everything else that is gated is gated for **writes**. Gating is enforced
server-side in the actions, not just by hiding nav links.

## What each role can do

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| Read the casebook, records, dashboard, What's New | ✅ | ✅ | ✅ |
| **Comment** | ✅ | ✅ | ✅ |
| Create a use case | — | ✅ | ✅ |
| Edit a record | — | own¹ | any |
| Move status among the first five | — | own¹ | any |
| Link / unlink workflows | — | ✅² | ✅ |
| Qualify, reject, confirm ROI | — | — | ✅ |
| Edit roster, ELT targets, pulse snapshots | — | — | ✅ |
| Regenerate / edit What's New posts | — | — | ✅ |
| See pulse charts and Wins | — | — | ✅ |

¹ "Own" means creator, named owner, or credited author (`canEditUseCase`).
² On **any** two records — see below.

## Three deliberate exceptions

**Viewers can comment.** This is the app's only viewer-permitted write, and
it is on purpose: commentary is not record data, and the point of comments is
that people who don't build workflows still get a voice on them. Editing a
comment is the author's alone; deleting is the author's or an admin's
(moderation).

**Linking ignores ownership.** Any AI Lead can link any two records
(`canLinkUseCases`). Spotting that two workflows are the same thing, or that
one builds on another, is program knowledge — and the lead who spots it
usually owns neither record. Viewers stay out: a link *is* record data.
Removing a link is open to whoever made it, an admin, or anyone who can edit
a record at either end (`canUnlinkUseCases`), so an owner can always take a
link off their record.

**Qualified and Confirmed Positive ROI are admin-only in both directions.**
They record Kate's decisions, and a decision you can quietly undo isn't one.

## View as

An admin can preview the app as an AI Lead or a Viewer — see
[view as](../features/view-as.md). The security property, unit-tested: it can
only ever step an admin **down**. `admin` is not a previewable value, and a
forged cookie on a non-admin account changes nothing.

## Related

- [Statuses](statuses.md)
- [Comments](../features/comments.md)
- [Authentication](../integrations/auth.md)
