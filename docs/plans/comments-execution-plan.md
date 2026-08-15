# Execution plan: Comments on use-case records + in-app notifications

**Audience: the Opus agent (or agent team) executing this work.** This file is
self-contained — you should not need the originating conversation. The product
decisions come from Part 5 of `docs/coach-form-improvements.md` (read it before
starting; if this file and that one disagree on a product decision, Part 5
wins and this file has a bug worth flagging). Decisions dated 2026-08-12,
made by Tom Leger and Kate Schaff.

## What you are building

Jira-style comments on use-case records, plus an in-app notification bell.
"Like Jira" cashes out as exactly four behaviors: **@-mentions** (picker
writes `mentionedUserIds`, no name-parsing), **participants stay in the
loop** (new comment notifies the record's people and every prior commenter;
a reply also notifies the parent's author), **markdown bodies** (rendered
with the `react-markdown` + `remark-gfm` stack already used in
`src/app/(app)/whats-new/page.tsx`), and **an edit trail** (`editedAt`
renders as "edited").

One deliberate deviation from Jira: comments **thread, up to 6 levels**
(depth 0–5). Jira is flat; Tom chose threading on purpose. Do not "fix"
this in either direction.

Notifications are **in-app only. Email is explicitly deferred** — do not
add email, do not add a queue, do not add polling or sockets. Page-load
freshness is correct for ~22 users.

## Hard constraints (read before writing any code)

1. **Permissions.** `canComment(role)` in `src/lib/permissions.ts`, true
   for **every role including viewer** — this is the app's first
   viewer-permitted write and it is deliberate. Unit-test it beside its
   neighbors in `src/lib/permissions.test.ts`. Editing: author only.
   Deleting: author or admin (admin check via the existing
   `canManageProgram`).
2. **The Coach (AI) neither reads nor writes comments.** Do not feed
   comments into `get_use_case`, the MCP surface, or What's New generation.
3. **Comments are public** (visible to anyone who can see the record, i.e.
   everyone authenticated). Do not confuse them with the private
   `/feedback` concept from Part 3 — that is separate, unbuilt work.
4. **Soft delete.** A deleted comment with replies renders a "comment
   removed" placeholder so the thread doesn't orphan; a deleted leaf
   disappears entirely.
5. **No new dependencies** unless truly unavoidable. The markdown stack,
   people-autocomplete pattern (`src/components/people-picker.tsx`), date
   formatting (`fmtDate` in `src/lib/format.ts`), and `<details>` dropdown
   pattern (user menu in `src/app/(app)/layout.tsx`) all already exist.

## Codebase conventions to follow

- ORM is **Drizzle** (not Prisma). Schema: `src/db/schema.ts`. Migrations:
  `npm run db:generate` emits SQL into `drizzle/`; `npm run db:migrate`
  applies (build also runs migrate). Follow the `statusChanges` table
  (`src/db/schema.ts:318`) for conventions: uuid PKs via `defaultRandom()`,
  `onDelete: "cascade"` to the use case, `timestamp(..., { withTimezone: true })`.
- Server actions live in `src/server/actions-*.ts` with the
  `actions-posts.ts` shape: `"use server"`, `requireUser()` from
  `@/lib/current-user`, return `ActionResult` (`{ error?: string }`),
  `revalidatePath(...)` on success, permission checks first.
- Pure domain logic (constants, recipient calculation, depth rules) lives
  in `src/lib/` with colocated vitest files (`*.test.ts`) — see
  `domain.ts`/`domain.test.ts` and `gap-flags.ts`/`gap-flags.test.ts`.
- Small interactive islands are client components following
  `src/components/status-controls.tsx`; pages stay server-rendered.
- Verification gates: `npm run typecheck`, `npm run test`, `npm run lint`.
  All three must pass before you call any phase done.

## Note on the header layout

`src/app/(app)/layout.tsx` recently gained a mobile hamburger nav
(committed `35732d3`): the primary nav is hidden below `md:` and a
`<details>` hamburger menu carries it on small screens. Workstream C's
bell must work with both — place it beside the user menu so it stays
visible at every breakpoint (it should not be buried inside the hamburger),
and check the header at the mobile width before calling C done.

---

## Orchestration

Run this as **one Phase 1 pass, then two parallel subagents, then one
integration pass**. Phase 1 is the shared foundation — everything else
imports from it, so do it in the main agent (or a single subagent) and land
it before fanning out. Workstreams B and C touch disjoint files after
Phase 1 and should run as **parallel subagents**; give each the full text
of this file plus its own section. Phase 3 is a single verifying agent.

```
Phase 1 (A): schema + domain + permissions + recipient helper   [sequential, blocking]
Phase 2:     B) record-page comments UI + actions   C) header bell   [parallel subagents]
Phase 3 (D): integration, tests green, AGENTS.md, docs update    [single agent]
```

---

## Phase 1 — Workstream A: data + pure logic (blocking)

### A1. Schema (`src/db/schema.ts`)

Two tables + one enum, modeled on `statusChanges`:

```
use_case_comments
  id                uuid PK defaultRandom
  useCaseId         → use_cases.id, notNull, cascade
  authorId          → users.id, notNull
  parentId          → use_case_comments.id, nullable, cascade   -- null = top level
  depth             integer notNull                             -- 0–5, set server-side
  body              text notNull                                -- markdown
  mentionedUserIds  uuid[] notNull default {}
  createdAt         timestamptz notNull defaultNow
  editedAt          timestamptz nullable
  deletedAt         timestamptz nullable                        -- soft delete

notifications
  id          uuid PK defaultRandom
  userId      → users.id, notNull, cascade      -- recipient
  kind        pgEnum: 'comment' | 'reply' | 'mention'
  useCaseId   → use_cases.id, notNull, cascade
  commentId   → use_case_comments.id, notNull, cascade
  actorId     → users.id, notNull
  readAt      timestamptz nullable
  createdAt   timestamptz notNull defaultNow
```

Note: Drizzle self-references (`parentId`) need the
`(): AnyPgColumn => useCaseComments.id` callback form. Add doc comments in
the style of the neighboring tables. Then `npm run db:generate` and check
the emitted SQL in `drizzle/` by eye before migrating.

### A2. Domain constant (`src/lib/domain.ts` + `domain.test.ts`)

`export const MAX_COMMENT_DEPTH = 6;` beside the other program constants.
Depth is set at insert to `parent.depth + 1`; the server action rejects
anything that would reach depth ≥ 6; the Reply control simply doesn't
render on depth-5 comments.

### A3. Permission (`src/lib/permissions.ts` + `.test.ts`)

`canComment(role)` returning true for every role, with a doc comment noting
it's the app's first viewer-permitted write and why. Tests beside the
existing permission tests.

### A4. Recipient helper (`src/lib/comment-notifications.ts` + `.test.ts`)

A **pure function** `commentNotifications(...)` that takes plain data (the
actor id, mentioned ids, parent author id or null, the record's people —
`ownerUserId`, linked `useCaseAuthors.userId`s, `createdById` — and prior
commenter ids) and returns `{ userId, kind }[]`, de-duplicated so each
person gets **exactly one** notification carrying the **most specific
kind**, priority: `mention` > `reply` > `comment`. **Never include the
actor.** Filter nulls (owner/authors can be unlinked). Unit-test the
priority, the de-dupe, the self-exclusion, and the null-handling
exhaustively — this is the logic most likely to embarrass us.

**Gate:** typecheck + tests green, migration generated and applied locally.
Commit Phase 1 on its own.

---

## Phase 2 — parallel subagents

### Workstream B: comments on the record page

Files: `src/server/actions-comments.ts` (new),
`src/components/comment-thread.tsx` + composer/controls (new, client),
`src/app/(app)/use-cases/[id]/page.tsx` (edit),
query support in `src/server/use-case-queries.ts` or a new
`src/server/comment-queries.ts`.

**Server actions** (`actions-comments.ts`, `actions-posts.ts` shape):
- `addCommentAction(useCaseId, body, parentId | null, mentionedUserIds)` —
  `requireUser`, `canComment`, body non-empty after trim, verify the record
  exists; if `parentId`, load parent, verify same record, verify
  `parent.depth + 1 < MAX_COMMENT_DEPTH... (< 6, i.e. new depth ≤ 5)`,
  reject deleted parents. Insert comment, then **in the same action**
  compute recipients via `commentNotifications(...)` (one small query for
  prior commenter ids + the record's people columns) and bulk-insert
  `notifications`. No queue, no cron. `revalidatePath` the record page.
- `editCommentAction(commentId, body)` — author only; sets `editedAt`.
- `deleteCommentAction(commentId)` — author or `canManageProgram`; sets
  `deletedAt` (soft). Never hard-delete.

**UI** on the record page, main column, **below the History section**
(`page.tsx`, History heading is around line 291):
- Server-rendered "Comments" section: nested by depth with indentation,
  author name + `fmtDate(createdAt)`, markdown body via
  `ReactMarkdown` + `remarkGfm` (copy the whats-new usage), "edited"
  marker when `editedAt`, "comment removed" placeholder for soft-deleted
  comments that have live descendants (deleted leaves: omit entirely).
- Each comment wrapped in `id={"comment-" + id}` so notifications can
  deep-link with `#comment-{id}`.
- Client islands (`status-controls.tsx` pattern): a composer (textarea —
  "a textarea that renders rich is the honest version of Jira's box", no
  custom editor), Reply (hidden at depth 5), Edit (author), Delete
  (author/admin, with confirm).
- **@-mentions:** typing `@` in the composer opens a person autocomplete —
  reuse/adapt the pattern in `src/components/people-picker.tsx`. Selecting
  inserts the display name into the body text AND records the user id into
  a `mentionedUserIds` array submitted with the action. Ids are the source
  of truth; never parse names back out of the body.
- Match the page's existing Tailwind idiom (font-serif headings, `hairline`
  borders, `ink-muted` text — read the surrounding sections and blend in).

### Workstream C: the header bell

Files: `src/app/(app)/layout.tsx` (edit — **see the coordination hazard
above first**), a small notifications query module (new, e.g.
`src/server/notification-queries.ts`), `src/server/actions-notifications.ts`
(new) for mark-read/mark-all-read.

- A bell button beside the user menu, rendered **per request** in the
  server-component layout like everything else there. Unread count badge
  (cap the display at "9+").
- Dropdown using the **same `<details>` pattern as the user menu** in that
  file: recent notifications (~15), newest first, each line shaped by kind —
  "{actor} commented on {record title}", "{actor} replied to your comment
  on {title}", "{actor} mentioned you on {title}" — with `fmtDate`.
- Clicking a notification marks it read (server action) and navigates to
  `/use-cases/{useCaseId}#comment-{commentId}`. A "Mark all read" control
  clears the badge. Unread rows visually distinct (e.g. dot / weight).
- **No polling, no sockets, no client refresh loop.** The bell is fresh on
  every navigation; that is the design, not a gap.
- Joins needed: actor name (`users`), record title (`useCases`). Keep it
  one query.

---

## Phase 3 — Workstream D: integration + docs (single agent)

1. Full gate: `npm run typecheck && npm run test && npm run lint`, plus
   `npm run build` once to prove the migration + build path.
2. Manual verification with the dev server (`npm run dev`, or the
   launch.json preview if configured): post a top-level comment, reply to
   depth 5 and confirm Reply disappears, @-mention someone, edit (see
   "edited"), soft-delete a mid-thread comment (see placeholder), then as
   the mentioned/participant user confirm the bell badge, the dropdown
   copy, deep-link to the anchor, mark-read and mark-all-read. Also confirm
   a **viewer** role can comment (use the app's view-as if available).
3. Confirm the actor never self-notifies.
4. **Amend `AGENTS.md`**: comments exist; the Coach/AI must not read or
   write them; if the AI ever proposes a comment it must be a proposal card.
5. Update `docs/coach-form-improvements.md` Part 5 / Sequencing with a
   "shipped" note + commit hashes, matching the doc's existing style.
6. If a `release_notes` source exists by then (Part 7), leave a note for
   What's New: "Comments and notifications shipped." If not, skip.

## Explicitly out of scope — do not build

- Email notifications (deferred, decided).
- The Coach reading or writing comments.
- `/feedback` (Part 3 — different feature, private, unbuilt).
- Reactions, resolve/unresolve, attachments, rich-text editor toolbars.
- A "new What's New post" notification kind (noted as plausible later use
  of the bell; not in scope).

## Acceptance checklist

- [ ] Any authenticated role — including viewer — can comment; `canComment` exists and is tested
- [ ] Threads nest to exactly 6 levels; depth enforced server-side AND Reply hidden at depth 5
- [ ] @-mention autocomplete stores ids in `mentionedUserIds`; mentioned users get `mention` notifications
- [ ] New comment notifies record people + all prior commenters (`comment`); replies notify parent author (`reply`); one notification per person, most specific kind wins; never the actor
- [ ] Markdown renders (gfm); `editedAt` shows "edited"; soft-delete leaves placeholder only when replies exist
- [ ] Bell shows unread count, dropdown lists recent, click marks read + deep-links to `#comment-{id}`, mark-all-read works
- [ ] No email, no polling, no Coach involvement, no new heavyweight deps
- [ ] typecheck + test + lint + build green; migration applies cleanly
- [ ] `AGENTS.md` and `docs/coach-form-improvements.md` amended
