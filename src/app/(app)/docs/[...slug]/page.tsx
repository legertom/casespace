import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requireUser } from "@/lib/current-user";
import { getDoc } from "@/server/docs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const doc = await getDoc(slug.join("/"));
  return { title: doc?.frontMatter.title ?? "Documentation" };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  await requireUser();
  const { slug } = await params;
  const doc = await getDoc(slug.join("/"));
  if (!doc) notFound();

  const { frontMatter } = doc;

  return (
    <article className="max-w-prose">
      <Link href="/docs" className="text-sm text-ink-muted hover:text-accent">
        ← All documentation
      </Link>

      <div className="post-md docs-md mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.body}</ReactMarkdown>
      </div>

      <footer className="mt-12 border-t border-hairline pt-4 text-sm text-ink-faint">
        {frontMatter.updated && <p>Last updated {frontMatter.updated}.</p>}
        {frontMatter.code.length > 0 && (
          <p className="mt-1">
            Described code:{" "}
            <span className="font-mono text-xs">
              {frontMatter.code.join(", ")}
            </span>
          </p>
        )}
        <p className="mt-1">
          Something wrong or missing?{" "}
          <Link href="/feedback" className="text-accent hover:underline">
            Tell us
          </Link>
          , or edit <span className="font-mono text-xs">docs/{doc.slug}.md</span>{" "}
          in the repo.
        </p>
      </footer>
    </article>
  );
}
