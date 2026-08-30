import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { getDb } from "@/db/client";
import { coachChats } from "@/db/schema";
import { resolveChatIntent } from "@/lib/ai/coach-intent";
import { AI_NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/config";
import { requireUser } from "@/lib/current-user";
import type { CoachIntent } from "@/lib/domain";
import { fmtDateShort } from "@/lib/format";
import { CoachChat } from "@/components/coach/coach-chat";

export const metadata = { title: "Coach" };

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{
    chat?: string;
    intent?: string;
    review?: string;
    useCase?: string;
  }>;
}) {
  const user = await requireUser();
  const { chat, intent, review, useCase } = await searchParams;
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
  // A reopened chat carries its own intent and context forward. The URL that
  // opened it is long gone by then — /coach?chat=<id> says nothing about the
  // mode — so the row decides, here as in the route. See lib/ai/coach-intent.
  let storedIntent: CoachIntent | null = null;
  let storedUseCaseId: string | null = null;
  if (chatId) {
    const [row] = await db
      .select()
      .from(coachChats)
      .where(eq(coachChats.id, chatId));
    if (row && row.userId === user.id) {
      initialMessages = row.messages as UIMessage[];
      storedIntent = row.intent;
      storedUseCaseId = row.useCaseId;
    } else {
      chatId = undefined;
    }
  }
  if (!chatId) chatId = crypto.randomUUID();

  // `review` is its own door and brings a record with it. Of the rest, only
  // wizard and discovery are openable straight from a URL; anything else is a
  // plain question.
  const requestedIntent: CoachIntent = review
    ? "roi_review"
    : intent === "discovery" || intent === "wizard"
      ? intent
      : "qa";
  const chatIntent = resolveChatIntent(storedIntent, requestedIntent);
  // Mirrors the route: a chat that already exists keeps the record it was
  // opened from, and the URL only speaks for a brand-new one.
  const useCaseId = initialMessages
    ? (storedUseCaseId ?? undefined)
    : (useCase || undefined);

  // A conversation only kicks itself off when it is new. Discovery opens with
  // the smallest possible ask — the intimidating version of this prompt is one
  // that implies you should already know what you want built.
  const kickoff = initialMessages?.length
    ? undefined
    : review
      ? `Run an ROI review for use case ${review}. Check the evidence against the ROI confirmation bar and produce the Kate-ready packet.`
      : chatIntent === "discovery"
        ? useCaseId
          ? `Help me work through the problem behind use case ${useCaseId}. Start with what I'm trying to get out of it. Don't assume the answer is to build more AI.`
          : "Help me work through an AI opportunity. Start with what I'm working on. Don't assume the answer is to build AI."
        : chatIntent === "wizard"
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
            intent={chatIntent}
            useCaseId={useCaseId}
          />
        ) : (
          <div className="max-w-md py-10">
            <p className="font-serif text-xl">The Coach isn&rsquo;t awake yet.</p>
            <p className="mt-2 text-ink-muted">{AI_NOT_CONFIGURED_MESSAGE}</p>
            <p className="mt-4 text-sm text-ink-muted">
              Meanwhile, the{" "}
              <Link
                href="/use-cases/new/form"
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
