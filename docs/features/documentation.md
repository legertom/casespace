---
title: In-app documentation
surface:
  - /docs
  - /docs/[...slug]
audience: everyone
updated: 2026-08-14
code:
  - src/app/(app)/docs/page.tsx
  - src/app/(app)/docs/[...slug]/page.tsx
  - src/server/docs.ts
---

# In-app documentation

The `docs/` folder in the repo, rendered inside Casespace. Same files, one
source of truth — a doc updated in a pull request is live the moment it
deploys.

## How it works

`src/server/docs.ts` reads the markdown off disk at request time, parses the
front matter, and hands it to `react-markdown` + `remark-gfm` (both already
dependencies, for What's New).

- `/docs` — the index, grouped by section.
- `/docs/features/comments` — one doc, by its path under `docs/`.
- Relative links between docs (`../concepts/statuses.md`) are rewritten to
  `/docs/...` routes, so the same links work on GitHub and in the app.
- `docs/plans/` is excluded — those are working documents, not reference.

## Who can do what

Everyone reads. Editing is a pull request; there is no in-app editor, on
purpose — documentation goes through review like the code it describes.

## Related

- [How to keep the docs updated](../README.md#keeping-this-updated)
