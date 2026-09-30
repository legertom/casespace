import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { meetingGroupRuns, users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { GroupRunControls } from "@/components/groups/group-run-controls";

export const metadata = { title: "Saved groups" };

export default async function GroupsPage() {
  await requireAdmin();
  const runs = await getDb().select({
    id: meetingGroupRuns.id,
    method: meetingGroupRuns.method,
    attendees: meetingGroupRuns.attendees,
    groups: meetingGroupRuns.groups,
    report: meetingGroupRuns.report,
    createdAt: meetingGroupRuns.createdAt,
    creatorName: users.name,
  }).from(meetingGroupRuns).leftJoin(users, eq(meetingGroupRuns.createdBy, users.id))
    .orderBy(desc(meetingGroupRuns.createdAt));
  return <main className="mx-auto max-w-4xl">
    <h1 className="font-serif text-4xl">Saved groups</h1>
    <p className="mt-2 text-ink-muted">Every successful sorting attempt is saved automatically. Open its assignments and explanation report, or remove an attempt you no longer need.</p>
    <Link href="/coach" className="mt-4 inline-block text-sm text-accent underline underline-offset-2">Form live groups with the Coach</Link>
    {runs.length === 0 ? <p className="mt-10 text-ink-muted">No grouping attempts yet.</p> : <ol className="mt-8 space-y-3">
      {runs.map((run) => <li key={run.id} className="rounded-lg border border-hairline-strong p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><Link href={`/groups/${run.id}`} className="font-serif text-xl text-accent underline underline-offset-2">{run.method === "jev" ? "Jev" : "Claude Opus"} · {run.createdAt.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "America/New_York" })}</Link>
            <p className="mt-1 text-sm text-ink-muted">{run.attendees.length} attendees · {run.groups.length} {run.groups.length === 1 ? "group" : "groups"}{run.creatorName ? ` · ${run.creatorName}` : ""}</p>
            {run.report?.latecomer && <p className="mt-1 text-xs text-ink-muted">Latecomer: {run.report.latecomer.name} joined Group {run.report.latecomer.groupIndex + 1}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/groups/${run.id}`} className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface">View report</Link>
            <Link href={`/groups/${run.id}#add-latecomer`} className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface">Add latecomer</Link>
            <GroupRunControls id={run.id} showPrint={false} />
          </div>
        </div>
        <ol className="mt-3 space-y-1 text-sm text-ink-muted">{run.groups.map((group, i) => {
          const names = new Map(run.attendees.map((lead) => [lead.id, lead.name]));
          return <li key={i}><strong className="text-ink">Group {i + 1}:</strong> {group.memberIds.map((id) => names.get(id) ?? "Unknown attendee").join(", ")}</li>;
        })}</ol>
      </li>)}
    </ol>}
  </main>;
}
