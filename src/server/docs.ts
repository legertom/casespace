import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseFrontMatter,
  rewriteDocLinks,
  type DocFrontMatter,
} from "@/lib/docs-manifest";

/**
 * The docs/ folder, served at /docs. Same markdown the repo reviews, so a
 * doc updated in a pull request is live the moment it deploys.
 *
 * next.config.ts traces docs/**\/*.md into the deployment for these routes.
 */
const DOCS_DIR = path.join(process.cwd(), "docs");

/** Working documents, not reference docs. */
const EXCLUDED_DIRS = new Set(["plans"]);

export interface DocPage {
  slug: string;
  frontMatter: DocFrontMatter;
  /** Markdown with inter-doc links rewritten to /docs routes. */
  body: string;
}

async function markdownFiles(): Promise<string[]> {
  const entries = await readdir(DOCS_DIR, {
    withFileTypes: true,
    recursive: true,
  });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) =>
      path
        .relative(DOCS_DIR, path.join(e.parentPath, e.name))
        .split(path.sep)
        .join("/"),
    )
    .filter(
      (rel) =>
        rel !== "README.md" &&
        rel !== "_template.md" &&
        !EXCLUDED_DIRS.has(rel.split("/")[0]),
    );
}

/** How many reference docs there are — the one number the index states. */
export async function countDocs(): Promise<number> {
  return (await markdownFiles()).length;
}

/**
 * One doc by slug, or null. The slug is checked against the real file list
 * rather than sanitized, so no traversal reaches readFile.
 */
export async function getDoc(slug: string): Promise<DocPage | null> {
  const rel = `${slug}.md`;
  const files = await markdownFiles();
  if (!files.includes(rel)) return null;

  const raw = await readFile(path.join(DOCS_DIR, rel), "utf8");
  const { frontMatter, body } = parseFrontMatter(raw);
  return { slug, frontMatter, body: rewriteDocLinks(body, rel) };
}

/** The index page is docs/README.md — written once, read in both places. */
export async function getDocsIndex(): Promise<string> {
  const raw = await readFile(path.join(DOCS_DIR, "README.md"), "utf8");
  return rewriteDocLinks(parseFrontMatter(raw).body, "README.md");
}
