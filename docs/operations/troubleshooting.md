---
title: Troubleshooting
audience: engineering
updated: 2026-08-14
---

# Troubleshooting

## "AI features aren't set up yet"

No gateway credentials. Set `AI_GATEWAY_API_KEY`, or enable AI Gateway on the
Vercel project (locally, `vercel env pull` supplies an OIDC token). Everything
except the Coach, notes parsing, and the weekly post works without it — see
[AI configuration](ai-config.md).

## The weekly post didn't appear on Monday

Check, in order:

1. `CRON_SECRET` is set — without it the route rejects every caller,
   including Vercel.
2. The cron shows in the Vercel dashboard (it comes from `vercel.json`).
3. AI is configured — otherwise the job returns 503 and writes nothing at
   all, leaving that week with no post.

An admin can regenerate from the What's New page rather than waiting for next
Monday. Note that a regenerate **overwrites** that week's post if one already
exists, and discards any edits made to it. See
[cron](../integrations/cron.md).

## Sign-in bounces me

Casespace is domain-gated to `clever.com`. If a `clever.com` address still
fails, check the Google OAuth redirect URI matches
`https://<your-domain>/api/auth/callback/google` exactly, and that
`AUTH_SECRET` is set. See [authentication](../integrations/auth.md).

## I signed in with a different alias and lost my records

Aliases map to one identity through `user_emails`. If a second address made a
second account, the alias is missing from the mapping — an admin can add it.
See [people, roster, and ELT](../concepts/people-and-elt.md).

## My token gets 401

Tokens are shown once and stored hashed. If you didn't copy it, revoke it and
make a new one on [your profile](../features/profile.md). A revoked token 401s
immediately; the format is `csp_` + 48 hex characters.

## My token gets 403

Permissions follow your **web role**. A viewer's token can read and cannot
create. See [roles and permissions](../concepts/roles-and-permissions.md).

## The dashboard number doesn't match what I count

Probably one of the three counting rules:

- The 45 counts **Qualified or better** — four gates ticked is not enough.
- The 15 counts **only** Confirmed Positive ROI, never derived from the ROI
  fields.
- **In flight is never folded into either number.**

See [counting rules](../concepts/counting-rules.md).

## A record won't move to Confirmed Positive ROI

It has to be at Qualified first, and only an admin can make the move. See
[statuses](../concepts/statuses.md).

## Per-org targets don't sum to 15

That's the warning doing its job. It never blocks — fix the allocation in the
ELT org data when you're ready. See
[people, roster, and ELT](../concepts/people-and-elt.md).

## I re-seeded and expected emails to reset

They don't. Emails a human verified in the app are never clobbered by
re-seeding. See [data and seeds](data-and-seeds.md#the-clobber-rule).

## I ran a migration locally and production changed

Expected, on the primary dev machine: `.env.local` shares `prod.env`'s
`DATABASE_URL`. Migrate and deploy together, or point local at a local
database. See [local development](local-dev.md).

## The docs coverage test is failing

You added or renamed a route and no doc claims it. Add the route to a doc's
`surface:` front matter, or write the doc. See
[keeping this updated](../README.md#keeping-this-updated).
