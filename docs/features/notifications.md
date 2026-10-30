---
title: Notifications
audience: everyone
updated: 2026-10-30
code:
  - src/components/notifications/notification-bell.tsx
  - src/components/hover-menu.tsx
  - src/lib/comment-notifications.ts
  - src/lib/link-notifications.ts
  - src/lib/new-use-case-notifications.ts
  - src/lib/ready-to-confirm.ts
  - src/server/use-case-service.ts
  - src/server/notification-queries.ts
  - src/server/actions-notifications.ts
---

# Notifications

A bell in the header. **In-app only** — Casespace sends no email.

## What raises one

| Kind | Raised by |
|---|---|
| `mention` | Someone @-mentioned you in a comment, when it was posted **or on a later edit** |
| `reply` | Someone replied to your comment |
| `comment` | A new comment on a record you're part of |
| `link` | Someone linked a record you're credited on to another |
| `new_use_case` | Someone logged a **program** use case — **admins only** |
| `ready_to_confirm` | A program record became **ready for Confirmed Positive ROI** — **admins only** |

## Who hears about a comment

Everyone on the record, plus everyone already talking on it:

- Prior commenters on the record
- Credited authors
- The owner
- Whoever logged it
- The parent comment's author (when it's a reply)
- Anyone mentioned

**Each person gets exactly one notification**, carrying the most specific
reason they have: mention beats reply beats participation. The person who
wrote the comment is never notified about their own words, and people who
have never signed in (unlinked directory names) are dropped.

An **edit** can name someone who wasn't named when the comment was posted,
and they hear about it. Anyone already named stays quiet; removing a name
notifies nobody, since the notification already sent was true when it was
sent. Someone already told about that comment for a weaker reason has their
notification upgraded to `mention` and marked unread again, rather than
getting a second bell for one comment.

## Who hears about a link

Anyone credited on **either** record — owner, authors, and whoever logged
it. Linking is something a lead can do to a record they don't own, so the
people who do own it get told.

One notification per person. Someone credited on both records is pointed at
the record the link was made **from**, which is where the person who made it
was looking.

## Who hears about a new use case

**Every admin**, every time a use case is logged — from any door: the form,
the wizard, the notes parser, the REST API, or MCP. The count of documented
use cases is what admins are accountable for, and a record nobody saw arrive
is a record nobody can qualify.

Nobody else is told. Everyone else meets new records on the casebook, which
is open to all. An admin who logs a record is not told about their own.

## Who hears that a record is ready to confirm

**Every admin**, the moment a record becomes *ready to confirm*: Qualified,
in the program, and with every item on the
[ROI checklist](../concepts/gates-and-roi.md) satisfied. That is the point
where nothing is left for the record's people to do and the decision about
the 15 is Kate's. The same rule draws the **Ready to confirm** badge on
[the record](record.md) and [the casebook](casebook.md); see
[Statuses](../concepts/statuses.md#ready-to-confirm).

It fires on whatever write makes the record ready — the field edit that
completes the checklist, from any door (the page, the Coach's proposal card,
REST, MCP), qualifying a record whose checklist was already complete, or an
admin bringing such a record back into the program. Whoever made that write
isn't told. Later saves of a record that is still ready ring nothing.

Opening it lands on the record, where the badge and Kate's status controls
are.

## Reading them

Hovering the bell opens the list; moving the mouse away closes it, as it does
for every menu in the header. On a phone, where there is no hover, tap it.

Opening a notification marks it read and takes you to the record. **Mark all
read** clears the bell.

## Rules that surprise people

**Community submissions do not ring the bell at all.** Anyone at Clever can
log a use case, but only records that count toward the program notify admins.
The bell shows 15 rows, caps its badge at "9+", and has no digest, no
batching, and no per-kind filter — so a burst of community records would push
every comment, reply, mention, and link off the visible list. The things that
need an answer would be evicted by the things that need a look.

Community records reach admins instead as a **Community submissions** card on
the dashboard, with a count and the most recent titles, which an admin opens
on their own schedule. The rule lives in `newUseCaseNotifications`, so it is
unit-tested rather than inferred from the server action.

**A ready notification goes quiet when the record stops being ready.**
Every other notification stays unread until you open it: it was news when
it was sent and still is. This one is a request for a decision, so once the
decision is made — the record is confirmed, rejected back to Launched, has a
checklist item reopened, or is taken out of the program — any unread ready
notification about it is marked read. Otherwise Kate, confirming straight
from the badge, would still see the bell lit for a record she just
confirmed.

**A record that comes back rings again, but never twice.** If a ready
record drops out — say someone reopens its ROI to fix a number — and is
later completed again, admins are told again, since it is waiting on Kate
again. The earlier notification is replaced rather than joined by a second,
so each admin holds at most one ready notification per record. The rule is
`readyToConfirmBell` in `src/lib/ready-to-confirm.ts`, and its tests walk
through each case.

**It goes to every admin, not to Kate by name.** Qualifying and confirming
are admin decisions, and the bell follows the role rather than one account,
so it keeps working if the program gains a second decision-maker or Kate
signs in under a new address.

## Related

- [Comments](comments.md)
- [Linked workflows](linked-workflows.md)
