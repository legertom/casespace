import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { etDateString } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { priorWeekStart } from "@/server/whats-new";
import { RegenerateButton } from "@/components/whats-new/post-controls";

export const metadata = { title: "What's New" };

export default async function WhatsNewPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  await requireAdmin(); // everyone else 404s — the one gated surface
  const { post: postParam } = await searchParams;
  const db = getDb();
  const all = await db.select().from(posts).orderBy(desc(posts.weekStart));
  const selected =
    (postParam && all.find((p) => p.id === postParam)) || all[0] || null;

  const lastWeek = priorWeekStart(etDateString(new Date()));
  const lastWeekMissing = !all.some((p) => p.weekStart === lastWeek);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[16rem_1fr]">
      <aside>
        <h1 className="font-serif text-3xl">What&rsquo;s New</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The weekly program note, drafted every Monday morning. Admin-only.
        </p>
        {lastWeekMissing && (
          <div className="mt-4">
            <RegenerateButton
              weekStart={lastWeek}
              label="Draft last week's post"
            />
          </div>
        )}
        <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Archive
        </h2>
        <ul className="mt-2 space-y-1">
          {all.map((p) => (
            <li key={p.id}>
              <Link
                href={`/whats-new?post=${p.id}`}
                className={`block rounded px-2 py-1.5 text-sm hover:bg-surface ${selected?.id === p.id ? "bg-surface font-medium" : "text-ink-muted"}`}
              >
                {fmtDate(p.weekStart)}
                <span className="block truncate text-xs text-ink-faint">
                  {p.title}
                </span>
              </Link>
            </li>
          ))}
          {all.length === 0 && (
            <li className="px-2 text-sm text-ink-faint">No posts yet.</li>
          )}
        </ul>
      </aside>

      {selected ? (
        <article>
          <p className="text-sm uppercase tracking-widest text-ink-faint">
            Week of {fmtDate(selected.weekStart)}
          </p>
          <h2 className="mt-2 max-w-[26ch] font-serif text-4xl leading-tight">
            {selected.title}
          </h2>
          <p className="mt-3 text-sm text-ink-faint">
            Drafted by the program&rsquo;s writer
            {selected.generatedAt ? ` on ${fmtDate(selected.generatedAt)}` : ""}
            {selected.editedAt ? ` · edited ${fmtDate(selected.editedAt)}` : ""}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={`/whats-new/${selected.id}/edit`}
              className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface"
            >
              Edit
            </Link>
            <RegenerateButton
              weekStart={selected.weekStart}
              label="Regenerate draft"
            />
          </div>
          <div className="post-md mt-8 border-t border-hairline pt-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selected.body}
            </ReactMarkdown>
          </div>
        </article>
      ) : (
        <div className="max-w-md py-10">
          <p className="font-serif text-xl">Nothing published yet.</p>
          <p className="mt-2 text-ink-muted">
            The first post drafts itself next Monday morning — or draft last
            week&rsquo;s now.
          </p>
        </div>
      )}
    </div>
  );
}
