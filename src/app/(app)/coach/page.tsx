import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { getDb } from "@/db/client";
import { coachChats } from "@/db/schema";
import { AI_NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/config";
import { requireUser } from "@/lib/current-user";
import { fmtDateShort } from "@/lib/format";
import { CoachChat } from "@/components/coach/coach-chat";

export const metadata = { title: "Coach" };

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string; intent?: string; review?: string }>;
}) {
  const user = await requireUser();
  const { chat, intent, review } = await searchParams;
  const db = getDb();

  const recent = await db
    .select({
      id: coachChats.id,
      title: coachChats.title,
      updatedAt: coachChats.updatedAt,
    })
    .from(coachChats)
    .where(eq(coachChats.userId, user.id))
    .orderBy(desc(coachChats.updatedAt))
    .limit(12);

  let initialMessages: UIMessage[] | undefined;
  let chatId = chat;
  if (chatId) {
    const [row] = await db
      .select()
      .from(coachChats)
      .where(eq(coachChats.id, chatId));
    if (row && row.userId === user.id) {
      initialMessages = row.messages as UIMessage[];
    } else {
      chatId = undefined;
    }
  }
  if (!chatId) chatId = crypto.randomUUID();

  const kickoff = review
    ? `Run an ROI review for use case ${review}. Check the evidence against the Qualified+ bar and produce the Kate-ready packet.`
    : intent === "wizard"
      ? "Walk me through logging a new use case."
      : undefined;

  return (
    <div className="grid h-[calc(100vh-9.5rem)] grid-cols-1 gap-10 lg:grid-cols-[15rem_1fr]">
      <aside className="hidden min-h-0 flex-col lg:flex">
        <h1 className="font-serif text-2xl">The Coach</h1>
        <Link
          href="/coach"
          className="mt-4 rounded-md border border-hairline-strong px-3 py-1.5 text-center text-sm hover:bg-surface"
        >
          New conversation
        </Link>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Recent
          </h2>
          <ul className="mt-2 space-y-1">
            {recent.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/coach?chat=${c.id}`}
                  className={`block truncate rounded px-2 py-1.5 text-sm hover:bg-surface ${c.id === chat ? "bg-surface font-medium" : "text-ink-muted"}`}
                >
                  {c.title}
                  <span className="ml-1.5 text-xs text-ink-faint">
                    {fmtDateShort(c.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-ink-faint">
                No conversations yet.
              </li>
            )}
          </ul>
        </div>
      </aside>

      <div className="min-h-0">
        {aiConfigured() ? (
          <CoachChat
            key={chatId}
            chatId={chatId}
            initialMessages={initialMessages}
            kickoff={kickoff}
          />
        ) : (
          <div className="max-w-md py-10">
            <p className="font-serif text-xl">The Coach isn&rsquo;t awake yet.</p>
            <p className="mt-2 text-ink-muted">{AI_NOT_CONFIGURED_MESSAGE}</p>
            <p className="mt-4 text-sm text-ink-muted">
              Meanwhile, the{" "}
              <Link
                href="/use-cases/new"
                className="text-accent underline underline-offset-2"
              >
                form door
              </Link>{" "}
              works without AI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
