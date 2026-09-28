import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { meetingGroupRuns, users } from "@/db/schema";
import { requireAdmin } from "@/lib/current-user";
import { GroupReport } from "@/components/groups/group-report";
import { GroupRunControls } from "@/components/groups/group-run-controls";

export const metadata = { title: "Grouping report" };

export default async function GroupRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [run] = await getDb().select({
    id: meetingGroupRuns.id,
    method: meetingGroupRuns.method,
    attendees: meetingGroupRuns.attendees,
    groups: meetingGroupRuns.groups,
    report: meetingGroupRuns.report,
    createdAt: meetingGroupRuns.createdAt,
    creatorName: users.name,
  }).from(meetingGroupRuns).leftJoin(users, eq(meetingGroupRuns.createdBy, users.id))
    .where(eq(meetingGroupRuns.id, id));
  if (!run) notFound();
  return <main className="mx-auto max-w-4xl space-y-5">
    <GroupRunControls id={run.id} />
    <GroupReport run={run} />
  </main>;
}
