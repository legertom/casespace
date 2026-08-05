import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { fmtDate } from "@/lib/format";
import { updatePostAction } from "@/server/actions-posts";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const db = getDb();
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  if (!post) notFound();

  async function save(formData: FormData) {
    "use server";
    await updatePostAction(id, {
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    });
    redirect(`/whats-new?post=${id}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl">
        Edit — week of {fmtDate(post.weekStart)}
      </h1>
      <form action={save} className="mt-8 space-y-5">
        <label className="block">
          <span className="text-sm font-medium">Headline</span>
          <input
            name="title"
            defaultValue={post.title}
            required
            className="mt-1.5 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-serif text-lg"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Body (markdown)</span>
          <textarea
            name="body"
            defaultValue={post.body}
            required
            rows={24}
            className="mt-1.5 w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 font-mono text-sm leading-relaxed"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm text-white hover:bg-accent-deep"
          >
            Save
          </button>
          <a
            href={`/whats-new?post=${id}`}
            className="rounded-md border border-hairline-strong px-4 py-2 text-sm hover:bg-surface"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
