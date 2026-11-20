-- Data only; no schema change.
--
-- Her directory entry came in from the org-chart snapshot with extra text
-- after "Chloe Hunter", and she is to be written as "Chloe Hunter" and
-- nothing else. The author and owner pickers match names exactly (folded for
-- case and accents, see foldName), so the short form never found her row:
-- typing it saved an unlinked name with no credit on her profile.
--
-- Renames the directory row, and the display name on any record that already
-- credits that row. The credits go first, while the join can still find the
-- row by its old spelling. Matches the row by its "Chloe Hunter, " prefix
-- rather than by the full string, and leaves it alone if a plain "Chloe
-- Hunter" row already exists (people.name is the seed's upsert key, so a
-- second one would collide). Re-running it changes nothing.
--
-- data/casebook-v2-org-chart.json carries the same correction. Deploy this
-- before running `pnpm db:seed` again: the seed upserts on name, so seeding
-- the new spelling first would insert a second person instead of renaming.
UPDATE "use_case_authors" AS a
SET "display_name" = 'Chloe Hunter'
FROM "people" AS p
WHERE a."person_id" = p."id"
	AND p."name" LIKE 'Chloe Hunter, %'
	AND a."display_name" <> 'Chloe Hunter';
--> statement-breakpoint
UPDATE "use_cases" AS uc
SET "owner_name" = 'Chloe Hunter'
FROM "people" AS p
WHERE uc."owner_person_id" = p."id"
	AND p."name" LIKE 'Chloe Hunter, %'
	AND uc."owner_name" IS DISTINCT FROM 'Chloe Hunter';
--> statement-breakpoint
UPDATE "people"
SET "name" = 'Chloe Hunter'
WHERE "name" LIKE 'Chloe Hunter, %'
	AND NOT EXISTS (SELECT 1 FROM "people" WHERE "name" = 'Chloe Hunter');
