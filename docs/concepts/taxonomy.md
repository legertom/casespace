---
title: Taxonomy — departments, approaches, ratings, links
audience: everyone
updated: 2026-08-14
code:
  - src/lib/domain.ts
  - src/db/schema.ts
---

# Taxonomy

The fixed vocabularies a record is described with. All of them live in
`src/lib/domain.ts`; adding a value means a migration on the matching
`pgEnum` too.

## Departments

Program groupings, **not** HRIS departments:

`business_operations` · `product_design` (Product / Design) · `engineering` ·
`people` · `css` · `mss` · `finance_legal` (Finance / Legal)

Department drives the suggested ELT org (`suggestEltOrg`) and the coverage
view on the dashboard.

## Approaches

How AI shows up in the workflow. A record holds **any number of these** — it
is a set, not a choice:

| Value | Label | Means |
|---|---|---|
| `prompt` | Prompt | AI does the work at runtime |
| `automation` | Automation | AI does the work at runtime |
| `agentic` | Agentic | AI does the work at runtime |
| `built` | AI-built | AI (e.g. Claude Code) *built* the tool; it doesn't run at runtime |

`built` still satisfies the "AI tool & approach identified" gate — an
AI-built tool is an AI use case. Casespace itself is AI-built *and* agentic.
None selected means nobody has said yet, not "none of the above".

## Sources

Where a record came from, recorded on creation: `form` · `wizard` · `notes` ·
`api` · `mcp`. See [logging a use case](../features/logging-a-use-case.md).

## The seven scoping-worksheet lenses

Optional ratings on a record: **Frequency** (how often it runs) · **Pain**
(how painful today) · **Data availability** · **Risk** (cost of getting it
wrong) · **Ownership clarity** · **Evaluation clarity** (is it clear how to
judge output?) · **Maintenance burden**.

## Link kinds

How one workflow relates to another. A link is stored once, on the record it
was made from, and shows on both records — the far end reads the inverse:

| Kind | Near end says | Far end says |
|---|---|---|
| `builds_on` | Builds on | Built on by |
| `duplicates` | Duplicates | Duplicated by |
| `relates_to` | Relates to | Relates to (symmetric) |

See [linked workflows](../features/linked-workflows.md).

## ROI vocabularies

- `successMet`: `yes` · `no` · `not_yet`
- `roiStatus`: `not_yet_measurable` · `in_progress` · `complete`

## Notification kinds

`comment` · `reply` · `mention` · `link` — most specific wins. See
[notifications](../features/notifications.md).

## Related

- [Gates and ROI](gates-and-roi.md)
- [People, roster, and ELT](people-and-elt.md)
