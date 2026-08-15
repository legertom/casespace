---
title: Notifications
audience: everyone
updated: 2026-08-14
code:
  - src/components/notifications/notification-bell.tsx
  - src/lib/comment-notifications.ts
  - src/lib/link-notifications.ts
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

## Reading them

Opening a notification marks it read and takes you to the record. **Mark all
read** clears the bell.

## Related

- [Comments](comments.md)
- [Linked workflows](linked-workflows.md)
