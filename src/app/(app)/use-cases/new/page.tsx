import Link from "next/link";
import { redirect } from "next/navigation";
import { AI_NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/config";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";

export const metadata = { title: "Log a use case" };

function CoachIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.5-8.5 8.38 8.38 0 0 1 8.5 8.5Z" />
      <path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8.5 13.5h7M8.5 17h4.5" />
    </svg>
  );
}

function FormIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M4 5.5 5.5 7 8 4.5" />
      <path d="M4 12.5 5.5 14 8 11.5" />
      <path d="M4.5 19.5h.01" />
      <path d="M12 6h8M12 13h8M12 20h8" />
    </svg>
  );
}

function Card({
  href,
  title,
  icon,
  children,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-5 rounded-lg border border-hairline bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-deep transition-colors group-hover:bg-accent group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <h2 className="font-serif text-2xl leading-snug">{title}</h2>
          <span
            aria-hidden
            className="-translate-x-1 text-lg text-accent opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
          >
            &rarr;
          </span>
        </span>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
          {children}
        </p>
      </span>
    </Link>
  );
}

export default async function NewUseCasePage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) redirect("/use-cases");

  // The AI doors used to converge here as ?prefill=1; keep old links working.
  const { prefill } = await searchParams;
  if (prefill === "1") redirect("/use-cases/new/review");

  const ai = aiConfigured();

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-4xl">Log a use case</h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        Three ways in — all of them land as the same record. Only a title and
        a description are required, so save early and come back as the work
        evolves. Everything stays editable.
      </p>

      <div className="mt-10 space-y-4">
        {ai ? (
          <>
            <Card
              href="/coach?intent=wizard"
              title="Walk me through it"
              icon={<CoachIcon />}
            >
              A guided conversation with the Coach — one question at a time,
              and nothing saves until you approve it. Best if you&rsquo;re
              starting from a blank page.
            </Card>
            <Card
              href="/use-cases/from-notes"
              title="Start from your notes"
              icon={<NotesIcon />}
            >
              Paste what you already have: Granola notes, a doc excerpt, a
              Slack thread. The parser pre-fills every field it can defend
              and flags the gaps. Best if the story is already written down
              somewhere.
            </Card>
          </>
        ) : (
          <div className="rounded-lg border border-hairline p-6 text-sm text-ink-muted">
            <p className="font-medium text-ink">
              The Coach and the notes parser are asleep.
            </p>
            <p className="mt-1">{AI_NOT_CONFIGURED_MESSAGE}</p>
          </div>
        )}
        <Card
          href="/use-cases/new/form"
          title="Fill in the form myself"
          icon={<FormIcon />}
        >
          Every field in one place, each one explained. No AI involved.
          Quickest if you already know the workflow cold — two required
          fields, five minutes.
        </Card>
      </div>

      <p className="mt-10 border-t border-hairline pt-5 text-sm text-ink-faint">
        Working in your editor? Log use cases over MCP or the REST API —
        setup and tokens live on{" "}
        <Link
          href="/profile"
          className="underline underline-offset-2 hover:text-accent"
        >
          your profile
        </Link>
        .
      </p>
    </div>
  );
}
