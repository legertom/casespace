import Link from "next/link";
import { formatMeetingRunDate, type MeetingReport } from "@/lib/ai/meeting-breakouts";

export interface SavedGroupRun {
  id: string;
  method: "jev" | "opus";
  attendees: { id: string; name: string }[];
  groups: { memberIds: string[]; rationale?: string }[];
  report: MeetingReport;
  createdAt: Date;
  creatorName: string | null;
}

export function GroupReport({ run }: { run: SavedGroupRun }) {
  const names = new Map(run.attendees.map((lead) => [lead.id, lead.name]));
  return (
    <article className="space-y-6 rounded-lg border border-hairline-strong bg-paper p-5 print:border-0 print:p-0">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">AI Leads sorting report</p>
        <h1 className="mt-1 font-serif text-3xl">Live meeting groups</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {formatMeetingRunDate(run.createdAt)} · {run.method === "jev" ? "Jev selected the groups" : "Claude Opus formed the groups"} · {run.attendees.length} attendees
          {run.creatorName ? ` · Run by ${run.creatorName}` : ""}
        </p>
      </header>
      <section>
        <h2 className="font-serif text-xl">How the groups were formed</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{run.report.summary}</p>
      </section>
      <div className="space-y-5">
        {run.groups.map((group, i) => {
          const explanation = run.report.groups[i];
          return (
            <section key={i} className="rounded-md border border-hairline p-4 print:break-inside-avoid">
              <h2 className="font-serif text-xl">Group {i + 1}</h2>
              <p className="mt-1 font-medium">{group.memberIds.map((id) => names.get(id) ?? "Unknown attendee").join(", ")}</p>
              {explanation && <div className="mt-4 space-y-3 text-sm leading-relaxed">
                <div><h3 className="font-medium">Possible commonality</h3><p className="text-ink-muted">{explanation.commonality}</p></div>
                <div><h3 className="font-medium">Why this mix</h3><p className="text-ink-muted">{explanation.reasoning}</p></div>
                <div><h3 className="font-medium">Recorded use-case evidence</h3>
                  {explanation.evidence.length ? <ul className="list-disc pl-5 text-ink-muted">{explanation.evidence.map((title, j) => <li key={j}>{title}</li>)}</ul> : <p className="text-ink-muted">No specific case title supports a shared thread yet.</p>}
                </div>
                <div><h3 className="font-medium">Start the discussion</h3><p className="text-ink-muted">{explanation.discussionPrompt}</p></div>
              </div>}
            </section>
          );
        })}
      </div>
      <section className="border-t border-hairline pt-4 text-sm">
        <h2 className="font-medium">Meeting exercise</h2>
        <p className="mt-1 text-ink-muted">First, find what your work has in common. Then give each person a turn to share the obstacle they brought. Choose one next step together.</p>
        <p className="mt-3 text-xs text-ink-faint">{run.report.limitation}</p>
      </section>
      <p className="text-xs text-ink-faint print:hidden"><Link href="/groups" className="text-accent underline underline-offset-2">All saved attempts</Link></p>
    </article>
  );
}
