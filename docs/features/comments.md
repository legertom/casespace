---
title: Comments
audience: everyone
updated: 2026-08-16
code:
  - src/components/comments/comment-thread.tsx
  - src/components/comments/comment-composer.tsx
  - src/components/comments/comment-controls.tsx
  - src/components/comments/comment-body.tsx
  - src/components/record/record-activity.tsx
  - src/server/actions-comments.ts
  - src/lib/comment-tree.ts
  - src/lib/activity.ts
---

# Comments

Every record carries comments. The model is Jira's — with one difference:
ours thread. Comments don't have their own section on the page: they render
inside the record's **Activity** stream, interleaved with status changes at
the moment they were written, and the composer sits at the bottom of the
stream.

## Threading

Replies nest **six levels deep** (`MAX_COMMENT_DEPTH`, 0-based, so the
deepest comment is depth 5). At the bottom the Reply control stops rendering.
The client asking `canReplyAtDepth()` is a courtesy; the server asks again
before inserting, and the server is the rule.

## Mentions

`@` opens a picker. **Mentions are stored as user ids written by the picker
— names are never parsed out of the body.** That means a mention is always a
real person, and typing someone's name in prose doesn't silently notify them.

A mention renders as a chip linking to that person's records, the same
destination as every other name in the app. Someone whose login isn't linked
to a directory row gets the chip without the link — there'd be nothing to
filter by. The names are matched only to find where to draw the chip; who
was mentioned still comes from the stored ids.

The edit box is the same box as the composer, so `@` works there too, and an
edit rewrites the comment's mention set. Newly named people are notified.
See [notifications](notifications.md).

## Who can do what

| Action | Who |
|---|---|
| Read | Everyone |
| Comment | **Everyone, viewers included** |
| Edit | The comment's author, only |
| Delete | The author, or an admin (moderation) |

Comments are **the one deliberate exception** to viewers being read-only.
Commentary is not record data, and the point of comments is that people who
don't build workflows still get a voice on them.

## Rules that surprise people

- **Activity reads oldest-first.** Every other timeline in the app is
  newest-first. This one is deliberately backwards: the stream ends at the
  composer, so you arrive at the box having just read the story — which is
  also what keeps the box from getting lost mid-page. Replies stay nested
  under the comment they answer, at that comment's place in time, not at
  their own.

## The Coach is not here

The Coach neither reads nor writes comments — they are not in
`get_use_case`, the MCP surface, or What's New generation. A decision, not an
oversight. See [the Coach](coach.md#what-the-coach-cannot-see).

## Related

- [Notifications](notifications.md)
- [The record page](record.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
