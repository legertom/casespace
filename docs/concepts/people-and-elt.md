---
title: People, roster, and ELT allocation
audience: everyone
updated: 2026-08-14
code:
  - src/db/schema.ts
  - src/server/reference.ts
  - src/lib/domain.ts
---

# People, roster, and ELT allocation

Four different things that all look like "people", kept separate on purpose.

## `people` — the directory

A 299-person company snapshot, seeded from
`data/casebook-v2-org-chart.json`. It is **not live HR data**; it is
admin-editable and drifts. It exists so that author and owner pickers, roster
links, and ELT rollups resolve to the same names.

A person in the directory may or may not have logged in — a `people` row is
not a `users` row.

## `users` — who has signed in

Created on first Google sign-in. Carries the role. One human can have several
addresses (`user_emails`), so aliases resolve to one identity rather than
two accounts — see [authentication](../integrations/auth.md).

Records credit people by directory reference where possible, but an owner or
author who has never signed in stays **unlinked**: shown by name, not
clickable, and never notified. This is why notification code drops nulls
rather than assuming everyone has an account.

## `ai_leads` — the roster

The 25 AI Leads, each mapped to one or more `teams`. Emails were confirmed
against the AI Leads Google Group; any address a human hasn't verified is
**flagged on the roster page**. Re-seeding never clobbers an email a human
verified in the app.

Roster editing (adding leads, setting state, assigning teams, adding teams)
is admin-only. See [the roster page](../features/roster.md).

## `elt_orgs` — allocating the 15

The 15 confirmed-ROI records are allocated across ELT owners. This is
**data, not a constant**: admins edit the orgs, their target numbers, and
which departments map to them.

- `suggestEltOrg(department, orgs)` picks the org a record counts toward from
  its department.
- `targetSumWarning(orgs)` warns when per-org targets stop summing to 15. It
  **warns and never blocks** — an allocation mid-edit is allowed to be
  temporarily wrong.
- Departments with no confirmed owner — **CSS, Business Operations, Business
  Analytics** — stay honestly **unallocated** on the dashboard rather than
  being quietly assigned.

Kate's 3 is currently modeled as a program-wide bucket, with the note stored
on the org row. Whether it should instead be her own sponsored use cases is
[an open question](program.md#open-questions).

## Related

- [The roster page](../features/roster.md)
- [The dashboard](../features/dashboard.md)
- [Data and seeds](../operations/data-and-seeds.md)
