import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/current-user";
import { countDocs, getDocsIndex } from "@/server/docs";

export const metadata = { title: "Documentation" };

/**
 * The index is docs/README.md itself, links rewritten to /docs routes — so
 * the page a reader browses and the page GitHub shows are the same file, and
 * a doc can't be listed in one and missing from the other.
 */
export default async function DocsIndexPage() {
  await requireUser();
  const [index, total] = await Promise.all([getDocsIndex(), countDocs()]);

  return (
    <div>
      <p className="text-sm text-ink-faint">
        {total} pages, kept in the repo under{" "}
        <span className="font-mono">docs/</span> and rendered here — a doc
        updated in a pull request is live the moment it deploys.
      </p>
      <div className="post-md docs-md mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{index}</ReactMarkdown>
      </div>
    </div>
  );
}
