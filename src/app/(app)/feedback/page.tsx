import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { fmtDate } from "@/lib/format";
import { listFeedback } from "@/server/feedback-queries";
import { FeedbackItem } from "@/components/feedback/feedback-item";

export const metadata = { title: "Feedback" };

export default async function FeedbackPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");

  const rows = await listFeedback();
  const open = rows.filter((r) => !r.resolvedAt);
  const done = rows.filter((r) => r.resolvedAt);

  return (
    <div>
      <h1 className="font-serif text-4xl">Feedback</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        What people hit while using Casespace — reported from the error banner
        or the feedback button, with the underlying error attached where there
        was one. Admin-only; reporters see their own report land and nothing
        else.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-2xl">
          Open {open.length > 0 && <span className="text-ink-faint">({open.length})</span>}
        </h2>
        {open.length === 0 ? (
          <p className="mt-3 text-ink-muted">Nothing open. Quiet is good.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {open.map((f) => (
              <FeedbackItem key={f.id} item={{ ...f, createdAt: fmtDate(f.createdAt) }} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-ink-muted">Resolved</h2>
          <ul className="mt-3 space-y-3">
            {done.map((f) => (
              <FeedbackItem
                key={f.id}
                item={{ ...f, createdAt: fmtDate(f.createdAt) }}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
