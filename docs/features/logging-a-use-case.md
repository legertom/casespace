---
title: Logging a use case — the three doors
surface:
  - /use-cases/new
  - /use-cases/new/form
  - /use-cases/new/review
  - /use-cases/from-notes
audience: everyone
updated: 2026-08-25
code:
  - src/app/(app)/use-cases/new/page.tsx
  - src/app/(app)/use-cases/new/form/page.tsx
  - src/app/(app)/use-cases/new/review/page.tsx
  - src/app/(app)/use-cases/from-notes/page.tsx
  - src/components/coach/notes-door.tsx
  - src/components/use-case-prefill.tsx
  - src/components/use-case-form.tsx
  - src/components/use-case-url-rows.tsx
  - src/lib/ai/coach-prompt.ts
---

# Logging a use case

Every use case is **one record**, reachable three ways. `/use-cases/new` is a
chooser — three clear doors, not a form with subtext.

## The three doors

### 1. Walk me through it

The Coach's guided wizard (`/coach?intent=wizard`). A conversation that asks
what it needs and builds a proposal. Good when you're not sure what the
program wants.

The wizard asks for **what the form asks for**, one question at a time: the
workflow and its steps, team and people, which tools and which approaches,
where to find it, build effort, the seven ratings, the success criterion and
whether it's met, ROI and the net impact, adoption evidence, and where the
record stands today. Anything you don't know is skipped rather than guessed.
The proposal card then **shows what it captured** before you click Log it —
so a field it got wrong is one you can see and correct rather than discover
later.

It finishes on **the four documented gates**: it reads back which ones it
believes the record meets and what each is based on, and asks you to confirm
before ticking. It sets only what you confirm — never a gate you didn't
answer, and never one on its own judgement. The card lists all four either
way. This is deliberate: the gates decide what counts toward the 45, and an
admin reading a record months later cannot tell a confirmed tick from a
guessed one, so a missing tick is far cheaper than a wrong one.

### 2. Start from notes

`/use-cases/from-notes`. Paste anything — a Slack thread, a doc, meeting
notes. The parser (Haiku) pre-fills **only what it can defend** and flags the
gaps rather than guessing. Good when the thinking already happened somewhere
else.

### 3. Just the form

`/use-cases/new/form`. No AI involved. Good when you already know the answers.

## They all converge

All three land on the same **review-before-save** screen
(`/use-cases/new/review`). Nothing is written until a person clicks save.

The record's `source` is stamped with the door it came through — `wizard`,
`notes`, or `form` (and `api` / `mcp` for records filed from outside the web
app).

## Sparse is safe

**Title and description are enough.** Everything else defaults to the
emptiest honest value and can be filled in later, on the record page. A
half-filled record that exists beats a perfect record that doesn't.

That includes the Success & ROI section's intake question, *"Roughly how
many hours went into building this?"* — a rough estimate is fine, it's
optional, and it [never gates anything](../concepts/gates-and-roi.md#build-hours).
It can also be added later, inline on the record's ROI panel.

The same goes for **Where to find it** — links to the live tool, the repo, or
a Claude artifact/project/skill. Add as many as the workflow has, or none;
they can be added on the record page whenever the thing actually exists.
Links must start with `http://` or `https://`.

The [gap flags](../concepts/gates-and-roi.md#gap-flags-on-drafts) tell you
what's missing. They are prompts, not validation — nothing blocks a save.

## The AI never writes

The Coach and the notes parser emit **proposals**. Their tools have no
execute path; the only writes are the buttons a person clicks. This is a
structural property, not a policy — see [the Coach](coach.md).

## Who can do what

AI Leads and admins. Viewers cannot create records (`canCreateUseCase`).

## Who can log one

**Anyone with a `clever.com` address.** You do not need to be an AI Lead.

If the record's **owner** is not on the [AI Leads roster](roster.md) — and,
when you name no owner, you aren't either — what you log is a **community**
record. It is a full record — same worksheet, same ROI section, same
casebook — and it is yours to edit and to move through the first five
statuses. It just does not count toward the program's 45 and 15, and it
carries a "Community" badge saying so.

If you think it should count, ask your team's AI Lead or an admin. An admin
can add it to the program on the record itself. **Do not log it again** — a
second copy does not make it count, it just makes two records.

## Related

- [The Coach](coach.md)
- [The record page](record.md)
- [MCP](../integrations/mcp.md) and [REST](../integrations/rest-api.md) — the other two doors
