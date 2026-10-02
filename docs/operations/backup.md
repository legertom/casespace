---
title: Backup and restore
surface:
  - /backup
  - /api/backup
audience: admin
updated: 2026-10-02
code:
  - src/app/(app)/backup/page.tsx
  - src/app/api/backup/route.ts
  - src/lib/backup.ts
  - src/db/backup.ts
  - src/server/backup.ts
  - scripts/backup.ts
  - scripts/restore.ts
  - scripts/migrate-steps.ts
  - scripts/db-target.ts
---

# Backup and restore

One zip holding every use case and everything needed to put it back. It
exists so that losing the database is an afternoon, not the program.

## Who can do what

| | Everyone signed in | Admin |
|---|---|---|
| See the Backup page | — | ✅ |
| Download a backup | — | ✅ |
| Restore one | — | from the repository, with database access |

## Taking one

**In the app:** your name, top right → **Backup** → **Download backup
(.zip)**. The file is made from the database at that moment, as one consistent
snapshot.

**From the repository:**

```bash
pnpm db:backup                    # → backups/casespace-backup-<when>.zip
pnpm db:backup path/to/file.zip
```

It backs up whatever `DATABASE_URL` points at and says which database that is
before it starts. `backups/` is git-ignored.

Nothing takes backups on a schedule. A backup exists when someone took one —
put the file somewhere that isn't Casespace, and take another after a week
with a lot of logging in it.

## What's in the zip

| File | For |
|---|---|
| `README.txt` | What this file is and how to restore it, readable without the repository |
| `use-cases.csv` | **Reading.** Every use case on one line, names instead of ids. Opens in a spreadsheet |
| `data/<table>.json` | **Rebuilding.** One file per table, every row exactly as stored, under the database's own column names |
| `manifest.json` | When, who, the schema version, row counts, and a SHA-256 of each data file |

The tables:

- **The records** — `use_cases` (every field, soft-deleted records included),
  `use_case_authors`, `use_case_urls`, `use_case_links`, `status_changes`,
  `field_changes`, `use_case_comments`.
- **What they point at** — `people`, `users`, `user_emails`, `teams`,
  `elt_orgs`, `ai_leads`, `ai_lead_teams`. These travel with their ids, so
  every owner, author, team and commenter on a restored record still resolves.

`use-cases.csv` is derived from those and holds nothing they don't. It is the
copy for a day when the app is the thing that's gone and someone needs to know
what the 45 were.

## What isn't

Coach conversations and Discovery checkpoints (private to whoever had them —
a backup is not a way to read them), API tokens, What's New posts, feedback,
notifications, pulse readings, saved meeting groups, usage and telemetry
tables, and the settings `pnpm db:seed` re-creates. `README.txt` in every zip
lists each table and why.

This is a backup of the casebook, not of the database. For the whole database
— those tables included — use the database provider's own backups.

## Rebuilding from one

Into an **empty** database, from a checkout of this repository, with
`DATABASE_URL` pointing at it:

```bash
pnpm db:migrate:steps                 # create the tables
pnpm db:restore path/to/backup.zip    # put the rows back
pnpm db:seed                          # settings and goals a backup doesn't carry
```

Then deploy as usual. Records, history, comments and links come back exactly.
Logins and sign-in aliases come back with them, so each record stays credited
to the same accounts.

The restore checks the zip before it writes anything — every data file
present, matching its checksum, holding the rows the manifest says — and then
inserts everything in one transaction. It lands whole or not at all.

## Rules that surprise people

**A restore only fills empty tables.** If any backed-up table has a row, it
refuses and changes nothing. Merging a backup into a live database means
deciding which copy of each row wins, which is a different and far more
dangerous tool. It also makes the wrong `DATABASE_URL` harmless: production is
never empty.

**There is no restore button.** Restoring is done by someone with the
repository and the database, on purpose. A button that replaces the casebook
is not something to leave on a web page.

**`pnpm db:migrate` cannot build an empty database.** drizzle-kit applies
every pending migration in one transaction. Migration 0013 adds the `employee`
role and 0016 uses it, and Postgres won't let a transaction use an enum value
it has just added. Production never noticed, because those shipped in separate
deploys. `pnpm db:migrate:steps` applies one migration per transaction and
keeps drizzle's own records, so `pnpm db:migrate` and the deploy build carry
on from where it stops.

**The file is as sensitive as the Wins report, and more.** `status_changes`
carries every note, annual-ROI confirmation notes included, and those may hold
dollar figures. It also has every name and sign-in address. That is why the
page and the download are admin-only (`canDownloadBackup`), and why
`use-cases.csv` — the file most likely to be opened and passed along — leaves
status notes out.

**Timestamps are kept to the millisecond.** Postgres stores microseconds;
JSON dates don't. Nothing in Casespace orders by anything finer.

**A backup from older code restores into newer code, not the reverse.** A
column added since the backup takes its default. A column the backup has and
the schema doesn't is refused by name rather than dropped — check out the
commit the backup was taken on (`schema` in `manifest.json` names its newest
migration) and restore there, then migrate forward.

**Two backups of the same data are the same bytes.** Rows are written in a
fixed order, so comparing two backups shows what changed between them.

## Verified

On 2026-10-02 a backup of a development database (16 records, with comments,
links and field changes added) was restored into a database built from
nothing, and backed up again. All 14 tables matched row for row. Running
`pnpm db:seed` afterwards left every record table untouched.

## Related

- [Data and seeds](data-and-seeds.md) — migrations, and what the seed re-creates
- [Deploying](deploy.md)
- [Roles and permissions](../concepts/roles-and-permissions.md)
- [Wins](../features/wins.md) — the other place annual-ROI notes are gated
