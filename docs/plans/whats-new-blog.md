# Execution plan: What's New as a real blog

**Audience: the agent executing this work.** Self-contained; you should not
need the originating conversation. Requested by Tom Leger, 2026-08-15. The
ask, verbatim: expand What's New to be more blog-like, keep past weeks'
posts in an archive, never overwrite content, and make articles
deep-linkable.

## What exists today (read these first)

- `src/app/(app)/whats-new/page.tsx` — one page: sidebar archive + selected
  post, selection via `?post=<uuid>` query param. Every week is already its
  own `posts` row (`weekStart` unique), so the archive *data* exists; what's
  missing is real URLs and a blog-shaped reading experience.
- `src/app/(app)/whats-new/[id]/edit/page.tsx` — admin edit form.
- `src/server/whats-new.ts` — `generateWhatsNew` upserts on `weekStart`:
  regenerating **replaces title and body and clears `editedAt`**, silently
  destroying an admin's hand edits. This is the overwrite Tom wants gone.
- `src/app/api/cron/whats-new/route.ts` — Monday cron; calls the same
  upsert, so a cron re-run would also clobber an edited post.
- `src/server/actions-posts.ts` — `regeneratePostAction`, `updatePostAction`
  (plain update; the outgoing text is simply lost).

## The design

### 1. Permalinks: the week is the URL

An article's canonical URL is `/whats-new/<weekStart>` — e.g.
`/whats-new/2026-08-10`. The week start is the post's natural identity:
unique by constraint, human-readable, sortable, and stable under edits and
regeneration. **Do not use title slugs** — titles change on edit and the
link must not.

- New route `src/app/(app)/whats-new/[week]/page.tsx`. Validate the param
  with a pure helper (regex `^\d{4}-\d{2}-\d{2}$` **and** `mondayOf(week)
  === week`, reusing `mondayOf` from `src/server/whats-new.ts` — move it
  into `src/lib/` if importing server code into a pure test is awkward).
  Invalid → `notFound()`.
- **Route conflict you must resolve:** Next.js forbids sibling dynamic
  segments with different names, so the existing `[id]/edit` cannot live
  beside `[week]`. Move the edit page to
  `src/app/(app)/whats-new/[week]/edit/page.tsx`, keyed by week.
- **Old links keep working** (repo precedent: `?status=qualified_plus`
  aliases in the casebook). `/whats-new?post=<uuid>` looks up the post and
  `redirect()`s to `/whats-new/<weekStart>`. A `[week]` param that parses
  as a uuid does the same lookup-and-redirect. Unknown id → the index.

### 2. The index becomes an archive page

`/whats-new` becomes a reverse-chronological archive: each post is a card —
title (linked to its permalink), "Week of …", drafted/edited line, and an
excerpt. Excerpt = first paragraph of the body, markdown stripped, as a pure
tested function (`postExcerpt` in `src/lib/`, beside a `weekSlug` helper).
The newest post may render in full at the top if that reads better; the
cards below are links, not full text. The sidebar-archive layout goes away.

The article page gets prev/next links (adjacent `weekStart`s) and a
`generateMetadata` export using the post's title and excerpt, so in-app
sharing and browser tabs name the article. Be honest in the doc you write:
external unfurls of deep links still show the app's generic card, because
anonymous fetches redirect to `/signin` — that is the auth model working,
not a bug.

### 3. Nothing is ever overwritten again

New table `post_revisions`, append-only — the outgoing version of a post,
captured whenever anything replaces its text:

```
id, postId (fk cascade), title, body, model,
generatedAt, editedAt          -- copied from the outgoing row
replacedAt (now), replacedById -- null when the cron did it
reason: 'regenerated' | 'edited'
```

- `updatePostAction` writes the outgoing version to `post_revisions`, then
  updates — **in one `db.transaction`** (the write paths were made
  transactional on 2026-08-15; follow `use-case-service.ts` as the model).
- `generateWhatsNew` splits into insert and replace paths. Replace archives
  the outgoing version first, same transaction.
- **The cron becomes insert-only** (`onConflictDoNothing`, report
  `skipped: true`). A Monday re-run can never touch an existing week. Only
  a human clicking Regenerate replaces content.
- `RegenerateButton` on a post with `editedAt` set warns before acting:
  "This post was edited by hand — regenerating archives the edited version
  and starts over." Archived, not lost; the warning is the consent.
- **No revisions UI in v1.** The table is cheap insurance; admins can read
  it in the database. Add a UI only when someone actually asks.

### 4. What this deliberately does not include

- **No RSS feed** — the app is Google-gated; feed readers can't sign in.
- **No public articles** — every page stays behind auth (AGENTS.md rule:
  every page visible to every *authenticated* user; What's New included).
- **No comments on posts** — comments belong to records.

## Order of work

1. Pure helpers + tests (`weekSlug` validation, `postExcerpt`).
2. Routes: `[week]` article page, move edit to `[week]/edit`, legacy
   redirects, archive index. No schema change yet — this alone delivers
   permalinks and the blog shape.
3. Schema: `post_revisions` + migration; transactional capture in
   `updatePostAction` and `generateWhatsNew`; cron insert-only; the
   regenerate warning.
4. Docs + changelog, same commit as the feature (AGENTS.md): update
   `docs/features/whats-new.md` front matter — `surface:` gains
   `/whats-new/[week]` and `/whats-new/[week]/edit`, drops
   `/whats-new/[id]/edit` — or `pnpm test` fails on the docs manifest.
   Changelog entries written for the newsletter reader.

## Hard constraints

1. `weekStart` stays the posts table's unique key; the permalink derives
   from it. No new slug column.
2. Every content-replacing write goes through a transaction that archives
   the outgoing version first. No path — cron, action, or future tool —
   may replace text without a `post_revisions` row.
3. Reading stays open to every role; drafting, editing, regenerating stay
   admin-only, enforced server-side (as today).
4. The What's New generator still never reads comments (AGENTS.md).

## Decisions (Tom, 2026-08-15)

1. Regenerating an edited post: **warn-and-archive**, as planned above.
2. The archive index shows **the newest post in full**, with a generous
   excerpt for each earlier week.

**Status: executed 2026-08-15**, same day, in the session that wrote this
plan. Kept as the record of what was decided and why.
