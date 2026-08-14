import { requireUser } from "@/lib/current-user";
import { TARGET_DOCUMENTED, TARGET_ROI } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { canViewPulse } from "@/lib/permissions";
import { getProgramCounts } from "@/server/dashboard-queries";
import { getPulseSeries } from "@/server/goals-queries";
import { PulseChart } from "@/components/goals/pulse-chart";
import { SnapshotForm } from "@/components/goals/snapshot-form";

export const metadata = { title: "Goals & trends" };

export default async function GoalsPage() {
  const user = await requireUser();
  const showPulse = canViewPulse(user.role);
  const [counts, pulse] = await Promise.all([
    getProgramCounts(),
    showPulse ? getPulseSeries() : Promise.resolve([]),
  ]);
  return (
    <div>
      <h1 className="font-serif text-4xl">
        {showPulse ? <>Goals &amp; adoption trends</> : "Goals"}
      </h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        The two count goals compute live from the casebook.
        {showPulse &&
          " The three pulse metrics come from the survey — admins record each new reading, and the history stays."}
      </p>

      <section aria-label="Count goals" className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          {
            label: "Documented use cases (Qualified or better)",
            actual: counts.documented,
            target: TARGET_DOCUMENTED,
          },
          {
            label: "Quantified positive ROI (Confirmed)",
            actual: counts.confirmedRoi,
            target: TARGET_ROI,
          },
        ].map((g) => (
          <div key={g.label} className="rounded-md border border-hairline bg-surface p-5">
            <p className="text-sm font-medium text-ink-muted">{g.label}</p>
            <p className="mt-1.5 font-serif text-4xl">
              {g.actual}
              <span className="text-xl text-ink-faint"> of {g.target}</span>
            </p>
          </div>
        ))}
      </section>

      {showPulse && (
      <section aria-label="Pulse metrics" className="mt-12 space-y-10">
        {pulse.map((m) => (
          <div key={m.key} className="rounded-md border border-hairline bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl">{m.label}</h2>
              <p className="text-sm text-ink-muted">
                {m.baselineValue}
                {m.unit} in June
                {m.latest && m.latest.date !== m.baselineDate
                  ? ` · now ${m.latest.value}${m.unit}`
                  : ""}{" "}
                · target {m.targetValue}
                {m.unit} in December
              </p>
            </div>
            <div className="mt-4">
              <PulseChart
                points={m.points}
                targetValue={m.targetValue}
                unit={m.unit}
                label={m.label}
              />
            </div>
            {m.points.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink-faint hover:text-ink">
                  Readings as a table
                </summary>
                <table className="mt-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink-faint">
                      <th className="py-1 pr-8 font-medium">Date</th>
                      <th className="py-1 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.points.map((p) => (
                      <tr key={p.date} className="border-t border-hairline">
                        <td className="py-1 pr-8">{fmtDate(p.date)}</td>
                        <td className="py-1 tabular-nums">
                          {p.value}
                          {m.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
            {user.role === "admin" && (
              <div className="mt-4 border-t border-hairline pt-4">
                <SnapshotForm metricKey={m.key} />
              </div>
            )}
          </div>
        ))}
      </section>
      )}
    </div>
  );
}
