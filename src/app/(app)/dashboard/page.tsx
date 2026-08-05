import { requireUser } from "@/lib/current-user";
import { ProgramDashboard } from "@/components/dashboard/program-dashboard";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireUser();
  return (
    <div>
      <h1 className="font-serif text-4xl">The program, at a glance</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        45 documented use cases and 15 with quantified, positive ROI by
        December 31. Counts and percentages only — never dollars.
      </p>
      <div className="mt-10">
        <ProgramDashboard />
      </div>
    </div>
  );
}
