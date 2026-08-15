---
title: Linked workflows
audience: everyone
updated: 2026-08-14
code:
  - src/components/record/link-workflow.tsx
  - src/components/record/related-workflows.tsx
  - src/server/actions-links.ts
  - src/server/use-case-link-queries.ts
  - src/lib/use-case-links.ts
---

# Linked workflows

One workflow can point at another. Three kinds:

| You say | The other record says |
|---|---|
| **Builds on** | Built on by |
| **Duplicates** | Duplicated by |
| **Relates to** | Relates to |

The picker completes a sentence: "This workflow *builds on* …".

## How they're stored

A link is stored **once**, on the record it was made from, and appears on
**both** records — the far end reads the inverse label. "Relates to" is
symmetric, so both ends say the same word and share one heading.

Each record groups its links under headings in a fixed order, and empty
headings are dropped.

## Who can do what

**Any AI Lead can link any two records** — ownership is deliberately not
consulted. Spotting that two workflows are the same thing, or that one builds
on another, is program knowledge, and the lead who spots it usually owns
neither record.

Viewers stay out: a link *is* record data, unlike a comment.

**Removing** a link is open to whoever made it, an admin, or anyone who can
edit a record at either end — so an owner who doesn't want a link on their
record can always take it off.

## Notifications

Linking notifies everyone credited on either record. See
[notifications](notifications.md#who-hears-about-a-link).

## Rules that surprise people

- Trying to link two records that are already linked tells you **what they're
  already linked as**, using the heading from your side.
- A duplicate link does not merge or hide either record. Deduplication is a
  program conversation, not something the app does silently.

## Related

- [The record page](record.md)
- [Taxonomy](../concepts/taxonomy.md#link-kinds)
