# Casespace documentation

Clever's internal casebook of AI use cases, and the live scoreboard for the
H2 2026 AI Enablement program.

New here? Read [the program](concepts/program.md), then
[logging a use case](features/logging-a-use-case.md).

These pages are also served inside the app at **`/docs`** — same files, one
source of truth.

The code lives at **https://github.com/legertom/casespace**. Everything here
describes what is in that repository; [local development](operations/local-dev.md)
covers cloning and running it.

## What shipped

**[Changelog](changelog.md)** — every improvement to Casespace itself, newest
first, with the person who asked for it. The [weekly post](features/whats-new.md)
reads it, so an entry here is how a change reaches everyone at Clever. Add one
in the same commit as the feature.

## Concepts

The rules everything else cites.

| Doc | Covers |
|---|---|
| [The program](concepts/program.md) | KR 5, the two numbers, the four gates, no dollars / no gamification |
| [Statuses](concepts/statuses.md) | The seven statuses, who can move what, the Qualified gate |
| [Counting rules](concepts/counting-rules.md) | What the 45 and the 15 actually count, program vs community, and what "in flight" is |
| [Gates and ROI evidence](concepts/gates-and-roi.md) | The four gates, the ROI checklist, why gaps warn but never block |
| [Roles and permissions](concepts/roles-and-permissions.md) | Viewer / Employee / AI Lead / admin, the three read exceptions, the four deliberate ones |
| [Taxonomy](concepts/taxonomy.md) | Departments, approaches, sources, ratings, link kinds |
| [People, roster, and ELT](concepts/people-and-elt.md) | Directory vs users vs roster vs ELT allocation |

## Features

One doc per surface.

| Doc | Surface |
|---|---|
| [Home](features/home.md) | `/` |
| [The dashboard](features/dashboard.md) | `/dashboard` |
| [Pipeline drawings](features/graphs.md) | `/graphs` |
| [The casebook](features/casebook.md) | `/use-cases` |
| [The record page](features/record.md) | `/use-cases/[id]` |
| [Logging a use case](features/logging-a-use-case.md) | `/use-cases/new`, `/use-cases/from-notes` |
| [The Coach](features/coach.md) | `/coach` |
| [Discovery Coach](features/discovery-coach.md) | `/coach?intent=discovery` |
| [Course suggestions](features/course-suggestions.md) | at the end of the wizard |
| [Coach learnings](features/coach-learnings.md) | `/learnings` (admin-only) |
| [Comments](features/comments.md) | on every record |
| [Notifications](features/notifications.md) | the header bell |
| [Linked workflows](features/linked-workflows.md) | on every record |
| [Goals and the adoption pulse](features/goals.md) | `/goals` |
| [The AI Leads roster](features/roster.md) | `/roster` |
| [A person's profile](features/person-profile.md) | `/people/[id]` |
| [What's New](features/whats-new.md) | `/whats-new` |
| [Wins](features/wins.md) | `/wins` (admin-only) |
| [MCP & API](features/profile.md) | `/profile` |
| [Feedback](features/feedback.md) | `/feedback` |
| [View as](features/view-as.md) | admin preview |
| [In-app documentation](features/documentation.md) | `/docs` |

## Integrations

| Doc | Covers |
|---|---|
| [REST API (v1)](integrations/rest-api.md) | `/api/v1/*`, bearer tokens, status codes |
| [MCP server](integrations/mcp.md) | Claude Code / Cursor, the four tools |
| [Authentication](integrations/auth.md) | Google domain gate, aliases, dev login |
| [Cron](integrations/cron.md) | The Monday What's New job |

## Operations

| Doc | Covers |
|---|---|
| [Local development](operations/local-dev.md) | Setup, commands, **what `DATABASE_URL` points at** |
| [Deploying](operations/deploy.md) | Vercel, env vars, self-migrating builds |
| [Data and seeds](operations/data-and-seeds.md) | Idempotent seeds, the clobber rule, migrations |
| [AI configuration](operations/ai-config.md) | Models, usage logging, graceful degradation |
| [Evals](operations/evals.md) | `pnpm eval`, the fixture weeks, grading the weekly post |
| [Troubleshooting](operations/troubleshooting.md) | Symptoms → causes |

## Working documents

`docs/plans/` holds in-progress planning docs — execution plans, open design
questions. They are **not** reference documentation, they are not served at
`/docs`, and they are allowed to go stale.

---

## Keeping this updated

**Ship the doc in the same commit as the feature.** That's the whole
convention. Three things make it stick:

### 1. Front matter ties a doc to code

```yaml
---
title: The dashboard
surface: /dashboard          # a route, or a list of them; omit if not a page
audience: everyone           # everyone | admin | engineering
updated: 2026-08-14
code:
  - src/components/dashboard/program-dashboard.tsx
---
```

### 2. A test fails when a surface has no doc

`src/lib/docs-manifest.test.ts` runs with `pnpm test` and checks that:

- Every route under `src/app` is claimed by some doc's `surface:`, and no two
  docs claim the same one.
- Every `surface:` names a route that exists.
- Every path under `code:` exists.
- Every doc has a title and an `updated:` date, is listed in this index, and
  links only to docs that exist.

Add a route → the test goes red → you write the doc. Delete one → the test
goes red → you delete or update the doc. It cannot tell you a doc is
*accurate*, but it will not let you forget one exists.

### 3. A fixed shape

Copy [`_template.md`](_template.md). Updating a doc then means editing a
known heading rather than rewriting prose:

**What it does** → **Who can do what** → **How to use it** → **Rules that
surprise people** → **Related**.

The "rules that surprise people" section is the one worth protecting. It's
where the deliberate decisions live — why viewers can comment, why linking
ignores ownership, why nothing computes pace. Those are the things a reader
would otherwise file a bug about.

### When you add a feature

1. Write or update the doc under the right section.
2. Add its route to `surface:` and its files to `code:`.
3. Bump `updated:`.
4. Add a row to the table above.
5. `pnpm test`.
