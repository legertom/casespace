import Link from "next/link";
import { redirect } from "next/navigation";
import { AI_NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/config";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";

export const metadata = { title: "Log a use case" };

const cardCls =
  "block rounded-md border border-hairline bg-surface p-6 transition-colors hover:border-accent";

function Card({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cardCls}>
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{children}</p>
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
            <Card href="/coach?intent=wizard" title="Walk me through it">
              A guided conversation with the Coach — one question at a time,
              and nothing saves until you approve it. Best if you&rsquo;re
              starting from a blank page.
            </Card>
            <Card href="/use-cases/from-notes" title="Start from your notes">
              Paste what you already have: Granola notes, a doc excerpt, a
              Slack thread. The parser pre-fills every field it can defend
              and flags the gaps. Best if the story is already written down
              somewhere.
            </Card>
          </>
        ) : (
          <div className="rounded-md border border-hairline p-6 text-sm text-ink-muted">
            <p className="font-medium text-ink">
              The Coach and the notes parser are asleep.
            </p>
            <p className="mt-1">{AI_NOT_CONFIGURED_MESSAGE}</p>
          </div>
        )}
        <Card href="/use-cases/new/form" title="Fill in the form myself">
          Every field in one place, each one explained. No AI involved.
          Quickest if you already know the workflow cold — two required
          fields, five minutes.
        </Card>
      </div>

      <p className="mt-8 text-sm text-ink-faint">
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
