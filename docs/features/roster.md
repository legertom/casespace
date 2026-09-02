---
title: The AI Leads roster
surface: /roster
audience: everyone
updated: 2026-09-02
code:
  - src/app/(app)/roster/page.tsx
  - src/components/roster/roster-admin.tsx
  - src/db/schema.ts
  - src/lib/lead-progress.ts
  - src/server/actions-roster.ts
  - src/server/reference.ts
---

# The AI Leads

Who is contributing, by department and team. Open to everyone.

## What's on it

Every AI Lead grouped by department, each with their teams, their state, and
their records. Names link through to [that person's profile](person-profile.md),
which lists every use case crediting them.

## Unverified emails

Roster emails were confirmed against the AI Leads Google Group. Any address
that hasn't been verified by a human is **visibly flagged** — the roster
would rather show an honest "we're not sure about this one" than a
plausible-looking wrong address.

Re-seeding never clobbers an email a human verified in the app. See
[data and seeds](../operations/data-and-seeds.md).

Admins see an email as text until they click it. That opens the email field in
place, with Save and Cancel controls; everyone else can click the address to
start an email.

## Monthly 1:1s

Admins can privately mark whether each AI Lead's monthly 1:1 happened for
August through December 2026. Each checkbox saves immediately. This progress
is not fetched or shown for AI Leads and viewers.

## Who can do what

| | Viewer | AI Lead | Admin |
|---|---|---|---|
| Read the roster | ✅ | ✅ | ✅ |
| Add / remove a lead | — | — | ✅ |
| Fix a lead's email | — | — | ✅ |
| Track Aug–Dec monthly 1:1s | — | — | ✅ |
| Set a lead's state | — | — | ✅ |
| Assign teams, add a team | — | — | ✅ |

## The roster is what "AI Lead" means

Being on this list is what makes someone a `contributor`, and it is checked
by email on every sign-in. It also decides whether the records they log count
toward the 45 and the 15.

Everyone else at Clever can still log use cases — they do not need to be on
the roster and should not be added to it just to let them write. Their
records are **community** records: real, editable, in the casebook, counted
nowhere until an admin says otherwise. See
[counting rules](../concepts/counting-rules.md#program-and-community).

Membership is stamped when a record is created, so removing someone from the
roster does not retroactively remove their past records from the program.

## Related

- [A person's profile](person-profile.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
- [`GET /api/v1/roster`](../integrations/rest-api.md)
