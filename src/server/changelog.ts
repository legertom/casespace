import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  entriesInWeek,
  parseChangelog,
  type ChangelogEntry,
} from "@/lib/changelog";

/**
 * docs/changelog.md, read off disk. next.config.ts traces docs/**\/*.md into
 * the deployment for the cron route as well as /docs.
 */
const CHANGELOG = path.join(process.cwd(), "docs", "changelog.md");

/**
 * What shipped in Casespace during the given week. Never throws: a missing or
 * unreadable changelog means the post covers the casebook without a "New in
 * Casespace" section, which is a worse post but still a true one.
 */
export async function changelogForWeek(
  weekStart: string,
): Promise<ChangelogEntry[]> {
  try {
    const raw = await readFile(CHANGELOG, "utf8");
    return entriesInWeek(parseChangelog(raw), weekStart);
  } catch (err) {
    console.error("changelog unreadable; the post will omit it", err);
    return [];
  }
}
