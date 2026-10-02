/**
 * Which database a script is about to touch, said out loud first — host and
 * database name, never the credentials. On a machine where `.env.local`
 * points at production, this line is the last chance to notice.
 */
export function describeTarget(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "(DATABASE_URL is not set)";
  try {
    const url = new URL(raw);
    return `${url.pathname.replace(/^\//, "") || "(default database)"} on ${url.hostname}`;
  } catch {
    return "(DATABASE_URL is not a URL)";
  }
}
