---
title: A person's profile
surface: /people/[id]
audience: everyone
updated: 2026-09-02
code:
  - src/app/(app)/people/[id]/page.tsx
  - src/server/person-profile.ts
  - src/server/identity.ts
  - src/lib/ids.ts
  - src/components/person-link.tsx
  - src/components/hover-menu.tsx
---

# A person's profile

One page per person: who they are, and every use case that credits them.
Every name in Casespace links here — on [the roster](roster.md), in a
record's [credit card](record.md), on the dashboard, and in a
[comment mention](comments.md).

Your own is your name in the header — click it, or take **My profile**
from the menu it opens. Either way that is `/people/me`.

## What's on it

- **Their name and title**, from the directory.
- **Their roster row**, when they have one: AI Lead, which department, which
  teams, and their email. Most of Clever is not on
  [the roster](roster.md) and that section simply doesn't render.
- **Use cases crediting them** — owned or authored — each with its stage,
  and a count line: how many there are, how many count toward the 45, how
  many are confirmed.
- **A link into [the casebook](casebook.md)** filtered to them, for when you
  want the filters, the stage tabs, and search over the same set.

## Who can do what

Every authenticated user sees every profile, the same way they see every
record. Nothing here is editable — the directory comes from the HRIS
snapshot, the roster is edited on [the roster page](roster.md), and credit is
edited on each record.

## Rules that surprise people

- **Your name in the header is a link, not a button.** Hovering it opens the
  menu; clicking it goes straight to your profile, because that is the one
  thing most people came for. On a phone the first tap opens the menu instead
  — there is no hover to open it with, and **My profile** is the first item.
- **`me` is not a person id.** Directory ids are UUIDs, so `/people/me` can
  never collide with a real one. It exists because most people at Clever have
  a login and no directory row — everyone can sign in, but only AI Leads are
  linked to a person — and they'd otherwise have no profile at all. On
  `/people/me` such a person is described by their login instead.
- **Your own profile shows more than someone else's.** A profile normally
  lists what its person is *credited on*. Yours also lists what you
  *logged* — under "Logged by you, credited to someone else", and only when
  that list isn't empty. A record you filed for a colleague counts toward
  them, not you, so it can't sit in your main list; but it shouldn't vanish
  from the one page that is meant to be your place to find your work either.
  This matches [the casebook's](casebook.md) "Mine", which has always meant
  logged-or-credited.
- **A bad id is a 404, not an error page.** Person ids ride in URLs now, so a
  truncated or hand-typed one is an ordinary thing to receive. It is checked
  for uuid shape before it reaches Postgres, which would otherwise refuse the
  query outright — that way a missing person 404s and a real database failure
  still looks like one. `?person=` on the casebook drops the filter for the
  same reason.
- **A name with no directory row isn't a link.** Credit typed by hand carries
  no id, so there is nothing honest to point at, and the name renders as
  plain text.
- **The counts are counts, not a score.** There is no ranking, no target
  bar, and no dollars — see [the program](../concepts/program.md).

## Related

- [The AI Leads roster](roster.md)
- [The casebook](casebook.md)
- [People, roster, and ELT](../concepts/people-and-elt.md)
- [MCP & API](profile.md)
