/**
 * Every id in Casespace is a Postgres `uuid`, and Postgres does not compare a
 * malformed one — it raises `22P02` and the page 500s. Ids reach us from URLs
 * (`/people/<id>`, `?person=`), so "not a uuid" is an ordinary thing a person
 * can type, not an outage. Checking the shape first lets those 404 while a
 * real database failure still surfaces as one.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
