# Execution plan: two security fixes + the status-list consolidation

**Audience: Fable, executing this end to end.** Self-contained — you should
not need the originating conversation. Written 2026-08-15 after a full-codebase
security review; both findings were confirmed by independent adversarial
verification at 9/10 confidence. Neither bug is in recently-added code; both
predate the current work.

Work the parts **in order**. Part 1 is a privilege-escalation fix and ships
first, on its own commit. Part 2 is an information-disclosure fix. Part 3 is
the DRY cleanup the review flagged as tightly coupled to Part 1 — do it only
after Part 1's test is green, and keep it a separate commit.

Follow the repo's rules the whole way (AGENTS.md): TypeScript strict, pure
logic in `src/lib` with Vitest, every write through the transition helpers,
a changelog entry in the same commit as any behavior change, docs shipped
with the feature. Run `pnpm typecheck && pnpm test` before every commit.

---

## Part 1 — HIGH: non-admins can mint "Confirmed Positive ROI" records

### The bug

`settableStatus` in `src/lib/use-case-input.ts:15-17` is
`z.enum(STATUSES.filter((s) => s !== "qualified"))`. It removes only
`qualified`, so `confirmed_positive_roi` is an **accepted create status**.
`createUseCase` (`src/server/use-case-service.ts`) writes `input.status`
straight to the row after only a `canCreateUseCase` check — the admin gate
(`canSetStatus`) lives solely in the *transition* path (`setStatus`), which
create never touches. The `as` cast in `applyCreateDefaults`
(`use-case-input.ts`, the `status: (input.status ?? "in_discovery") as
"in_discovery" | ... | "launched"` line) is compile-time only; it silenced
the very type error that would have caught this, and its own 5-member union
proves both `qualified` and `confirmed_positive_roi` were meant to be
excluded.

**Exploit:** any user can mint a PAT (`createPatAction` has no role gate),
then `POST /api/v1/use-cases` with
`{"title":"x","description":"y","status":"confirmed_positive_roi"}`. Same
hole through `createUseCaseAction`. The record counts toward the program's
headline "15 with positive ROI" immediately (`countsTowardRoi` checks
`status === "confirmed_positive_roi"` alone; the dashboard and wins queries
select by status, not `roiConfirmedAt`), with no admin approval and no
mandatory ROI note. The MCP door is **not** affected — `proposalSchema` in
`src/lib/ai/proposal.ts` hard-codes the five pre-Qualified statuses, which
independently confirms the intended invariant.

### The fix

1. **Add the canonical list to `src/lib/domain.ts`**, beside `STATUSES` and
   its label maps (the file already owns every other status constant):

   ```ts
   /**
    * Statuses a non-admin write may set directly. Qualified and Confirmed
    * Positive ROI are reachable only through the admin transition gate
    * (canSetStatus) — both record Kate's decisions and neither may be minted
    * on create. Deriving from STATUSES keeps this in step with the pipeline.
    */
   export const SETTABLE_STATUSES = STATUSES.filter(
     (s) => s !== "qualified" && s !== "confirmed_positive_roi",
   );
   ```

2. **`src/lib/use-case-input.ts`:** replace the local filter with the import.
   `settableStatus` becomes `z.enum(SETTABLE_STATUSES as [string, ...string[]])`.

3. **Drop the masking cast** in `applyCreateDefaults`. Type the `status`
   field precisely so TypeScript enforces the invariant instead of hiding it
   — derive the type from `SETTABLE_STATUSES` (e.g.
   `(typeof SETTABLE_STATUSES)[number]`) rather than re-listing the five
   literals. If a residual cast is unavoidable at the Drizzle insert
   boundary, keep it as narrow as possible and comment why.

4. **The `proposal.ts` status enum** (the five pre-Qualified statuses) should
   also derive from `SETTABLE_STATUSES` so the third copy can't drift either.
   Verify the MCP/wizard behavior is unchanged (it already excludes both
   gated statuses, so this is a no-op refactor that removes a hand-copy).

### The test (this is the regression guard — write it)

In `src/lib/use-case-input.test.ts`, assert `useCaseCreateSchema` **rejects**
both gated statuses and still **accepts** a pre-Qualified one:

```ts
it("refuses to create at an admin-gated status", () => {
  for (const status of ["qualified", "confirmed_positive_roi"]) {
    expect(() =>
      useCaseCreateSchema.parse({ title: "t", description: "d", status }),
    ).toThrow();
  }
  expect(
    useCaseCreateSchema.parse({ title: "t", description: "d", status: "launched" })
      .status,
  ).toBe("launched");
});
```

(There is already a "never allows creating directly at Qualified" test —
extend or sit beside it.)

### Existing forged rows — flag for Tom, do not run against prod yourself

Any record created through this hole is fingerprinted exactly by:

```sql
SELECT id, title, created_by_id, created_at
FROM use_cases
WHERE status = 'confirmed_positive_roi' AND roi_confirmed_at IS NULL;
```

A legitimately-confirmed record always has `roi_confirmed_at` set (only
`setStatus` reaches that status, and it stamps the column). You work locally
and cannot see production data — **do not attempt to query or mutate prod.**
Put this query and a one-line explanation in your final report so Tom can run
it via the Vercel/Supabase connector and decide what to do with any hits
(demote to `launched`, or confirm properly). Do not write a migration that
mass-mutates rows — the remedy is a human judgment call per record.

### Changelog

An internal-security fix still gets an entry, written for the newsletter
reader without alarming them — e.g. "Confirmed Positive ROI is set by an
admin, and only by an admin" describing that the stage is now unreachable
except through the proper gate. No `Requested by:` line.

---

## Part 2 — MEDIUM: admin-only ROI dollar notes leak on open surfaces

### The bug

`/wins` is admin-gated (`canViewWins`, `src/lib/permissions.ts`) with the
written rationale that annual-ROI confirmation notes "may contain dollar
figures, and dollars never appear on an open surface" (AGENTS.md repeats it).
That note is the `statusChanges.note` of the `confirmed_positive_roi`
transition — `setStatus` requires it, `getWins` reads it back as
`annualRoiNote`. But nothing filters it between the DB and three open
emission points:

1. **Record page History** — `src/components/record/record-history.tsx`
   renders every `h.note`; the page (`src/app/(app)/use-cases/[id]/page.tsx`)
   gates only on `requireUser`, so viewers see it.
2. **REST API** — `src/app/api/v1/use-cases/[id]/route.ts:24-30` maps
   `history[].note` into the response for any PAT holder, regardless of role.
   (Note the irony: `toApiUseCase` in `api-serializers.ts` deliberately omits
   history "never dollars," and the route re-adds it one line below.)
3. **Coach tool** — `src/app/api/coach/route.ts` `get_use_case` returns
   `recentHistory[].note` to every authenticated user (it is in every role's
   tool table, unlike the admin-gated `get_coach_learnings`).

### The fix — one shared redactor, applied at all three points

Add to `src/lib/permissions.ts` (pure, unit-tested beside its neighbors):

```ts
import type { UcStatus } from "./domain";

/**
 * The annual-ROI confirmation note (on the confirmed_positive_roi
 * transition) may carry dollar figures, which stay off open surfaces — see
 * canViewWins. Every history-emitting surface runs each entry's note through
 * this before showing it, so the /wins gate can't be walked around via a
 * record's History, the REST API, or the Coach. Other transition notes
 * (e.g. Qualified-gate rejections) are unaffected. Admins see everything.
 */
export function visibleHistoryNote(
  entry: { toStatus: UcStatus; note: string | null },
  role: Role,
): string | null {
  if (entry.toStatus === "confirmed_positive_roi" && !canViewWins(role)) {
    return null;
  }
  return entry.note;
}
```

Write `permissions.test.ts` cases: admin sees the confirmed-ROI note; viewer
and contributor get `null` for it; everyone still sees a `launched`/rejection
note.

Apply at each emission point, using the role each already has in hand:

- **Record page:** map `uc.history` before passing to `RecordHistory`, using
  `user.role`. (Cleanest: redact in the page/query layer so the client
  component never receives the text — server-emitted HTML is the exposure, so
  filtering in the component is acceptable too, but filtering before render
  is preferable.)
- **REST route:** the GET handler has `user` from `authenticatePat` — map
  `note: visibleHistoryNote(h, user.role)`.
- **Coach route:** the `recentHistory` map has the closed-over `user.role` —
  same call.

Admins (`canViewWins` true) see notes unchanged everywhere; nothing else in
history rendering changes.

### Changelog

One entry — e.g. "ROI dollar notes stay on the Wins page" — noting that the
annual-ROI note is now shown only where the dollars rule already allows it.

---

## Part 3 — the DRY cleanup coupled to Part 1 (separate commit, after Part 1 is green)

The review found the settable-status list hand-copied in three places that
had **already drifted** — Part 1 already collapses that into
`SETTABLE_STATUSES`. Two neighbouring, low-risk consolidations are worth
folding in while you're here. Do **not** expand scope beyond these; the rest
of the survey's suggestions are deliberately deferred.

1. **Export and adopt `failure()`.** `failure()` in `src/server/actions.ts`
   (the rich error shaper feeding `ErrorNote`'s "quote this reference" flow)
   is private, so `actions-ai.ts`, `actions-feedback.ts`, and
   `actions-posts.ts` hand-roll thinner copies that drop `detail`/`ref` — the
   report affordance silently never fires on those paths. Export `failure`
   and replace those bespoke catches with it. Verify each caller still
   returns the same `ActionResult` shape and that no redirect-on-success path
   is swallowed (`createUseCaseAction` redirects; don't wrap the redirect).

2. **Share the admin gate.** `requireAdminActor()` is a local helper in
   `src/server/actions-roster.ts`; `actions-posts.ts` and `actions-goals.ts`
   inline `if (user.role !== "admin") return { error: ... }` in three
   different phrasings. Lift one `requireAdminActor` (returning the
   `ActionResult` error shape, distinct from the page-level `requireAdmin`
   that calls `notFound`) to a shared spot — beside `requireUser` in
   `src/lib/current-user.ts` or a small `src/server/guards.ts` — and adopt it
   at those sites. Keep behavior identical.

Both are pure refactors: `pnpm test` must stay green with no test changes
beyond the ones Part 1/2 add.

---

## Hard constraints (read before writing code)

1. **`SETTABLE_STATUSES` is the single source.** After this work, no file may
   re-list which statuses a non-admin can set — `use-case-input.ts` and
   `proposal.ts` both derive from the `domain.ts` constant. A grep for
   `!== "qualified"` should return nothing outside `domain.ts`.
2. **The admin transition gate is unchanged.** `canSetStatus` and `setStatus`
   already enforce the invariant correctly for *transitions*; this work only
   closes the *create* bypass. Do not loosen or duplicate the transition
   rules.
3. **The redactor keys on `toStatus === "confirmed_positive_roi"`**, the same
   predicate `getWins` uses — not on note contents. Don't try to detect
   dollar signs; the policy protects the note categorically.
4. **Admins lose nothing.** Every change must leave admin-visible data
   identical. The redactor returns the note unchanged when `canViewWins` is
   true.
5. **No prod data access.** You work locally. The forged-row audit is Tom's
   to run; you only supply the query.
6. **Every behavior change ships its changelog entry and keeps docs true.**
   `docs/features/whats-new.md` is unaffected; check whether
   `docs/concepts/statuses.md` or `docs/integrations/rest-api.md` describe
   create-status behavior and update them if so (the docs manifest test will
   not catch prose drift — read them).

## Order of work / commits

1. **Commit A (Part 1):** `SETTABLE_STATUSES` in domain, the two schema
   fixes, `proposal.ts` derivation, the rejecting test, changelog. This is
   the security fix — it stands alone and ships first.
2. **Commit B (Part 2):** the `visibleHistoryNote` redactor + tests, applied
   at the three emission points, changelog.
3. **Commit C (Part 3):** `failure()` export + adoption, shared admin gate.

Run `pnpm typecheck && pnpm test` before each. Report at the end: what
changed, the forged-row audit query for Tom, and confirmation that a grep for
the old `!== "qualified"` filter outside `domain.ts` is clean.

## Open question for Tom (surface, don't decide)

The REST API returns per-record `history[].note` to any PAT holder. Part 2
redacts the dollar-bearing note, but should the REST API expose status-change
notes at all to non-admin tokens? Redaction is the minimal fix and is what
this plan does; a stricter stance (no history notes over the API below admin)
is a product call, not a security necessity once the redactor is in. Flag it;
don't implement the stricter version without Tom's word.
