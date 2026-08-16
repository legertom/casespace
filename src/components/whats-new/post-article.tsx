import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fmtDate } from "@/lib/format";
import type { posts } from "@/db/schema";
import { RegenerateButton } from "@/components/whats-new/post-controls";

type Post = typeof posts.$inferSelect;

/**
 * One post, rendered in full — the article page and the newest post on the
 * archive index share this so the two can't drift. `titleAs` keeps the
 * heading level right for where it sits ("h1" on the article page, "h2"
 * under the index's own h1).
 */
export function PostArticle({
  post,
  isAdmin,
  titleAs: Title,
}: {
  post: Post;
  isAdmin: boolean;
  titleAs: "h1" | "h2";
}) {
  return (
    <article>
      <p className="text-sm uppercase tracking-widest text-ink-faint">
        Week of {fmtDate(post.weekStart)}
      </p>
      <Title className="mt-2 max-w-[26ch] font-serif text-4xl leading-tight">
        {post.title}
      </Title>
      <p className="mt-3 text-sm text-ink-faint">
        Drafted by the program&rsquo;s writer
        {post.generatedAt ? ` on ${fmtDate(post.generatedAt)}` : ""}
        {post.editedAt ? ` · edited ${fmtDate(post.editedAt)}` : ""}
      </p>
      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <Link
            href={`/whats-new/${post.weekStart}/edit`}
            className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
          >
            Edit
          </Link>
          <RegenerateButton
            weekStart={post.weekStart}
            label="Regenerate draft"
            edited={post.editedAt !== null}
          />
        </div>
      )}
      <div className="post-md mt-8 border-t border-hairline pt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>
    </article>
  );
}
