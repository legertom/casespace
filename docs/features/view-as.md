---
title: View as
audience: admin
updated: 2026-08-25
code:
  - src/lib/view-as.ts
  - src/server/actions-view-as.ts
  - src/lib/current-user.ts
---

# View as

An admin can preview Casespace with reduced permissions, to see what an AI
Lead or a Viewer actually sees.

## Using it

Pick **AI Lead** or **Viewer** from the account menu. A banner stays on
screen for the whole session with an exit link — you can't forget you're in
it. Every permission check in the app uses the previewed role, not your real
one.

## The security property

It can only ever step an admin **down**. This is unit-tested, and holds three
ways:

- `admin` is not a previewable value, so there is no path back up through
  this mechanism.
- A preview requested by a non-admin is ignored — a forged cookie on a viewer
  account changes nothing.
- Anything unrecognized in the cookie is ignored rather than trusted.

The role is resolved server-side on every request (`resolveEffectiveRole`);
the banner is a consequence of that resolution, not a separate flag.

## Who can do what

Admins only. Nobody else has anything to step down from.

## Rules that surprise people

**Previewing does not change whether a record counts.** Only an AI Lead's
record is stamped in-program, so a record you log while previewing is a
community record — which is what it would have been anyway, since admins log
community records too. Tick **Counts toward the program** on the record if
you meant it to count. See
[counting rules](../concepts/counting-rules.md#program-and-community).

**Previewing as an AI Lead does not make your records count either.** The
stamp follows the previewed role, so a record logged while previewing as an
AI Lead *is* stamped in-program. If you were only looking around, untick it.

Note the new-record notification deliberately works the other way: it reads
the role from the table, so an admin previewing as an employee is still an
admin for the purpose of who hears about a new record.

## Related

- [Roles and permissions](../concepts/roles-and-permissions.md)
