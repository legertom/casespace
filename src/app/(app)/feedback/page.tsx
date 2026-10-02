import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { fmtDate } from "@/lib/format";
import { listCoachFailures } from "@/server/coach-failures";
import { listFeedback } from "@/server/feedback-queries";
import { FeedbackItem } from "@/components/feedback/feedback-item";

export const metadata = { title: "Feedback" };

// A failure is looked up by when it happened, so these carry the time —
// Eastern, like every other date the program runs on.
const failureTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
  timeZoneName: "short",
});

const FAILURE_KINDS: Record<string, string> = {
  transcript: "Unsendable transcript",
  gateway_auth: "Gateway rejected the key",
  gateway_account: "Gateway account needs attention",
  rate_limit: "Rate-limited",
  model_missing: "Model not on the gateway",
  provider_down: "Provider trouble",
  timeout: "Timed out",
  unknown: "Unrecognized error",
};

const FAILURE_STAGES: Record<string, string> = {
  setup: "before the turn started",
  turn: "the turn failed",
  tool: "one tool failed, the turn carried on",
};

export default async function FeedbackPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");

  const [rows, failures] = await Promise.all([
    listFeedback(),
    listCoachFailures(),
  ]);
  const open = rows.filter((r) => !r.resolvedAt);
  const done = rows.filter((r) => r.resolvedAt);
  // A failure somebody also reported is one already in the lists above.
  const reportedRefs = new Set(rows.map((r) => r.errorRef).filter(Boolean));

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

      <section className="mt-10">
        <h2 className="font-serif text-2xl">
          Coach failures{" "}
          {failures.length > 0 && (
            <span className="text-ink-faint">({failures.length})</span>
          )}
        </h2>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          Every Coach turn that failed in the last 30 days, whether or not
          anyone reported it. Who, when, and the error — never what they
          typed. The reference is the one they were shown.
        </p>
        {failures.length === 0 ? (
          <p className="mt-3 text-ink-muted">None. Quiet is good.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded-md border border-hairline bg-surface">
            {failures.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <p className="text-sm text-ink-faint">
                  {f.userName ?? "Someone"} · {failureTimeFmt.format(f.createdAt)}
                  {" · "}ref {f.ref}
                  {reportedRefs.has(f.ref) && <span> · reported above</span>}
                </p>
                <p className="mt-1 text-sm">
                  {FAILURE_KINDS[f.kind] ?? f.kind}
                  <span className="text-ink-faint">
                    {" · "}
                    {FAILURE_STAGES[f.stage] ?? f.stage}
                    {f.intent && ` · ${f.intent} chat`}
                    {f.messageCount != null &&
                      ` · ${f.messageCount} ${f.messageCount === 1 ? "message" : "messages"} in`}
                  </span>
                </p>
                {f.detail && (
                  <p className="mt-1 break-words font-mono text-xs text-ink-muted">
                    {f.detail}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
