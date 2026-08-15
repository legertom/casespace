import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  docPathToSlug,
  docsCoverageProblems,
  parseFrontMatter,
  rewriteDocLinks,
  routeFromAppPath,
} from "./docs-manifest";

const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");
const APP_DIR = path.join(REPO_ROOT, "src/app");

/** Working documents, not reference docs — excluded from coverage. */
const EXCLUDED_DOC_DIRS = new Set(["plans"]);

function walk(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, base);
    return [path.relative(base, full).split(path.sep).join("/")];
  });
}

const docFiles = walk(DOCS_DIR).filter(
  (p) =>
    p.endsWith(".md") &&
    p !== "README.md" &&
    p !== "_template.md" &&
    !EXCLUDED_DOC_DIRS.has(p.split("/")[0]),
);

const docs = docFiles.map((p) => ({
  path: p,
  ...parseFrontMatter(readFileSync(path.join(DOCS_DIR, p), "utf8")),
}));

const routes = walk(APP_DIR)
  .map(routeFromAppPath)
  .filter((r): r is string => r !== null);

// ---------------------------------------------------------------------------
// The pure functions
// ---------------------------------------------------------------------------

describe("routeFromAppPath", () => {
  it("drops route groups", () => {
    expect(routeFromAppPath("(app)/dashboard/page.tsx")).toBe("/dashboard");
  });

  it("maps the group's index page to /", () => {
    expect(routeFromAppPath("(app)/page.tsx")).toBe("/");
  });

  it("keeps dynamic segments verbatim", () => {
    expect(routeFromAppPath("api/v1/use-cases/[id]/route.ts")).toBe(
      "/api/v1/use-cases/[id]",
    );
    expect(routeFromAppPath("api/auth/[...nextauth]/route.ts")).toBe(
      "/api/auth/[...nextauth]",
    );
  });

  it("ignores anything that isn't a page or route handler", () => {
    expect(routeFromAppPath("(app)/layout.tsx")).toBeNull();
    expect(routeFromAppPath("globals.css")).toBeNull();
  });
});

describe("parseFrontMatter", () => {
  it("reads scalars and lists", () => {
    const { frontMatter, body } = parseFrontMatter(
      [
        "---",
        "title: The dashboard",
        "surface: /dashboard",
        "audience: admin",
        "updated: 2026-08-14",
        "code:",
        "  - src/a.ts",
        "  - src/b.ts",
        "---",
        "# Body",
      ].join("\n"),
    );
    expect(frontMatter.title).toBe("The dashboard");
    expect(frontMatter.surface).toEqual(["/dashboard"]);
    expect(frontMatter.audience).toBe("admin");
    expect(frontMatter.code).toEqual(["src/a.ts", "src/b.ts"]);
    expect(body.trim()).toBe("# Body");
  });

  it("reads a list of surfaces", () => {
    const { frontMatter } = parseFrontMatter(
      ["---", "surface:", "  - /a", "  - /b", "---", ""].join("\n"),
    );
    expect(frontMatter.surface).toEqual(["/a", "/b"]);
  });

  it("survives a doc with no front matter", () => {
    const { frontMatter, body } = parseFrontMatter("# Just a heading\n");
    expect(frontMatter.surface).toEqual([]);
    expect(body).toBe("# Just a heading\n");
  });
});

describe("rewriteDocLinks", () => {
  it("resolves links up and across, and keeps the hash", () => {
    expect(
      rewriteDocLinks("[s](../concepts/statuses.md#the-movement-rules)", "features/coach.md"),
    ).toBe("[s](/docs/concepts/statuses#the-movement-rules)");
  });

  it("resolves same-directory links", () => {
    expect(rewriteDocLinks("[r](record.md)", "features/coach.md")).toBe(
      "[r](/docs/features/record)",
    );
  });

  it("points the index at /docs", () => {
    expect(rewriteDocLinks("[i](../README.md)", "features/coach.md")).toBe(
      "[i](/docs)",
    );
  });

  it("leaves external links alone", () => {
    const link = "[x](https://orm.drizzle.team)";
    expect(rewriteDocLinks(link, "features/coach.md")).toBe(link);
  });
});

describe("docsCoverageProblems", () => {
  it("is quiet when routes and docs agree", () => {
    expect(
      docsCoverageProblems({
        routes: ["/a", "/b"],
        docs: [{ path: "features/x.md", surfaces: ["/a", "/b"] }],
      }),
    ).toEqual([]);
  });

  it("names an undocumented route", () => {
    const problems = docsCoverageProblems({
      routes: ["/a", "/b"],
      docs: [{ path: "features/x.md", surfaces: ["/a"] }],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("/b");
  });

  it("names a doc pointing at a route that no longer exists", () => {
    const problems = docsCoverageProblems({
      routes: ["/a"],
      docs: [{ path: "features/x.md", surfaces: ["/a", "/gone"] }],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("/gone");
  });

  it("catches two docs claiming the same route", () => {
    const problems = docsCoverageProblems({
      routes: ["/a"],
      docs: [
        { path: "features/x.md", surfaces: ["/a"] },
        { path: "features/y.md", surfaces: ["/a"] },
      ],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("more than one doc");
  });
});

// ---------------------------------------------------------------------------
// The real docs/ folder
// ---------------------------------------------------------------------------

describe("docs coverage", () => {
  it("documents every route, and every documented route exists", () => {
    const problems = docsCoverageProblems({
      routes,
      docs: docs.map((d) => ({ path: d.path, surfaces: d.frontMatter.surface })),
    });
    expect(problems).toEqual([]);
  });

  it("points every code: path at a file that exists", () => {
    const missing = docs.flatMap((doc) =>
      doc.frontMatter.code
        .filter((rel) => !existsSync(path.join(REPO_ROOT, rel)))
        .map((rel) => `${doc.path} -> ${rel}`),
    );
    expect(missing).toEqual([]);
  });

  it("gives every doc a title and an updated date", () => {
    const incomplete = docs
      .filter((d) => !d.frontMatter.title || !/^\d{4}-\d{2}-\d{2}$/.test(d.frontMatter.updated))
      .map((d) => d.path);
    expect(incomplete).toEqual([]);
  });

  it("lists every doc in the index", () => {
    const index = readFileSync(path.join(DOCS_DIR, "README.md"), "utf8");
    const unlisted = docs
      .filter((d) => !index.includes(`(${d.path})`))
      .map((d) => d.path);
    expect(unlisted).toEqual([]);
  });

  it("links only to docs that exist", () => {
    const broken = docs.flatMap((doc) => {
      const dir = doc.path.slice(0, doc.path.lastIndexOf("/"));
      return [...doc.body.matchAll(/\]\(([^)\s]+\.md)(?:#[^)\s]*)?\)/g)]
        .map((m) => path.normalize(path.join(DOCS_DIR, dir, m[1])))
        .filter((target) => !existsSync(target))
        .map((target) => `${doc.path} -> ${path.relative(DOCS_DIR, target)}`);
    });
    expect(broken).toEqual([]);
  });
});

describe("docPathToSlug", () => {
  it("drops the extension", () => {
    expect(docPathToSlug("features/comments.md")).toBe("features/comments");
  });
});
