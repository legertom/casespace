---
title: Roles and permissions
audience: everyone
updated: 2026-08-25
code:
  - src/lib/permissions.ts
  - src/lib/view-as.ts
  - src/lib/current-user.ts
  - src/lib/login-role.ts
---

# Roles and permissions

Four roles, in order of reach: **viewer**, **employee**, **contributor** (an
AI Lead), **admin**.

The role is derived on **every sign-in** (`deriveLoginRole`), never stored by
hand: an alias in the `admin_emails` setting makes you an admin, a matching
row on the [AI Leads roster](../features/roster.md) makes you a contributor,
any `@clever.com` alias makes you an employee, and anything else is a viewer.
So a roster change takes effect the next time that person signs in, and there
is no role to migrate.

**Viewer means "signed in but not a Clever employee"** — the allow-listed
guests in `allowed_login_emails`. It is not the default any more; employees
are.

## The visibility rule

**Every page is visible to every authenticated user.** What's New included.
The casebook, every record, and every record's status stay open to all.

There are exactly **three read exceptions**:

| Surface | Helper | Why |
|---|---|---|
| Adoption pulse charts on Goals | `canViewPulse` | Survey readings, admin-only |
| The Wins report | `canViewWins` | Annual-ROI notes may carry dollar figures, which never appear on an open surface |
| Coach learnings | `canViewCoachLearnings` | Being measured is a different thing from being helped — see the helper's own note |

The **Community submissions** card on the dashboard is *not* a fourth
exception. It is chrome hidden from non-admins because it is a queue of
decisions only an admin can make; every record on it is public in the
casebook.

Everything else that is gated is gated for **writes**. Gating is enforced
server-side in the actions, not just by hiding nav links.

## What each role can do

| | Viewer | Employee | AI Lead | Admin |
|---|---|---|---|---|
| Read the casebook, records, dashboard, What's New | ✅ | ✅ | ✅ | ✅ |
| **Comment** | ✅ | ✅ | ✅ | ✅ |
| Create a use case | — | ✅ | ✅ | ✅ |
| Edit a record | — | own¹ | own¹ | any |
| Move status among the first five | — | own¹ | own¹ | any |
| New records they own count toward the 45 / 15 | — | —³ | ✅ | —³ |
| Link workflows | — | —² | ✅ | ✅ |
| Unlink from a record they can edit | — | ✅ | ✅ | ✅ |
| Qualify, reject, confirm ROI | — | — | — | ✅ |
| Add a record to the program, or remove it | — | — | — | ✅ |
| Edit roster, ELT targets, pulse snapshots | — | — | — | ✅ |
| Regenerate / edit What's New posts | — | — | — | ✅ |
| See pulse charts, Wins, and Coach learnings | — | — | — | ✅ |

¹ "Own" means creator, named owner, or credited author (`canEditUseCase`).
² Employees are narrower than AI Leads here, and only here — see below.
³ Membership follows the record's **owner**, not who typed it in: a record
owned by an AI Lead counts whoever logs it, and anyone else's — admins
included, deliberately — is a **community** record. An admin adds one to the
program with the toggle, which only they have. See
[counting rules](counting-rules.md#program-and-community).

## Four deliberate exceptions

**Viewers can comment.** This is the app's only viewer-permitted write, and
it is on purpose: commentary is not record data, and the point of comments is
that people who don't build workflows still get a voice on them. Editing a
comment is the author's alone; deleting is the author's or an admin's
(moderation).

**Linking ignores ownership.** Any AI Lead can link any two records
(`canLinkUseCases`). Spotting that two workflows are the same thing, or that
one builds on another, is program knowledge — and the lead who spots it
usually owns neither record. Removing a link is open to whoever made it, an
admin, or anyone who can edit a record at either end
(`canUnlinkUseCases`), so an owner can always take a link off their record.

**Employees cannot link, though they can do everything else an AI Lead can
to their own records.** This is the one asymmetry between the two roles
besides counting. It follows from the exception above: linking reaches
records the person does not own, which is the program knowledge the roster
is for. If it turns out to bite, widening `canLinkUseCases` is a one-line
change.

**Qualified and Confirmed Positive ROI are admin-only in both directions.**
They record Kate's decisions, and a decision you can quietly undo isn't one.

## View as

An admin can preview the app as an AI Lead, an Employee, or a Viewer — see
[view as](../features/view-as.md). The security property, unit-tested: it can
only ever step an admin **down**. `admin` is not a previewable value, and a
forged cookie on a non-admin account changes nothing.

## Related

- [Counting rules](counting-rules.md) — program vs community
- [Statuses](statuses.md)
- [Comments](../features/comments.md)
- [Authentication](../integrations/auth.md)
