# Coach & form improvements — the intake form is a wall, and four notes about it

Status: **plan agreed, ready to build.** Re-verified against HEAD on
2026-08-12 — one prerequisite turned out to already be in the code (see the
revised ELT section). One interim fix shipped ahead of the plan on
2026-08-12, after "what does a named workflow mean?" came in from users: a
plain-language hint/tooltip pass over the form and record page (gate
explanations, ELT spelled out, worksheet/baseline/functional-leader jargon
defined). It doesn't change any plan item; Part 1's reordering still applies.
Sourced from Tom's "Coach Form Improvements" notes (4 items, verbatim in the
appendix), plus the entry-point, API-discoverability, dashboard-visibility,
and comments/notifications asks.

**Decisions, 2026-08-12 (Tom):**

- Form: **Option B** — a short first step that saves, then the record page is
  the hub. No multi-screen wizard.
- Entry point: **a chooser page** at `/use-cases/new`.
- ELT org: **removed from intake entirely.** See the prerequisite below — this
  one is not just a UI deletion.
- `/feedback`: **admin-only reading.** Anyone can submit.
- New: **API/MCP must be discoverable**, with a `/developers` page.

**Decisions, 2026-08-12, second round (Tom):**

- The **program dashboard must be visible to every user.** It already is at
  `/dashboard`; the actual gap is the nav link. One-line fix — see Part 6.
- New: **comments on use-case records** — any user (especially Kate) can
  leave feedback, ideas, and requests on a record. Threaded, **up to 6
  levels**. Kate: they should **work like Jira's** — read in Part 5 as
  @-mentions, participant notifications, formatting, and an edit trail.
- New: **in-app notifications, no email for now** — a comment on your record
  or a reply to your comment notifies you. See Part 5.
- New: the **Monday-morning What's New report already exists** (`/whats-new`,
  AI-drafted, cron'd Monday 9am ET). What's left: a "software updates"
  source. Visibility **decided and shipped 2026-08-12: open to all users**,
  drafting/editing stays admin-only. See Part 7.
- The ELT derivation this plan listed as live bug #1 **has since landed in
  code** — the remaining work is the inverse: stop the update path from
  clobbering explicit allocations once the form field is removed. See the
  revised prerequisite.

**Decisions, 2026-08-12, third round (Tom):**

- The chooser page **shipped** (`ef80395`): three cards at `/use-cases/new`,
  the manual form at `/use-cases/new/form`, the AI review screen at
  `/use-cases/new/review` (`?prefill=1` redirects there). The quiet
  developer line points at `/profile` until Part 4 ships `/developers` —
  retarget it then. The Option B step-1 split is still to come; `/form`
  carries the full form meanwhile.
- The **adoption pulse charts on Goals are admin-only** (shipped `dc7a6b7`,
  `canViewPulse`). AI Leads keep the whole casebook and every record's
  status; only the survey readings are withheld. `AGENTS.md`'s visibility
  rule names the exception.

## Summary

Seven pieces of work:

| Note | Work | Independent? |
|---|---|---|
| #3 reorder sections, #4 clarify editability, + the wizard and entry-point questions | Restructure `use-case-form.tsx` and the `/use-cases/new` route | Do together |
| #2 Approach → checkboxes | A data-model change (enum column → array) | Independent |
| #1 Coach feedback capture + `/feedback` | New feature, new table | Independent |
| New: API/MCP discoverability + `/developers` | Mostly moving and linking what `/profile` already has | Independent |
| New: comments, threaded 6 deep, + in-app notifications | Two new tables, a record-page section, a header bell | Independent |
| New: dashboard visible to every user | A one-line nav retarget | Independent |
| New: Monday 9am ET What's New report | Already built — add a release-notes source, decide visibility | Independent |

The restructure is the one with the ideas in it, so it goes first below. On the
wizard question: **don't build one.** There is already a conversational wizard
(the Coach), and a classic all-steps-then-submit wizard would contradict the
rule this system is built on — sparse is safe. Instead, a **short required
first screen that saves**, then the record page is where the rest gets filled
in over time. That happens to be exactly what notes #3 and #4 are asking for.

**Two live bugs surfaced while planning this.** Re-verified against HEAD on
2026-08-12: #1 has since been fixed in code; #2 is still live:

1. ~~The form tells users a blank ELT org will "count toward" the
   department's org, but nothing derives it.~~ **Since landed** —
   `suggestEltOrg` (`src/lib/domain.ts:224`, unit-tested) is applied at create
   (`use-case-service.ts:110`), so the form's hint copy is now true. What
   remains is an update-path interaction that removing the field would turn
   into a new bug. See "Prerequisite, revised."
2. The MCP and REST snippets on `/profile` almost certainly render
   `https://your-deployment/api/mcp` in production. See Part 4. (Still true:
   `NEXT_PUBLIC_APP_URL` appears nowhere in `.env.example` or the README.)

---

## Part 1 — Making the form approachable

### The problem, measured

`src/components/use-case-form.tsx` is one 669-line scroll: 6 sections, **35
inputs**, in a single `max-w-2xl` column. **Two of the 35 are required** —
title and description (`useCaseCreateSchema`,
`src/lib/use-case-input.ts:28`).

That ratio is the whole problem. The system's actual stance is written down in
that file's header comment:

> Sparse is safe: only title + description are required to create. […] A
> half-filled record that exists beats a perfect record that doesn't.

The form communicates the opposite. Nothing on screen tells a first-timer they
can type two fields and press the button. There is no orientation, no sense of
length, no "you can stop here." The Coach knows to say this
(`coach-prompt.ts:44` — "If they want to stop early, propose with what you
have"); the form never does.

Six specific things a first-time user hits, in the order they hit them:

1. **No orientation.** The page opens straight into "The workflow" with no
   statement of what's required, how long this takes, or that it's editable
   later. `new/page.tsx:66` describes the door ("every field explained, no AI
   required") but not the commitment.
2. **Program accounting in position 5.** "Counts toward (ELT org)"
   (`use-case-form.tsx:258`) is the fifth field a newcomer meets. It's ELT
   target allocation — a thing they should not have to think about, and it
   already auto-derives from department (`suggestedOrg`,
   `use-case-form.tsx:148`). Asking it early implies it matters early.
3. **A 7-row rating grid mid-form.** "Worksheet ratings"
   (`use-case-form.tsx:359-397`) is the largest visual block in the form, 35
   buttons, marked `(1 low – 5 high, all optional)` — but its size reads as
   importance and it lands like a test. Optional-but-huge is the worst
   combination.
4. **The gates section asks what the form already knows.** Of the four
   documented gates (`use-case-form.tsx:412-474`), three are re-statements of
   fields directly above: "Named workflow with a clear description" (they just
   typed both), "AI tool & approach identified" (they just picked it), "A named
   owner" (they just picked one). Only adoption evidence is new information.
   This is where a careful person stalls, because it looks like a second,
   stricter pass over work they just did.
5. **ROI before the thing exists.** "Success & ROI" — 11 inputs including
   baseline/post measurement — sits above "Where does it stand?", so someone
   logging a discovery-stage idea walks through a measurement apparatus for a
   workflow that hasn't been built. (This is note #3's complaint, from the
   other end.)
6. **Status last, and only sometimes.** "Where does it stand?"
   (`use-case-form.tsx:628`) is dead last *and* create-only — gated on
   `isEdit`. So it's the final question at create and then silently absent
   when you come back to edit.

### Why not a multi-screen wizard

Three reasons, in order of weight:

1. **One already exists.** `/coach?intent=wizard` walks the same intake one
   question at a time, in a defined order (`coach-prompt.ts:34-44`), and both
   AI doors converge on the same review screen (`use-case-prefill.tsx`). A
   second, non-AI, multi-screen wizard means two step-orders to keep in sync
   with the schema, forever. The README calls this out as three doors
   (`README.md:78`); a fourth door with its own flow logic is a maintenance
   tax, not a feature.
2. **A wizard implies completion is mandatory.** Steps with Next buttons teach
   "finish all of these or you have nothing." Today, however intimidating the
   scroll is, the submit button is always right there and always works with 2
   fields filled. A wizard would make abandonment total — the user quits on
   step 4 of 6 and the record never existed. That inverts "a half-filled
   record that exists beats a perfect record that doesn't."
3. **The AI door already handles people who want hand-holding.** The form's
   stated job is to be the door for people who'd rather see every field at
   once (`new/page.tsx:67`). Its problem isn't that fields are visible; it's
   that nothing tells you which ones matter.

### Chosen: save early, then return (Option B)

Three options were on the table; **B is the decision.** A and C are kept below
so the reasoning stays on the record.

**Option A — keep one page, add scaffolding.** (~half a day)
A sticky section rail down the left with anchors and "3 of 6 filled" style
counts; an opening callout stating that only title and description are
required and the record is editable forever; every optional section collapsed
by default behind a one-line summary. No routing, no state machine, no new
save semantics. Fixes orientation, does not fix ordering or the length of the
first commitment.

**Option B — a required first step that saves, then a hub. (CHOSEN)**
Split the form once, not six times:

- **Step 1, "The basics"** — title, description, team/department, authors,
  owner, and status. Six things, all of which a person who just built
  something can answer from memory. Primary button: **Save and keep going**.
  It creates the record immediately, then lands on the record page.
- **Everything else** stays exactly the one long form it is today, reached
  from the record page as "Add the details" (which is `/use-cases/[id]/edit`,
  already built) — but now the user is editing something that *exists*, which
  changes the emotional register completely. A partially-filled record with a
  visible gap list is a to-do; a partially-filled form is a failure.
- **The record page becomes the hub.** It already knows how to show what's
  missing — `computeGapFlags` (`src/lib/gap-flags.ts`) produces exactly the
  "here's what's left" list, and it's already used on the prefill review
  screen. Reuse it on the record page for records the viewer can edit.

This is one new small form plus reuse of two existing components. No wizard
state machine, no multi-step validation, no draft-storage question — step 1
saves for real, so there is no such thing as a lost draft.

**Option C — full multi-screen wizard.** Not recommended, for the three
reasons above. Noted here so the decision is on the record.

### The entry point: a chooser page, not a modal (CHOSEN)

Today `/use-cases/new` does two jobs at once — it's the door-picker *and* the
form. The picker is one line of subtext (`new/page.tsx:66-83`) sitting directly
above a Title field with focus-adjacent prominence. A first-timer's eye goes to
the empty input, not the prose, so two of the three doors are effectively
invisible at the exact moment someone is choosing. The other two doors get one
inbound link each in the whole app; `/use-cases/new` gets five.

**Decision: a chooser page at `/use-cases/new`.** Three cards — *walk me
through it* (Coach), *start from notes*, *fill it in myself* — each with one
line on who it's for. Then it routes.

Plus a quiet fourth line below the three cards, not a card: *"Working in your
editor? Log use cases over MCP or the API →"* pointing at `/developers`. It's
deliberately typographically weaker than the three doors — the 22 AI Leads
shouldn't have to price a fourth option, but the handful of engineers among
them should find it at the exact moment they're thinking about logging
something. See Part 4.

Why a page rather than a modal:

1. **This product has almost no repeat users.** Every AI Lead logs 2 workflows
   (`WORKFLOWS_PER_LEAD`, `src/lib/domain.ts:15`), across ~22 teams. Nearly
   every session at this URL *is* a first session. The usual argument for a
   modal — don't make the practiced user pay a click — is arguing about a
   population that barely exists here.
2. **All five entry points already navigate.** `layout.tsx:60`, `page.tsx:43`,
   `page.tsx:59`, `coach/page.tsx:106`, `use-cases/page.tsx:192` — every one is
   a server component rendering a `<Link>`. A page is one change at one URL and
   all five inherit it. A modal means five client wrappers holding open state.
3. **`aiConfigured()` decides what's offered, and it's server-side.** When AI
   is off, two of the three doors are dead ends today (`from-notes/page.tsx:24`
   and `coach/page.tsx:100` both degrade to "use the form instead"). A
   server-rendered chooser simply doesn't offer them, or shows them disabled
   with the reason. A modal launched from a client component needs that flag
   threaded through all five call sites.
4. **Every option leaves the modal anyway.** Two doors are full pages. A modal
   whose every choice closes it and navigates elsewhere is a speed bump, not an
   interface — modals earn their keep when the task finishes inside them.
5. **It's linkable.** Kate can send 22 leads one URL that explains the three
   ways in. That's also the natural home for the "only a title and description
   are required, come back as it evolves" orientation copy from note #4 — which
   currently has nowhere good to live, because cramming it above a form makes
   the form look longer, not shorter.
6. Back button behaves (picked the wizard, want to reconsider → back returns to
   the chooser), and three cards lay out fine on mobile where a three-option
   sheet is cramped.

**Routes.** The one wrinkle: `?prefill=1` is the shared review-before-save
screen both AI doors converge on. Cleanest split:

| URL | Now | After |
|---|---|---|
| `/use-cases/new` | form + subtext picker | the chooser |
| `/use-cases/new/form` | — | the manual form (Option B step 1) |
| `/use-cases/new/review` | `?prefill=1` | the prefill review screen |

Four call sites to update. Two are single-line `router.push`:
`notes-door.tsx:33` and `proposal-card.tsx:62`. Two more are the AI-off
fallback links that say "the form door works without AI"
(`coach/page.tsx:106`, `from-notes/page.tsx:29`) — they mean the manual form
specifically, so point them at `/use-cases/new/form`; leaving them on the
chooser would send someone who just bounced off a dead AI door back to a menu
offering that same door. Keep the direct URLs stable so anyone who wants to
skip the chooser can bookmark past it.

**Copy note:** name Granola. The notes door says "meeting notes, a doc
excerpt, a Slack thread" (`from-notes/page.tsx:20`) — accurate but generic. If
Granola is what people actually walk out of meetings with, "paste your Granola
notes" makes the door recognizable in one glance. (A real Granola integration
is a separate conversation; this is just the word.)

**The compromise option**, if a whole route feels heavy: keep one page and put
the three cards *above* the form, with the manual form collapsed behind the
third card. Avoids the click and the routing, but the page stays long and the
orientation copy still competes with a visible form. Workable, not as clean.

### Section order (note #3)

Under Option B, order follows what the user can answer, not the schema:

Step 1: **Where does it stand?** → The workflow (title, what it does) →
People (authors, owner) → Team & department.

Then the detail form: Tool & approach → Workflow discovery (steps, then
ratings) → The four gates → Success & ROI.

**"Counts toward (ELT org)" leaves intake entirely** (decided). It moves to the
record page as an admin-only control, beside where the record already displays
it (`use-cases/[id]/page.tsx:347`, currently a read-only `<dd>` showing
`eltOrgName ?? "Unallocated"`). ELT allocation is a program-accounting decision
about whose target a record counts toward; the person who built the workflow has
no reason to hold an opinion. Pattern to follow: `StatusControls` — a small
client component beside the value, gated on `canManageProgram`.

Note #3 asks specifically for status at the top, and that's right for a
reason worth naming: status is the field that tells a user *how much of the
rest of this form applies to them*. "In Discovery" should visibly relax the
ROI section; "Launched" should make it the point. Putting it first turns it
from a trailing formality into the frame for everything after it.

### Prerequisite, revised: the derivation landed — now guard the update path

An earlier draft of this plan called the missing derivation a live bug. It has
since landed, following exactly the pattern prescribed here: `suggestEltOrg`
is a pure helper in `src/lib/domain.ts:224`, unit-tested
(`domain.test.ts:138-146`), and `createUseCase` applies it at the service
layer (`use-case-service.ts:110`), so all five doors get it. The form's "Left
blank, this will count toward {org}" hint is now true, and the dashboard's
"Unallocated" bucket is no longer overstated.

But the code also answered this plan's old edge-case question — "should a
derived `eltOrgId` follow a later department change?" — and answered it
**yes**: `updateUseCase` re-derives whenever a patch contains `department`
without `eltOrgId` (`use-case-service.ts:218-219`). Today that's harmless for
the form, only because the form always sends `eltOrgId` in its payload
(`use-case-form.tsx:160`).

Remove the ELT field from the form, as decided, and that protection vanishes:
every form save then sends `department` with no `eltOrgId`, hits the line-218
re-derivation, and silently overwrites whatever an admin set through the new
record-page control. That is precisely the "silently re-bucketing a record
between two ELT owners' targets" scenario this plan calls unacceptable.

So the prerequisite is now the inverse of the original: **before removing the
field, make the update path stop clobbering.** Cleanest: delete the
re-derivation at `use-case-service.ts:218-220` — derive at create only, and
let the record page's admin control own re-allocation (this plan's original
recommendation, now aimed at existing code). The cost is that a
department-only patch over REST/MCP no longer re-buckets automatically —
acceptable; a stale value someone can see and fix beats a silent overwrite.

### Editability (note #4) — and the answer to Marley's question

**The form is editable over time.** Every field is (`useCaseUpdateSchema` is
the create schema `.partial()`, `src/lib/use-case-input.ts:79`; the whole
field list is patchable in `updateUseCase`,
`src/server/use-case-service.ts:160`). So note #4's second branch — remove
"Where does it stand" — doesn't apply. Keep it, and move it up.

One wrinkle to fix while we're here: **status is editable, but not from this
form.** It's create-only in the form and lives on the record page instead
(`StatusControls`), deliberately, so every transition gets logged
(`AGENTS.md` — "Every write to a use case's status goes through the transition
helpers so the status-change log stays complete"). That's the right design and
badly communicated: the field is question #1 at create and then vanishes at
edit with no explanation. Fix: on the edit form, render status as a read-only
line — current status plus "Status changes happen on the record page, so the
history stays complete" and a link. The edit page says a version of this today
(`edit/page.tsx:104`) but as page subtext, far from where the field used to be.

What to say, and where (copy needs Tom/Kate's voice — not invented here):

- **Top of the create form:** that only title and a description are required,
  that saving early is expected, and that this record is meant to be returned
  to as the work progresses.
- **After saving:** where to find it again — the record page, and
  `/use-cases?mine=1`.
- **Top of the edit form:** that this is the same record evolving, not a
  correction of a mistake.

### One latent bug to fix as part of this

`use-case-form.tsx:143`:

```ts
const isEdit = submitLabel !== "Log use case";
```

Create-vs-edit mode is inferred from a display string. It's the switch that
decides whether `status` is sent at all (`use-case-form.tsx:190`) and whether
the status section renders. Any copy change to the button — which Option B
does deliberately, to "Save and keep going" — silently flips the form into
edit mode: the status section disappears and new records all get the default
`in_discovery`, quietly, with no type error. Replace with an explicit
`mode: "create" | "edit"` prop before touching the label. Three call sites:
`new/page.tsx:89`, `edit/page.tsx:110`, `use-case-prefill.tsx:87`.

---

## Part 2 — Approach as checkboxes (note #2)

Right, and for a concrete reason: `APPROACHES` mixes two different axes.
`prompt` / `automation` / `agentic` describe AI at runtime; `built` describes
AI having built the tool (`src/lib/domain.ts:47-53`). A Claude Code-built tool
that also runs a prompt is both, and today the radio forces a lie. Multi-select
is the honest shape.

This is a schema change, not a UI change. `approach` is a Postgres enum column
(`approachEnum`, `src/db/schema.ts:49`, column at `:243`). Blast radius, all
of it write-path or display — **nothing aggregates or filters on approach**,
which is what makes this cheap:

| File | Change |
|---|---|
| `src/db/schema.ts:243` | `approach` → `approaches: approachEnum("approach").array()`, not null, default `{}` |
| `drizzle/` | New migration: add column, backfill `ARRAY[approach]` where not null, drop old |
| `src/lib/use-case-input.ts:39` | `z.array(z.enum(APPROACHES)).max(4)` |
| `src/lib/use-case-input.ts:103` | `applyCreateDefaults` → `?? []` |
| `src/server/use-case-service.ts:167` | Rename in the `direct` patch list; add an `approaches === null → []` guard next to the `aiTools` one at `:199` |
| `src/lib/gap-flags.ts:13` | `!input.approach` → `!input.approaches?.length` |
| `src/lib/ai/proposal.ts:36,132,185` | Array; update the `.describe()` so the model knows both can apply |
| `src/lib/ai/coach-prompt.ts:39` | Wizard question 4 becomes "which of these apply" — it currently forces an either/or |
| `src/app/(app)/use-cases/[id]/page.tsx:146` | Join labels |
| `src/app/api/coach/route.ts:108`, `src/server/api-serializers.ts:23` | Serialize the array |
| `src/components/coach/proposal-card.tsx:88` | Join in the summary line |
| `src/lib/gap-flags.test.ts:25` | Fixture |
| `src/components/use-case-form.tsx:313` | Radios → checkboxes; "Not sure yet" becomes simply nothing checked, so the option disappears |

Two compatibility calls, both cheap insurance:

- **REST/MCP input:** `POST /api/v1/use-cases` and the `log_use_case` MCP tool
  are documented in the README with live PATs against them. Accept a legacy
  singular `approach` and coerce to `[approach]` in the zod schema rather than
  hard-breaking anyone's script.
- **REST output:** `api-serializers.ts` is a public shape. Emit `approaches`
  *and* keep `approach` as the first element for a release.

**Migration cost is near zero today.** Per `dashboard-target-ambiguity.md`,
counted against prod on 2026-08-09: one use case logged, total. Worth
re-counting before the migration, but this is the cheapest moment it will ever
be.

---

## Part 3 — Coach feedback capture and `/feedback` (note #1)

### Follow the proposal pattern, not a silent write

The ground rule is absolute: "The AI never writes records directly: Coach
tools emit proposals; a human confirms" (`AGENTS.md`). Feedback is the user's
own words about the product, so it's tempting to let the Coach just file it —
don't. A `propose_feedback` tool with **no `execute`**, surfacing as a card
the user edits and sends, is the same three-line pattern as
`propose_use_case` (`src/app/api/coach/route.ts:163`, card rendered in
`coach-chat.tsx:112`, written by a server action on accept). It also solves
the real risk: the model summarizing a passing grumble into a filed complaint
with someone's name in it.

Detection is a prompt addition, not code: a short section telling the Coach
that when someone wants to leave feedback, complain, or ask for a feature, it
offers to file it and proposes with their words summarized, not editorialized.

### It must also work without AI

`aiConfigured()` gates the Coach entirely (`layout.tsx:151`, and the API
returns 503 at `route.ts:40`). If the Coach is the only door to feedback, then
"the AI is broken" becomes unreportable — the exact moment feedback matters
most. So: a plain **"Leave feedback"** link in the user menu (`layout.tsx`,
beside "Profile & API tokens") opening a small non-AI form. Same server
action, `source: "form"`.

### Data

New table, following `posts`/`coachChats` conventions:

```
feedback
  id, userId → users.id
  kind         enum: complaint | feature_request | praise | other
  body         text
  pagePath     text, nullable   -- where they were
  coachChatId  uuid, nullable → coach_chats.id
  source       enum: coach | form
  status       enum: new | acknowledged | planned | closed   -- default new
  adminNote    text, nullable
  createdAt, updatedAt
```

`status`/`adminNote` are there because a feedback page nobody responds on is
worse than no page — the triage state is what makes it a loop instead of a
suggestion box. Admin-only writes, via `canManageProgram`.

### The `/feedback` page — admin-only (decided)

**Anyone can submit; only admins can read.** Newest first: who, when, kind,
body; filter by kind and status; admins set status and add a note inline (the
`roster-admin.tsx` / `post-controls.tsx` pattern).

Three things follow from the admin-only decision, and they're easy to miss:

1. **`AGENTS.md` needs amending — and so do three comments.** `AGENTS.md`
   asserts "What's New is the only admin-gated surface; everything else is
   visible to every authenticated user." The same rule is restated in the
   header comment of `src/lib/permissions.ts`, in the `canViewWhatsNew`
   docstring ("the one gated surface"), and beside `requireAdmin()` in
   `whats-new/page.tsx`. All of these change meaning here — and change again
   if Part 7 opens What's New to everyone, which would leave `/feedback` as
   the *only* gated surface. Make the rule edits in the same change as the
   gates themselves, reconciled with Part 7's visibility decision — otherwise
   the next person to read the rules will treat a gate as a bug and remove
   it.
2. **Add `canViewFeedback(role)` to `src/lib/permissions.ts`**, beside
   `canViewWhatsNew`, and enforce it server-side in the page — not just by
   hiding the nav link. `AGENTS.md` is explicit about this ("Enforce
   server-side, not just in nav"), and it's the mistake the existing gated
   surface was careful to avoid.
3. **Tell submitters where it goes.** Since it's not public, the compose UI and
   the Coach's confirmation card should say plainly that feedback goes to the
   program admins — not into a void, and not onto a page their colleagues read.
   People calibrate candor on who's listening; leaving it ambiguous gets you
   the worst of both.

Nav: the user menu, beside "Profile & API tokens", visible to admins only —
matching how What's New is conditionally rendered in `layout.tsx:47`. The
"Leave feedback" link, by contrast, is visible to everyone.

---

## Part 4 — API and MCP discoverability, and `/developers`

### Most of the content already exists; nothing points at it

`/profile` already carries a "Filing from anywhere" section
(`profile/page.tsx:48-79`): the `claude mcp add` command, a `curl` POST
example, and the endpoint list. The README documents the same
(`README.md:96-118`). So this is not a writing job, it's a **discoverability
and correctness** job.

Today the only route to any of it is noticing that the user menu says "Profile
& API tokens." Nothing in the intake flow, the use-cases list, or the Coach
ever mentions that you can log a use case from your editor.

### The bug to fix first

Both snippets interpolate `process.env.NEXT_PUBLIC_APP_URL` with a fallback of
`"https://your-deployment"` (`profile/page.tsx:59,66`). That variable is
**not in `.env.example` and not in the README's deploy steps** — it appears in
exactly those two lines in the whole repo. Unless someone set it directly in
Vercel, production is handing users:

```
claude mcp add --transport http casespace https://your-deployment/api/mcp
```

Which fails, silently teaching the reader that the MCP path doesn't work.

Fix by deriving the origin from the request instead of an env var — these are
server components, so `await headers()` (Next 16 async, per `AGENTS.md`) gives
the real host with no configuration to forget. Add `NEXT_PUBLIC_APP_URL` to
`.env.example` as a documented override if a canonical URL is ever needed, but
don't let correctness depend on it.

### The `/developers` page

Server component, visible to every authenticated user (a viewer's token is
read-only — permissions follow the web role, `api/mcp/route.ts:2-4`, so there's
nothing to gate). Contents, in order:

1. **What this is for** — two sentences: log use cases from your editor
   mid-build; only a title and description are required. The sparse-is-safe
   promise is the actual selling point, so lead with it.
2. **Get a token** — the step people miss. Explicit: tokens are created on
   [`/profile`](/profile), shown once, SHA-256 at rest, revocable, and a token
   can do exactly what you can do in the web app, no more. Link straight to the
   PAT manager.
3. **MCP setup** — the `claude mcp add` command with the real origin, the four
   tools (`log_use_case`, `update_use_case`, `list_my_use_cases`,
   `get_progress`) and one line each. A Cursor note if the config differs.
4. **REST** — the endpoint table from `README.md:112-118`, the `curl` example,
   and the filters (`status`, `department`, `q`, `mine=1`).
5. **Worked example** — one realistic `log_use_case` call and what comes back,
   so a reader can see the shape without reading a schema.

Then delete the duplicated snippets from `/profile` and replace them with a
short pointer to `/developers`, so there's one place to keep correct. `/profile`
keeps the token manager — that's its job.

### Where it's linked from

- **User menu**, beside "Profile & API tokens" — visible to everyone.
- **`/profile`**, at the top of the token section: what these are for.
- **The chooser page**, as the quiet fourth line described in Part 1. This is
  the one that actually creates discovery, because it's the only one that
  appears at the moment someone is deciding how to log something.

Deliberately **not** in the primary nav — a technical surface permanently in
front of 22 mostly non-technical leads costs more attention than it returns.

---

## Part 5 — Comments on records: Jira-style, threaded, with in-app notifications

**Shipped 2026-08-13** (`d03e826` the data and the rules, `505ee78` the two
surfaces), built from `docs/comments-execution-plan.md`. What landed matches
what is described below, with three details worth writing down:

- The depth rule lives in one tested function, `canReplyAtDepth`
  (`src/lib/domain.ts`), which the Reply control and the server action both
  ask — the client is a courtesy, the server is the rule.
- Editing a comment does not re-open the mention picker, so an `@name` typed
  during an edit is text, not a notification. Mentions are made in the
  composer.
- Below `md:` the bell's dropdown spans the header rather than hanging off
  the bell, which would run past the left edge of a phone.

Email is still deferred, and the Coach still neither reads nor writes
comments (`AGENTS.md` says so now).

### What this is, and what it is not

Kate — and any user — needs a way to leave words on a record: feedback,
ideas, requests, questions. Today the only words an admin can attach are a
status-change note or a Qualified-gate rejection reason, both of which move
or judge the record. Comments are the general channel that doesn't. Kate's
reference point is Jira: comment on the ticket, @-mention someone, they get
notified, and everyone participating hears the conversation continue.

Keep it distinct from Part 3, because the two will otherwise blur:
`/feedback` is **private** product feedback about Casespace, readable by
admins only. Comments are **public** discussion on a record, visible to
anyone who can see the record — which is everyone. The UI language keeps
them apart: "Comments" on the record page, "Leave feedback" in the user
menu.

**Permissions decision: viewers can comment.** This is the first
viewer-permitted write in the app, and it's deliberate — commentary is not
record data, and the whole point ("any user, especially Kate") is that
people who don't build workflows still get a voice on them. Write it down
as `canComment(role)` in `src/lib/permissions.ts` (true for every role),
unit-tested like its neighbors, so the decision is visible rather than
implied. Editing: the comment's author. Deleting: its author or an admin
(moderation, via `canManageProgram`).

### The Jira-shaped parts, made precise

"Works like Jira" cashes out as four behaviors:

1. **@-mentions.** Type `@` in the composer and pick a person — the
   autocomplete pattern already exists (`people-picker.tsx`). The composer
   writes `mentionedUserIds` on the comment; storing ids beats parsing
   names back out of the body.
2. **Participants stay in the loop.** In Jira, everyone on the ticket hears
   about new comments. Here: a new comment notifies the record's people
   *and everyone who has previously commented* on the record; a reply
   additionally notifies the parent comment's author.
3. **Formatting.** Bodies are markdown, rendered with the same
   `react-markdown` + `remark-gfm` stack the What's New posts already use —
   bold, lists, links, code. No custom editor; a textarea that renders rich
   is the honest version of Jira's box.
4. **An edit trail.** `editedAt` renders as "edited" beside the timestamp.

One deviation, on purpose: Jira comments are **flat**; these **thread, up
to 6 levels** (decided). Threading is the superset — flat is just nobody
clicking Reply — so nothing is lost, but write it down so a future reader
doesn't "fix" the mismatch in either direction.

### Data

Two tables, following the `statusChanges` conventions (uuid PKs, cascade to
the use case, timestamptz):

```
use_case_comments
  id, useCaseId → use_cases.id (cascade)
  authorId          → users.id, not null
  parentId          → use_case_comments.id, nullable (cascade)  -- null = top level
  depth             int, not null, 0–5                          -- 6 levels total
  body              text, not null                              -- markdown
  mentionedUserIds  uuid[], not null, default {}
  createdAt, editedAt nullable, deletedAt nullable              -- soft delete

notifications
  id, userId → users.id (recipient, cascade)
  kind         enum: comment | reply | mention
  useCaseId  → use_cases.id (cascade)
  commentId  → use_case_comments.id (cascade)
  actorId    → users.id
  readAt       timestamptz, nullable
  createdAt
```

Threading rules live in pure code (`MAX_COMMENT_DEPTH = 6` beside the other
constants in `src/lib/domain.ts`, tested there): `depth` is set at insert to
`parent.depth + 1`; the server action rejects anything deeper; the Reply
control simply doesn't render on depth-5 comments. Soft-deleting a comment
with replies leaves a "comment removed" placeholder so the thread doesn't
orphan; a deleted leaf just disappears.

### Who gets notified (in-app only — email is explicitly deferred)

Recipients of a new comment, de-duplicated in priority order so each person
gets exactly one notification carrying the most specific kind:

1. **mention** — anyone @-mentioned in the body.
2. **reply** — the parent comment's author, when it's a reply.
3. **comment** — the record's people (owner `ownerUserId`, linked authors
   `useCaseAuthors.userId`, creator `createdById`) plus every prior
   commenter on the record — the Jira participants model.

Never notify the actor about their own comment. Fan-out happens inside the
same server action that writes the comment — recipients come from a handful
of columns and one small query, no queue, no cron. A pure helper decides the
recipient list (`commentNotifications(...)` under `src/lib/`) so the
de-dupe and priority logic is unit-tested like the rest of the domain.

### Surfaces

- **The record page** gets a "Comments" section in the main column, below
  History: server-rendered, nested by depth with indentation, author + date
  (`fmtDate`), markdown body, "edited" marker. Reply/edit/delete controls
  follow the `status-controls.tsx` pattern — a small client component,
  server actions in a new `src/server/actions-comments.ts` (the
  `actions-posts.ts` shape). Each comment gets an `id="comment-{id}"`
  anchor so notifications can deep-link.
- **The header** gets a bell beside the user menu in `layout.tsx`, rendered
  per request like everything else in that server component — an unread
  count and a dropdown (the same `<details>` pattern as the user menu)
  listing recent notifications: "Kate Schaff commented on {title}",
  "{name} replied to your comment", "{name} mentioned you". Clicking one
  marks it read and jumps to the comment anchor; "mark all read" clears the
  badge. No polling, no sockets — page-load freshness is right for ~22
  users, and the bell refreshes on every navigation.

### The Coach stays out of it

The AI neither reads nor writes comments in this pass. If it ever proposes
one, it must be a proposal card like everything else (`AGENTS.md`). Feeding
the discussion into `get_use_case` for ROI reviews is a plausible later
step, but it's a separate decision about what the model should see.

---

## Part 6 — The dashboard, visible to every user

Verified 2026-08-12: this is **already true at the route level** and broken
only in the nav. `/dashboard` (`src/app/(app)/dashboard/page.tsx`) renders
`ProgramDashboard` for any authenticated user — `requireUser()` and nothing
else; neither the component nor `dashboard-queries.ts` checks a role
anywhere. The home page even links it for non-admins with "everyone can."

The gap: the primary-nav item labeled **"Dashboard"** (`layout.tsx:38`)
points at `/`, and `/` only renders the dashboard for admins (`page.tsx:11`)
— contributors and viewers clicking "Dashboard" land on the "Welcome back"
page instead, and their only path to the real thing is a footer link. An
admin using "view as" sees exactly this.

Fix: retarget the nav item to `/dashboard`. One line; nothing is lost — the
Casespace wordmark already links to `/`. Optional follow-up, a design call
not a requirement: render the dashboard on `/` for every role, with the
contributor's "your use cases" section above it, so landing = the program
at a glance for everyone.

---

## Part 7 — What's New: it already exists; the deltas are a news source and visibility

The Monday-morning AI report asked for on 2026-08-12 is **already built**.
`/whats-new` is the weekly program note: one AI-drafted markdown post per
week (`posts` table), generated by `src/server/whats-new.ts` from exactly
the data asked for — new records, promotions, regressions, new Qualified
records, pulse readings, and the live scoreboard — on a Vercel cron
(`vercel.json`: `0 13 * * 1` → `/api/cron/whats-new`) that fires **Monday
at 9am ET**. Admins can regenerate and edit drafts. None of that needs
building. The deltas:

1. **"Software updates" is the missing content source.** The generator
   compiles program data only; it knows nothing about changes to Casespace
   itself — and with Parts 1–6 about to ship user-visible features, there
   is real product news to carry. The model can't know what shipped unless
   something records it, so: a small `release_notes` table (body +
   `createdAt`, admin-written), a one-box "note a change" input on
   `/whats-new`, a `releaseNotes` array added to `gatherWeekData`, and one
   new section in the editorial instructions — "## In Casespace itself" —
   rendered only when there are notes. No git integration; a sentence a
   human wrote beats a commit log the model paraphrased.
2. **Visibility — decided and shipped 2026-08-12.** Reading is open to
   every authenticated user; drafting/regenerating/editing stays admin-only
   (the server actions already enforced this). The editorial instructions
   now address the program at large, the nav link shows for every role, and
   `canViewWhatsNew` is gone from `permissions.ts` along with the "one
   gated surface" comments. `AGENTS.md` now reads: every page is visible to
   every authenticated user; admin gating is for writes. **Part 3 note:**
   when `/feedback` lands it becomes the *only* admin-gated read surface —
   its `AGENTS.md` amendment should say exactly that.
3. **The schedule already matches — with one DST footnote.** Vercel crons
   are fixed UTC; `0 13 * * 1` is 9am ET only during daylight time. DST
   ends November 1, 2026, after which the draft lands at 8am ET for the
   program's final two months. If strict 9am matters, switch to `0 14 * * 1`
   in November; if not, note it and move on.

Opening What's New to everyone also gives Part 5's bell a natural later use
(a "new post" notification) — noted, not in scope.

---

## Sequencing

Four standalone fixes first — all small, three are prerequisites, and every
one is worth landing on its own merits. **All four shipped 2026-08-12
(`d354f69`); the numbered parts below are what remains.**

1. **The `mode` prop fix** (Part 1) — a prerequisite for any button-label
   change, which Option B makes deliberately.
2. **The ELT update-path guard** (Part 1 prerequisite, revised) — stop
   re-deriving on department change, so removing the field can't clobber an
   admin's allocation. (The derivation itself already landed.)
3. **The `NEXT_PUBLIC_APP_URL` fix** (Part 4) — a prerequisite for a
   `/developers` page that isn't wrong on arrival.
4. **The dashboard nav retarget** (Part 6) — one line in `layout.tsx`.

Then, in any order:

5. **Part 1 restructure (Option B)** — the chooser page **shipped
   2026-08-12** (`ef80395`); still open: the step-1 "basics" split, the ELT
   field's removal, the record-page gap list, and the note #3/#4 copy in
   Tom/Kate's voice.
6. ~~**Part 2, approach → array**~~ — **shipped 2026-08-14** (`fe48313`),
   with 5 records in the table, each carrying its single approach across.
   REST still accepts a singular `approach` and the API still emits one; the
   MCP tool takes the new shape only, since its clients read the schema
   fresh each session. Same change added inline editing on the record page:
   a pencil and a Coach button per field, plus highlight-to-ask.
7. **Part 4, `/developers`** — mostly moving existing content and linking it.
8. ~~**Part 5, comments + notifications**~~ — **shipped 2026-08-13**
   (`d03e826`, `505ee78`). Two new tables, the record-page section, and the
   header bell. Email stays deferred.
9. **Part 3, feedback** — the table and the admin `/feedback` surface
   **shipped 2026-08-14** (`905e5c0`), reached from every error banner's
   "Report this". Still open: the `propose_feedback` Coach tool and the
   `AGENTS.md` amendment, coordinated with Part 7's visibility decision.
10. **Part 7, What's New deltas** — the release-notes source, the visibility
    call, and (in November) the DST cron adjustment if 9am sharp matters.

## Open questions

All the blocking ones are answered. What's left:

1. **Copy** for the editability statements, the chooser cards, and the
   feedback-goes-to-admins line. Needs Tom/Kate's voice — I can draft in the
   Coach's register (measured, plain, sentence case) for editing rather than
   leaving blanks. The comment and notification strings shipped 2026-08-13 in
   that register; they are edits in place now, not blanks.
2. ~~Does a derived `eltOrgId` follow a later department change?~~ Answered
   in code as "yes" since this was drafted — and this plan's call is to
   change that to create-only before the field leaves the form. See the
   revised prerequisite.
3. **Does anything need to backfill `eltOrgId`** on records logged before
   the derivation landed? Effectively free today given how few records
   exist, but it's a decision — and it changes what the dashboard's
   "Unallocated" bucket shows.
4. ~~Does What's New open to every authenticated user?~~ **Decided and
   shipped 2026-08-12: yes** — reading for every role, drafting and editing
   admin-only. The gated-surface ground rule was rewritten in the same
   change; Part 3's amendment will make `/feedback` the only gated read
   surface when it lands.

## Non-goals

- Not building a multi-screen wizard (Part 1, reasons above).
- Not building a Granola integration. Part 1 names Granola in the notes-door
  copy because that's the word people use; pulling notes from Granola directly
  is a separate conversation.
- Not putting `/developers` in the primary nav, and not gating it (a viewer's
  token is read-only already).
- Not changing what the four gates *mean* or how `documentedGatesComplete`
  derives — only how much re-typing the form asks for. Deriving gate
  suggestions from filled fields is worth a separate look; it changes program
  semantics and shouldn't ride along with a layout change.
- Not touching the Coach's wizard step order beyond the approach question in
  Part 2 — the conversational flow isn't what's reported as hard.
- Not adding validation. Sparse stays safe; the fix is telling people that,
  not enforcing more.
- No email or Slack notifications — **explicitly deferred**; the bell is
  in-app only and refreshes per navigation (no polling, no sockets).
- No comment reactions, no private/internal comments, and no comments over
  REST/MCP yet. Markdown bodies, yes; a rich-text editor, no.
- No git-derived release notes in What's New — the "In Casespace itself"
  section is human-written by design.

---

## Appendix — the source notes, verbatim

Tom's notes, as written. Everything above is a reading of these; where the two
disagree, these win.

> **Coach Form Improvements**
>
> **#1 — Feedback mechanism in coach chat**
> - If user says they'd like to leave feedback, make a complaint, or request a
>   feature
> - Record data in DB
> - Display feedback on new "/feedback" page
>
> **#2 — Approach section formatting**
> - Change from radio buttons to checkboxes (allow multiple selections)
>
> **#3 — Reorder form sections**
> - Move "Where does it stand" to the top of the form
>
> **#4 — Clarify form is editable over time**
> - Make it clear this is a data collection method meant to be returned to as
>   the project evolves
> - Per Marley's question: is this only for finished projects or editable over
>   time?
> - If editable: state at the start of the form and let users know where they
>   can return to edit
> - If not editable: consider removing "Where does it stand" altogether

Asked separately, and answered in "The entry point" above: should the door
picker be its own page or a modal offering the wizard, Granola notes, or the
manual form, and then route you to the right place?

Also asked, and answered in Part 4: make sure users know they can connect via
API or MCP; if they need to generate a token on their profile page, say so; and
have a developers page with full instructions.

Asked 2026-08-12, second round, and answered in Parts 5 and 6: all users must
be able to see the program dashboard; add a comment feature so any user —
especially Kate — can comment on a record with feedback, ideas, and requests;
threads up to 6 levels; no email notifications for now, but people must be
notified in-app when they have a comment or a reply. Kate's reference point:
the comments should work like Jira's — which Part 5 reads as @-mentions,
participant notifications, formatting, and an edit trail.

Asked 2026-08-12, third: a What's New page where the AI compiles the week's
new use cases, updates, and software updates, running Monday at 9am ET.
Answered in Part 7 — the page, the AI draft, and the Monday-9am-ET cron
already exist; the deltas are the software-updates source and who can read it.

## Picking this up cold

Prerequisites for whoever implements this: read `AGENTS.md` first — the ground
rules on sparse-is-safe, status transitions going through the helpers, and the
AI never writing without human confirmation are load-bearing for every
recommendation here. Related: `docs/dashboard-target-ambiguity.md` holds the
open question about what the per-lead target counts, which touches the
backfill question (open question 3).

The plan is agreed (see Decisions at the top). The four standalone items in
Sequencing and Part 7's visibility change have shipped; no open decision
blocks any remaining part.
