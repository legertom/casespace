---
title: Home
surface: /
audience: everyone
updated: 2026-08-16
code:
  - src/app/(app)/page.tsx
---

# Home

The program at a glance, and the fastest path to logging a use case. This is
where sign-in lands you.

## What's on it

- The [full program dashboard](dashboard.md), in full — the two numbers, the
  pipeline, ELT owners, coverage, movement, and what needs attention. Every
  role sees it, and it is the first thing on the page.
- **Log a use case** — the primary action, straight to
  [the three doors](logging-a-use-case.md).
- Below the dashboard, your own records if you are an AI Lead, or the most
  recently updated records if you are a viewer. Admins get the dashboard
  alone.

## Who can do what

Everyone lands on the same dashboard. **Log a use case** appears for AI Leads
and admins; viewers see the numbers without the button.

## Rules that surprise people

**Home and `/dashboard` show the same thing.** That is deliberate — the
dashboard is the program, so putting anything ahead of it on sign-in buries
the point. `/dashboard` stays as its own route because it is what people link
to and bookmark.

## Related

- [The dashboard](dashboard.md)
- [Counting rules](../concepts/counting-rules.md)
