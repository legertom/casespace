import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { fmtDateShort } from "@/lib/format";
import { canViewCoachLearnings } from "@/lib/permissions";
import {
  getCoachLearnings,
  type CoachLearnings,
} from "@/server/coach-learnings-queries";

export const metadata = { title: "Coach learnings" };

function pct(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function Stat({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <p className="font-serif text-3xl">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function Corrections({ data }: { data: CoachLearnings }) {
  if (data.corrections.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-muted">
        Nothing corrected yet. Either the Coach is guessing well or nobody has
        taken a proposal through the form.
      </p>
    );
  }
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-faint">
          <th className="pb-2 font-semibold">Field</th>
          <th className="pb-2 pl-4 font-semibold">Overruled</th>
          <th className="pb-2 pl-4 font-semibold">Left blank</th>
          <th className="pb-2 pl-4 font-semibold">What changed</th>
        </tr>
      </thead>
      <tbody>
        {data.corrections.map((c) => (
          <tr key={c.field} className="border-b border-hairline align-top">
            <td className="py-2.5 pr-4">{c.label}</td>
            <td className="py-2.5 pl-4 tabular-nums">
              {c.corrected + c.cleared || "—"}
            </td>
            <td className="py-2.5 pl-4 tabular-nums text-ink-muted">
              {c.filled || "—"}
            </td>
            <td className="py-2.5 pl-4 text-ink-muted">
              {c.examples.length === 0 ? (
                <span className="text-ink-faint">—</span>
              ) : (
                <ul className="space-y-0.5">
                  {c.examples.map((e, i) => (
                    <li key={i}>
                      <span className="line-through decoration-ink-faint">
                        {e.from}
                      </span>{" "}
                      → {e.to || <span className="text-ink-faint">removed</span>}
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function LearningsPage() {
  const user = await requireUser();
  if (!canViewCoachLearnings(user.role)) notFound();

  const data = await getCoachLearnings();
  const o = data.outcomes;

  return (
    <div>
      <h1 className="font-serif text-4xl">Coach learnings</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        What the AI doors proposed over the last {data.windowDays} days, and
        what people did about it. <strong>Admin-only.</strong> This page is
        deliberately aggregate: it reports which <em>fields</em> the Coach gets
        wrong and where the wizard loses people, never anyone&rsquo;s
        conversation. Dismiss reasons are the one exception — people write them
        knowing they come here, and the box says so.
      </p>

      {data.empty ? (
        <div className="mt-10 max-w-md">
          <p className="font-serif text-xl">Nothing to learn from yet.</p>
          <p className="mt-2 text-ink-muted">
            This fills in as people use the Coach&rsquo;s intake wizard and the
            notes door. Come back after a handful of sessions — ten dismissals
            with reasons attached will teach more than any rate on this page.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              value={String(o.proposed)}
              label="Proposals put on screen"
              hint={`${o.saved} saved, ${o.dismissed} dismissed`}
            />
            <Stat
              value={pct(o.savedRate)}
              label="Reached a record"
              hint="Proposals that became a use case"
            />
            <Stat
              value={pct(o.cleanRate)}
              label="Saved untouched"
              hint="Of those saved, with no field changed"
            />
            <Stat
              value={String(o.walkedAway)}
              label="Left undecided"
              hint="Proposed, then neither saved nor dismissed"
            />
          </div>

          <section className="mt-12">
            <h2 className="font-serif text-2xl">What the Coach gets wrong</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              Field by field, from proposals someone edited before saving.
              &ldquo;Overruled&rdquo; means it guessed and the human disagreed —
              the expensive kind, and the one worth changing the prompt over.
              &ldquo;Left blank&rdquo; means it declined to guess and the record
              ended up with a value anyway.
            </p>
            <Corrections data={data} />
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-2xl">Where the wizard loses people</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              Intake conversations that got past a first exchange and still
              never reached a proposal, bucketed by the step the Coach was
              asking about when they stopped. Read off its own questions, not
              anyone&rsquo;s answers.
            </p>
            {data.dropOff.abandoned === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No abandoned intake conversations in this window
                {data.wizardChats > 0
                  ? ` — all ${data.wizardChats} reached a proposal.`
                  : "."}
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {data.dropOff.buckets.map((b) => (
                    <li key={b.step} className="flex items-center gap-3 text-sm">
                      <span className="w-56 shrink-0">
                        <span className="text-ink-faint">{b.step}.</span>{" "}
                        {b.label}
                      </span>
                      <span
                        className="h-4 rounded-sm bg-accent-wash"
                        style={{
                          width: `${Math.max(
                            4,
                            (b.count / data.dropOff.abandoned) * 60,
                          )}rem`,
                          maxWidth: "60%",
                        }}
                        aria-hidden
                      />
                      <span className="tabular-nums">{b.count}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink-faint">
                  {`${data.dropOff.abandoned} abandoned of ${data.wizardChats} intake ${
                    data.wizardChats === 1 ? "conversation" : "conversations"
                  }${
                    data.dropOff.unattributed > 0
                      ? ` · ${data.dropOff.unattributed} stopped somewhere the questions don't identify`
                      : ""
                  }.`}
                </p>
              </>
            )}
          </section>

          <section className="mt-12">
            <h2 className="font-serif text-2xl">Why people dismissed a proposal</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              In their words, newest first. The most useful thing on this page —
              go and ask them.
            </p>
            {data.dismissals.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No reasons given yet. The box is optional, so a dismissal
                without one still counts above.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.dismissals.map((d) => (
                  <li
                    key={d.proposalRef}
                    className="rounded-md border border-hairline bg-surface p-4"
                  >
                    <blockquote className="border-l-2 border-hairline-strong pl-3 text-sm leading-relaxed">
                      {d.note}
                    </blockquote>
                    <p className="mt-2 text-xs text-ink-faint">
                      {d.personName} · {fmtDateShort(d.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
