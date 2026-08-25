---
title: Review brief — PR #1, opening Casespace to everyone at Clever
audience: engineering
updated: 2026-08-25
---

# Review brief — [PR #1](https://github.com/legertom/casespace/pull/1)

Written for a reviewer with no context on how this was built. It says what the
change does, where I'd look hardest, what I verified, what I didn't, and what
has to be decided before merge.

Working document — delete it once the PR is merged.

## The change in six lines

- New `employee` role: anyone with a `clever.com` address can log a use case,
  edit and delete their own, comment, and move their own through the five
  pre-Qualified statuses.
- New `use_cases.in_program`, stamped once at creation from the logger's role
  and never re-derived. **Only an AI Lead's record counts** toward the 45 and
  the 15 — employees and admins log community records.
- **Metrics are program-only; lists are everything, labeled.** One predicate
  (`src/db/scopes.ts`) backs every scoreboard number.
- Community records don't ring the admin bell; they surface as an admin-only
  dashboard card.
- Weekly What's New gains a "From the community" section, kept out of every
  count.
- `open_to_employees` app setting is the kill switch.

## Where I'd look hardest

Ordered by how much damage a mistake does, not by how likely I think it is.

### 1. The one bug typecheck cannot catch

`src/server/use-case-queries.ts` — the program filter must test `!== undefined`,
not truthiness:

```ts
if (filters.inProgram !== undefined)
  conds.push(eq(useCases.inProgram, filters.inProgram));
```

Every surrounding line in that function uses the truthy idiom (`if
(filters.status)`). `false` means "community only" and is exactly the value a
truthy check silently drops — the Community filter would return **everything**,
including program records, with no error anywhere. `src/lib/program-scope.test.ts`
pins the `false`/`undefined` distinction at the mapper, but nothing pins the SQL
condition. Please eyeball it.

### 2. Did I miss a query that should be scoped?

The claim is that `IN_PROGRAM_ALIVE` now covers every number the program is
measured by. Worth verifying independently rather than taking my word:

```bash
rg -n "from\(useCases\)" src/ | rg -v "scopes.ts"
```

Each hit should be either scoped, or deliberately unscoped with a comment
saying why. The deliberate ones are: `listUseCases` (lists return both),
`getCommunitySubmissions` (community by definition), and the PATCH echo in
`src/app/api/v1/use-cases/[id]/route.ts` (see #4).

Also check the reverse — **over**-scoping. `getWins()` gained
`inProgram: true`. That's currently unreachable (Confirmed is admin-gated and
promotion sets the flag), so it should be a no-op; if it isn't, `/wins` just
lost rows it should have.

### 3. Program membership must not be user-settable

`UPDATE_PATCHABLE_KEYS` in `src/lib/use-case-input.ts` is derived from
`useCaseUpdateSchema.shape`. If `inProgram` ever enters the create/update Zod
schemas, **every record's editor can flip their own program membership**
through `patchUseCaseAction`. It goes through the admin-only
`setProgramMembership` instead. There's a test pinning this in
`src/lib/use-case-input.test.ts` ("is not a field anyone can submit or patch") —
confirm it actually asserts what it claims.

Related: `src/components/record/program-toggle.tsx` is a separate component
rather than a reuse of `GateToggle`, because `GateToggle` posts through
`patchUseCaseAction` (gated by `canEditUseCase`) which would hand the switch to
every record owner. Worth confirming the new action really is admin-gated
server-side, not just hidden in the UI.

### 4. The PATCH echo must stay unscoped

`src/app/api/v1/use-cases/[id]/route.ts:60` uses `listUseCases({})` as a by-id
lookup. Adding a program filter there makes `PATCH` on a community record
return a bare `{ id }` with no body. There's a comment; make sure a future
tidy-up doesn't "fix" it.

### 5. Retroactivity, in two places

- **Membership is stamped, never re-derived.** A lead leaving the roster does
  not remove their past records from the 45. Intentional — `removeLeadAction`
  is a hard delete, so a live join would rewrite history.
- **But Movement and What's New filter on the record's *current* flag**, not
  the flag it had at the time. Flipping a record out of the program erases its
  history from "Movement this week", and re-drafting an old What's New week
  after a flip produces different prose than the post people already read.
  Documented under "Rules that surprise people" — I think it's the right
  default, but it's the judgement call I'm least certain about.

### 6. The migration

`drizzle/0013_sharp_selene.sql`:

```sql
ALTER TYPE "public"."role" ADD VALUE 'employee';
ALTER TABLE "use_cases" ADD COLUMN "in_program" boolean DEFAULT true NOT NULL;
```

- `ADD VALUE` has **no inverse** in Postgres. Reverting the code is clean; the
  value stays in the type forever.
- `'employee'` is appended **last** in the `ROLES` array in `src/lib/domain.ts`,
  deliberately — array order is the enum order, and inserting mid-list can push
  drizzle-kit into recreating the type. Nothing reads `ROLES` ordinally (only
  `STATUSES` has a rank), so the conceptual ladder living in a comment rather
  than in the order is fine. Confirm that's still true.
- Both statements in one file is safe here because neither *uses* the new
  value. Precedent: `drizzle/0011_bouncy_lockjaw.sql`.

## Decisions I made that a reviewer might reasonably reverse

Each is a small change if you disagree. I've said what I'd argue, but I don't
hold any of them strongly except the first.

| Decision | Where | The case against |
|---|---|---|
| **Admins log community records** | `inProgramAtCreation`, `src/lib/domain.ts` | Tom's explicit call, reversed mid-build from an earlier "admins count" version. Don't undo without asking him. |
| Casebook **defaults to the program view** | `DEFAULT_PROGRAM_SCOPE` | A second design pass argued the casebook is the one page where community participation *is* the product, and defaulting to program reads as a trap on launch day. Mitigated by the home page's "Your use cases" being unscoped — you always see your own. |
| Employees **cannot link workflows** | `canLinkUseCases` | The only asymmetry between employee and AI Lead besides counting. Linking asserts a relationship between records you may not own. One-line widen if it bites. |
| `viewer` now means **"signed in but not a Clever employee"** | `deriveLoginRole` | Gives a previously-vestigial role a real meaning. Affects only the auth doc's table. |
| REST list stays **unfiltered by default** | `GET /api/v1/use-cases` | Silently shrinking a documented collection breaks live scripts. `?inProgram=1\|0` narrows; `community.logged` on `/progress` explains the gap. |
| Coverage by team: **program filter, no status filter** | `getTeamCoverage` | It asks "did they start", not "did they finish". Consequence: more red zeroes, and Kate will ask why. It's in the changelog. |

## What I verified, and what I didn't

Verified end to end against a **throwaway Dockerised Postgres** — never the
Neon production database.

| | |
|---|---|
| Fresh `@clever.com` sign-in | → `employee`, create button, "Your use cases" |
| Employee logs a record | `in_program=f`, Community badge, **zero** admin notifications |
| AI Lead logs a record | `in_program=t`, both admins notified |
| Admin logs a record | `in_program=f` (both Tom and Kate, via REST) |
| Casebook filter | 14 program / 3 community / 17 all |
| Admin toggle | both directions; pipeline 14↔15, card 3↔2 |
| Qualified promotion | set `in_program` automatically; the 45 went 3→4 |
| PAT stamping | follows the token owner's **real** role, not view-as |
| PATCH on a community record | full 26-key body, not a bare `{ id }` |
| Kill switch off | employee → viewer; admin and AI Lead unaffected |
| View-as Employee | banner correct; Wins/Learnings/community card hidden |

`pnpm test` 365/365 · `pnpm typecheck` clean · `pnpm build` passes ·
`pnpm eval` 14/14.

**Gaps, stated plainly:**

1. **The browser pane wedged** partway through re-verification after the
   "admins don't count" reversal. The admin-stamping check therefore went over
   the REST API rather than the UI. The UI surfaces (badge, filter, toggle,
   dashboard card, view-as) were verified *before* that reversal, against code
   I did not touch afterwards — but they were not re-driven. **If you can drive
   the UI, that's the highest-value thing to re-check.**
2. **One eval run failed before passing.** Run 1 on this branch flagged
   `numbers-supported`: the generating model wrote "This is the case's second
   milestone in a row" about a program record in Movement, and no source data
   supports a milestone count. Baseline (stashed) passed 13/13; branch runs 2
   and 3 passed 13/13 and 14/14. The flagged text has no relation to the new
   community section, so I read it as generator nondeterminism — but I have one
   baseline sample, and the one failure I saw was on this branch. Not
   dismissed, not proven. If it recurs, the fix is a line in
   `EDITORIAL_INSTRUCTIONS` forbidding ordinal comparisons the data can't
   support ("second", "third in a row", "again").
3. **`setStatus`'s promotion invariant was verified before the reversal, not
   after.** The code is unchanged since (`git log -p src/server/use-case-service.ts`
   will confirm), and `server-only` blocks calling it from a script, so I could
   not re-run it headlessly.

## Reproducing the verification

`.env.local` on Tom's machine points at the **production** Neon database.
`drizzle.config.ts` loads it via dotenv, which does *not* override already-set
env vars — so an inline `DATABASE_URL` genuinely wins. Never run `pnpm
db:migrate` bare on a machine with that `.env.local`.

```bash
docker run -d --name casespace-review \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=casespace -p 55432:5432 postgres:16

export L="postgresql://postgres:dev@127.0.0.1:55432/casespace"
DATABASE_URL="$L" pnpm db:migrate
DATABASE_URL="$L" pnpm db:seed
DATABASE_URL="$L" pnpm db:demo    # includes 2 community records
```

For the dev server, `.env.development.local` takes precedence over `.env.local`
and is gitignored:

```bash
printf 'DATABASE_URL="%s"\nAUTH_DEV_LOGIN=1\n' "$L" > .env.development.local
pnpm dev
```

Dev sign-in (local only) maps: `tom.leger@clever.com` → admin, any roster email
→ contributor, any other `clever.com` address → employee, an address in
`allowed_login_emails` → viewer.

Tear down with `docker rm -f casespace-review && rm .env.development.local`.

## Before you merge

**Merging is the point of no return**, not the deploy after it: Vercel builds
`main` with `drizzle-kit migrate && next build`, so the merge applies `0013` to
production, and the enum value cannot be dropped.

1. **Run the admin-backfill query against production and act on it.** This is
   the one open decision and it is Tom's, not a reviewer's:

   ```sql
   select count(*) from use_cases uc
   join users u on u.id = uc.created_by_id
   where u.role = 'admin' and uc.deleted_at is null;
   ```

   - **0** — nothing to decide, merge freely.
   - **non-zero** — those records currently keep counting, because `in_program`
     backfills to `true`. The new rule would exclude them. Leaving them is the
     durable stamp behaving as designed (the rule isn't retroactive). Aligning
     them is one `update`, in `docs/operations/data-and-seeds.md`, and **it
     lowers the 45 by exactly that number.** Don't run it without Tom saying so.

2. Confirm `pnpm test`, `pnpm typecheck`, `pnpm build` on your machine.
3. If you can, drive the UI once — see gap 1 above.
4. `pnpm eval` is optional; it costs money and takes ~100s. It passed 14/14 on
   the final code.

If something needs changing, push to `open-to-clever` rather than merging and
fixing forward — nothing here is urgent, and the migration is the part you
can't take back.
