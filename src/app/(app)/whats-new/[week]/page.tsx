import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { fmtDate } from "@/lib/format";
import { postExcerpt } from "@/lib/post-excerpt";
import { isWeekSlug } from "@/lib/weeks";
import { PostArticle } from "@/components/whats-new/post-article";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A post's permanent address: /whats-new/<weekStart>. Legacy links carried
 * the row's uuid (`?post=` and the old edit route), so a uuid here looks
 * the post up and redirects to where it lives now.
 */
async function postForParam(week: string) {
  const db = getDb();
  if (UUID.test(week)) {
    const [byId] = await db.select().from(posts).where(eq(posts.id, week));
    redirect(byId ? `/whats-new/${byId.weekStart}` : "/whats-new");
  }
  if (!isWeekSlug(week)) notFound();
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.weekStart, week));
  if (!post) notFound();
  return post;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}): Promise<Metadata> {
  const { week } = await params;
  if (!isWeekSlug(week)) return {};
  const db = getDb();
  const [post] = await db
    .select({ title: posts.title, body: posts.body })
    .from(posts)
    .where(eq(posts.weekStart, week));
  if (!post) return {};
  return { title: post.title, description: postExcerpt(post.body, 200) };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const user = await requireUser(); // reading is open to every role
  const { week } = await params;
  const post = await postForParam(week);

  const db = getDb();
  const neighbors = await db
    .select({ weekStart: posts.weekStart, title: posts.title })
    .from(posts)
    .orderBy(desc(posts.weekStart));
  const at = neighbors.findIndex((n) => n.weekStart === post.weekStart);
  const newer = at > 0 ? neighbors[at - 1] : null;
  const older = at < neighbors.length - 1 ? neighbors[at + 1] : null;

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-ink-faint">
        <Link href="/whats-new" className="hover:text-accent">
          What&rsquo;s New
        </Link>{" "}
        / Week of {fmtDate(post.weekStart)}
      </p>

      <div className="mt-6">
        <PostArticle
          post={post}
          isAdmin={user.role === "admin"}
          titleAs="h1"
        />
      </div>

      {(newer || older) && (
        <nav className="mt-12 flex justify-between gap-6 border-t border-hairline pt-6 text-sm">
          {older ? (
            <Link
              href={`/whats-new/${older.weekStart}`}
              className="max-w-[45%] hover:text-accent"
            >
              ← {fmtDate(older.weekStart)}
              <span className="block truncate text-xs text-ink-faint">
                {older.title}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link
              href={`/whats-new/${newer.weekStart}`}
              className="max-w-[45%] text-right hover:text-accent"
            >
              {fmtDate(newer.weekStart)} →
              <span className="block truncate text-xs text-ink-faint">
                {newer.title}
              </span>
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
