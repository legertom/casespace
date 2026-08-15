---
title: View as
audience: admin
updated: 2026-08-14
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

## Related

- [Roles and permissions](../concepts/roles-and-permissions.md)
