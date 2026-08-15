/**
 * The docs/ folder as data — pure functions, no I/O.
 *
 * Two consumers: the coverage test (which walks the filesystem and hands the
 * results in here) and the /docs route (which renders what these parse).
 * Keeping the parsing pure is what lets "every surface has a doc" be a unit
 * test rather than a habit.
 */

export type DocAudience = "everyone" | "admin" | "engineering";

export interface DocFrontMatter {
  title: string;
  /** Routes this doc documents. Empty for docs that aren't a page. */
  surface: string[];
  audience: DocAudience;
  /** YYYY-MM-DD, by hand. */
  updated: string;
  /** Repo-relative source paths this doc describes. */
  code: string[];
}

export interface ParsedDoc {
  frontMatter: DocFrontMatter;
  body: string;
}

const DEFAULT_FRONT_MATTER: DocFrontMatter = {
  title: "",
  surface: [],
  audience: "everyone",
  updated: "",
  code: [],
};

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Enough YAML for our front matter and no more: `key: value`, and `key:`
 * followed by indented `- item` lines. A real YAML parser would be a
 * dependency to express five keys.
 */
export function parseFrontMatter(raw: string): ParsedDoc {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!match) {
    return { frontMatter: { ...DEFAULT_FRONT_MATTER }, body: raw };
  }

  const fields: Record<string, string | string[]> = {};
  let listKey: string | null = null;

  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      (fields[listKey] as string[]).push(stripQuotes(item[1]));
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, value] = pair;
    if (value.trim() === "") {
      listKey = key;
      fields[key] = [];
    } else {
      listKey = null;
      fields[key] = stripQuotes(value);
    }
  }

  const asList = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  return {
    frontMatter: {
      title: typeof fields.title === "string" ? fields.title : "",
      surface: asList(fields.surface),
      audience:
        fields.audience === "admin" || fields.audience === "engineering"
          ? fields.audience
          : "everyone",
      updated: typeof fields.updated === "string" ? fields.updated : "",
      code: asList(fields.code),
    },
    body: raw.slice(match[0].length),
  };
}

/**
 * The route a Next file serves, from its path under src/app. Route groups
 * like (app) disappear; layouts and everything that isn't a page or a route
 * handler return null.
 *
 *   (app)/dashboard/page.tsx        -> /dashboard
 *   (app)/page.tsx                  -> /
 *   api/v1/use-cases/[id]/route.ts  -> /api/v1/use-cases/[id]
 */
export function routeFromAppPath(appRelativePath: string): string | null {
  const parts = appRelativePath.split("/");
  const file = parts.pop();
  if (file !== "page.tsx" && file !== "route.ts") return null;
  const segments = parts.filter((p) => !(p.startsWith("(") && p.endsWith(")")));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

/** "features/comments.md" -> "features/comments". The /docs URL slug. */
export function docPathToSlug(docRelativePath: string): string {
  return docRelativePath.replace(/\.md$/, "");
}

export interface DocSurfaces {
  /** Repo-relative path under docs/, e.g. "features/dashboard.md". */
  path: string;
  surfaces: string[];
}

/**
 * Everything wrong with the mapping between routes and docs, as sentences.
 * Empty means every route is documented and every documented route exists.
 */
export function docsCoverageProblems(input: {
  routes: string[];
  docs: DocSurfaces[];
}): string[] {
  const problems: string[] = [];
  const claimed = new Map<string, string[]>();

  for (const doc of input.docs) {
    for (const surface of doc.surfaces) {
      claimed.set(surface, [...(claimed.get(surface) ?? []), doc.path]);
    }
  }

  for (const route of input.routes) {
    if (!claimed.has(route)) {
      problems.push(
        `Route ${route} has no doc. Add it to a doc's "surface:" front matter under docs/.`,
      );
    }
  }

  for (const [surface, docs] of claimed) {
    if (!input.routes.includes(surface)) {
      problems.push(
        `${docs.join(", ")} documents ${surface}, which is not a route. Update or remove it.`,
      );
    }
    if (docs.length > 1) {
      problems.push(
        `Route ${surface} is claimed by more than one doc: ${docs.join(", ")}.`,
      );
    }
  }

  return problems.sort();
}

/**
 * Rewrite relative links between docs so the same markdown works on GitHub
 * and at /docs: "../concepts/statuses.md" -> "/docs/concepts/statuses".
 */
export function rewriteDocLinks(body: string, docRelativePath: string): string {
  const dir = docRelativePath.includes("/")
    ? docRelativePath.slice(0, docRelativePath.lastIndexOf("/"))
    : "";

  return body.replace(
    /\]\(([^)\s]+\.md)(#[^)\s]*)?\)/g,
    (_full, target: string, hash: string | undefined) => {
      const segments = dir ? dir.split("/") : [];
      for (const part of target.split("/")) {
        if (part === "..") segments.pop();
        else if (part !== ".") segments.push(part);
      }
      const slug = docPathToSlug(segments.join("/"));
      const href = slug === "README" ? "/docs" : `/docs/${slug}`;
      return `](${href}${hash ?? ""})`;
    },
  );
}
