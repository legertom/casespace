---
title: Coach learnings
surface: /learnings
audience: admin
updated: 2026-08-15
code:
  - src/app/(app)/learnings/page.tsx
  - src/lib/coach-learnings.ts
  - src/server/coach-learnings-queries.ts
  - src/server/coach-events.ts
  - src/server/actions-coach-events.ts
  - src/components/coach/proposal-card.tsx
---

# Coach learnings

How well [the Coach](coach.md) and the notes door actually guess, measured by
what people do with what they propose. **Admin-only** (`canViewCoachLearnings`).

The Coach proposes, a human accepts or corrects or walks away, and that
decision is the only honest read on whether any of this works. It used to
evaporate — the proposal card spoke the outcome back into the model's context
and kept nothing. This page is what it looks like kept.

## The four beats of a proposal

Every proposal writes rows to `coach_events`, correlated by a `proposal_ref`
(the tool call id from the wizard, a fresh uuid from the notes door):

| Kind | Written when |
|---|---|
| `proposed` | The card renders, or the notes parser returns a draft |
| `accepted` | **Log it** — saved exactly as proposed |
| `edited_then_saved` | Taken to the review form, changed, and saved |
| `dismissed` | **Dismiss**, with the optional one-line reason |

A `proposed` row with none of the other three is the fifth outcome — someone
left the card sitting there. It is counted by its absence, never written.

## What's on the page

**The four numbers.** Proposals put on screen, how many reached a record, how
many saved with nothing changed, and how many nobody ever decided.

**What the Coach gets wrong.** Field by field, from the diff between what was
proposed and what actually saved. Three kinds of change, and the distinction is
the point:

- **Overruled** — it guessed, the human disagreed. The expensive kind, and the
  one worth changing the prompt over.
- **Left blank** — it declined to guess and the record ended up with a value.
  Cheap. A Coach that doesn't invent an owner is working as designed.
- Sparse defaults (`gate_* = false`, `roi_status = not_yet_measurable`) count
  as left-blank, not overruled. They are the emptiest honest value, not a claim.

**Where the wizard loses people.** Intake conversations that got past a first
exchange and never reached a proposal, bucketed by which of the eight intake
steps the Coach was asking about when they stopped.

**Why people dismissed.** The reasons, in their words, attributed. The most
useful thing on the page.

## Rules that surprise people

**The diff compares team *names*, not team ids.** A proposal carries a team
name and `proposalToCreateInput` sets `teamId: null` for the picker to resolve,
so diffing ids would score the picker rather than the Coach. Both sides are
resolved to names first.

**The dismissal is recorded on the click, before the reason.** A dismissal that
only counted once someone explained it would undercount the impatient, who are
exactly the people worth hearing from. The reason patches the row afterwards,
or never arrives.

**Nothing here can fail a save.** Every recording function swallows its own
errors and returns void. A learning that fails to write costs a learning.

**`coach_events.chat_id` has no foreign key.** The proposal card renders while
the response is still streaming, which is before `/api/coach` writes the chat
row on stream end. A constraint would lose the first event of every
conversation to a race.

**A chat's `intent` is never rewritten.** It records what the person came to
do, not what the conversation drifted into, so the `onConflictDoUpdate` on
`coach_chats` deliberately omits it.

## Why it's gated

The third read exception in the app, and the only one gated for a reason other
than dollars — see [roles and permissions](../concepts/roles-and-permissions.md).

Everything here is derived from someone's own intake session, and being
measured is a different thing from being helped. An open page would make people
wonder whether the Coach is a form or an audit.

The data is aggregate by construction, which limits the damage independently of
who can see it: diffs hold *fields*, never conversations, and the drop-off step
is inferred from the Coach's own questions rather than from anything a person
typed. Dismiss reasons are the single exception — they are free text, and they
are attributed, so the box that collects them says so out loud.

## The Coach reads its own scorecard

Admins get a `get_coach_learnings` tool on the Coach, gated at the tool table
rather than inside `execute` — a tool it can't see is a tool it can't be talked
into calling. Ask it how intake is going and it answers from this data instead
of from vibes. It's told to be plainly self-critical, and to say when a sample
is too small to mean anything.

## Related

- [The Coach](coach.md)
- [Logging a use case](logging-a-use-case.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
