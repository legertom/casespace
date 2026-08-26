-- Data only; no schema change.
--
-- The app opened to everyone at Clever on 2026-08-25, but a role is stamped
-- at sign-in: every employee whose last sign-in predates that day still
-- carries `viewer` on their row, and would carry it until they happened to
-- sign in again — no Log a use case button, no writes, on an app that tells
-- them it is theirs. `employeeStanding` now re-derives the rung on every
-- request, so this UPDATE is not what lets them write; it makes the stored
-- row agree with what the app has been answering, for the surfaces that read
-- users.role directly.
--
-- Promotes the bottom rung only, only for accounts that hold a clever.com
-- address, and only while the kill switch is on — the same three conditions
-- deriveLoginRole applies. It cannot promote a guest, and re-running it
-- changes nothing.
UPDATE "users" AS u
SET "role" = 'employee', "updated_at" = now()
WHERE u."role" = 'viewer'
	AND EXISTS (
		SELECT 1 FROM "user_emails" e
		WHERE e."user_id" = u."id" AND lower(e."email") LIKE '%@clever.com'
	)
	AND NOT EXISTS (
		SELECT 1 FROM "app_settings" s
		WHERE s."key" = 'open_to_employees'
			AND s."value"::text IN ('false', '"false"', '"off"', '0', '"0"')
	);
