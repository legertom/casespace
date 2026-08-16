import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/current-user";
import { etDateString } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { postExcerpt } from "@/lib/post-excerpt";
import { priorWeekStart } from "@/lib/weeks";
import { PostArticle } from "@/components/whats-new/post-article";
import { RegenerateButton } from "@/components/whats-new/post-controls";

export const metadata = { title: "What's New" };

/**
 * The archive: newest post in full, every earlier week beneath it as a card
 * with a generous excerpt, each linking to its permanent address at
 * /whats-new/<weekStart>.
 */
export default async function WhatsNewPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const user = await requireUser(); // open to every role; drafting/editing is admin-only
  const isAdmin = user.role === "admin";
  const { post: postParam } = await searchParams;
  const db = getDb();

  // The old selection URLs (?post=<uuid>) keep working as redirects.
  if (postParam) {
    const [byId] = await db
      .select({ weekStart: posts.weekStart })
      .from(posts)
      .where(eq(posts.id, postParam));
    redirect(byId ? `/whats-new/${byId.weekStart}` : "/whats-new");
  }

  const all = await db.select().from(posts).orderBy(desc(posts.weekStart));
  const [latest, ...earlier] = all;

  const lastWeek = priorWeekStart(etDateString(new Date()));
  const lastWeekMissing = !all.some((p) => p.weekStart === lastWeek);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">What&rsquo;s New</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The weekly program note, drafted every Monday morning.
          </p>
        </div>
        {isAdmin && lastWeekMissing && (
          <RegenerateButton
            weekStart={lastWeek}
            label="Draft last week's post"
          />
        )}
      </div>

      {latest ? (
        <div className="mt-10">
          <PostArticle post={latest} isAdmin={isAdmin} titleAs="h2" />
        </div>
      ) : (
        <div className="max-w-md py-10">
          <p className="font-serif text-xl">Nothing published yet.</p>
          <p className="mt-2 text-ink-muted">
            The first post drafts itself next Monday morning
            {isAdmin ? <> &mdash; or draft last week&rsquo;s now.</> : "."}
          </p>
        </div>
      )}

      {earlier.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Earlier weeks
          </h2>
          <ul className="mt-4 space-y-10">
            {earlier.map((p) => (
              <li key={p.id}>
                <article>
                  <p className="text-sm uppercase tracking-widest text-ink-faint">
                    Week of {fmtDate(p.weekStart)}
                  </p>
                  <h3 className="mt-1 font-serif text-2xl leading-snug">
                    <Link
                      href={`/whats-new/${p.weekStart}`}
                      className="hover:text-accent"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-2 whitespace-pre-line text-ink-muted leading-relaxed">
                    {postExcerpt(p.body)}
                  </p>
                  <p className="mt-2 text-sm">
                    <Link
                      href={`/whats-new/${p.weekStart}`}
                      className="text-accent hover:underline"
                    >
                      Read the week →
                    </Link>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
