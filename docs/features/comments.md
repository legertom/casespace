---
title: Comments
audience: everyone
updated: 2026-08-14
code:
  - src/components/comments/comment-thread.tsx
  - src/components/comments/comment-composer.tsx
  - src/components/comments/comment-controls.tsx
  - src/components/comments/comment-body.tsx
  - src/server/actions-comments.ts
  - src/lib/comment-tree.ts
---

# Comments

Every record carries a comment thread. The model is Jira's — with one
difference: ours thread.

## Threading

Replies nest **six levels deep** (`MAX_COMMENT_DEPTH`, 0-based, so the
deepest comment is depth 5). At the bottom the Reply control stops rendering.
The client asking `canReplyAtDepth()` is a courtesy; the server asks again
before inserting, and the server is the rule.

## Mentions

`@` opens a picker. **Mentions are stored as user ids written by the picker
— names are never parsed out of the body.** That means a mention is always a
real person, and typing someone's name in prose doesn't silently notify them.

Mentioned people get the most specific notification kind. See
[notifications](notifications.md).

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

## The Coach is not here

The Coach neither reads nor writes comments — they are not in
`get_use_case`, the MCP surface, or What's New generation. A decision, not an
oversight. See [the Coach](coach.md#what-the-coach-cannot-see).

## Related

- [Notifications](notifications.md)
- [The record page](record.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
