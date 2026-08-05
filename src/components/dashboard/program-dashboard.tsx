import Link from "next/link";
import {
  DEPARTMENT_LABELS,
  STATUS_LABELS,
  TARGET_DOCUMENTED,
  TARGET_ROI,
  etDateString,
  paceSummary,
  targetSumWarning,
} from "@/lib/domain";
import { fmtDateShort } from "@/lib/format";
import {
  getAttentionFlags,
  getEltProgress,
  getMovement,
  getProgramCounts,
  getTeamCoverage,
} from "@/server/dashboard-queries";
import { STATUSES, type UcStatus } from "@/lib/domain";

/** Sequential one-hue ramp for the ordered pipeline (light → deep rust). */
const PIPELINE_RAMP: Record<UcStatus, string> = {
  in_discovery: "#ecdccd",
  approved_by_fl: "#ddbfa6",
  under_construction: "#c99f7e",
  in_testing: "#b37d55",
  launched: "#9a5a31",
  qualified: "#7a3a18",
};

function HeroNumber({
  label,
  actual,
  target,
  sentence,
  href,
}: {
  label: string;
  actual: number;
  target: number;
  sentence: string;
  href: string;
}) {
  const pct = Math.min(100, Math.round((actual / target) * 100));
  return (
    <Link
      href={href}
      className="block rounded-md border border-hairline bg-surface p-6 transition-colors hover:border-hairline-strong"
    >
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 font-serif text-6xl tracking-tight">
        {actual}
        <span className="text-2xl text-ink-faint"> of {target}</span>
      </p>
      <div
        role="img"
        aria-label={`${actual} of ${target}`}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-hairline"
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{sentence}</p>
    </Link>
  );
}

export async function ProgramDashboard() {
  const [counts, elt, coverage, movement, attention] = await Promise.all([
    getProgramCounts(),
    getEltProgress(),
    getTeamCoverage(),
    getMovement(7),
    getAttentionFlags(),
  ]);

  const today = etDateString(new Date());
  const docPace = paceSummary(TARGET_DOCUMENTED, counts.qualified, today);
  const roiPace = paceSummary(
    TARGET_ROI,
    counts.qualifiedPlus,
    today,
    "at Qualified+",
  );
  const maxStatusCount = Math.max(1, ...Object.values(counts.byStatus));
  const targetWarning = targetSumWarning(
    elt.filter((o) => o.target !== null).map((o) => ({ target: o.target! })),
  );

  const quietTeams = coverage.filter((t) => t.useCaseCount === 0);

  return (
    <div className="space-y-14">
      {/* ------------------------------------------------ the two numbers */}
      <section aria-label="Program targets">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <HeroNumber
            label="Documented use cases — Qualified or better"
            actual={counts.qualified}
            target={TARGET_DOCUMENTED}
            sentence={docPace.sentence}
            href="/use-cases?status=qualified"
          />
          <HeroNumber
            label="Quantified, positive ROI — Qualified+"
            actual={counts.qualifiedPlus}
            target={TARGET_ROI}
            sentence={roiPace.sentence}
            href="/use-cases?status=qualified_plus"
          />
        </div>
      </section>

      {/* ------------------------------------------------ pipeline */}
      <section aria-label="Pipeline">
        <h2 className="font-serif text-2xl">The pipeline</h2>
        <p className="mt-1 text-sm text-ink-muted">
          All {counts.total} use cases by status. Click a stage to see its
          records.
        </p>
        <ul className="mt-5 space-y-2">
          {STATUSES.map((s) => {
            const n = counts.byStatus[s];
            return (
              <li key={s}>
                <Link
                  href={`/use-cases?status=${s}`}
                  className="group grid grid-cols-[11rem_1fr_2.5rem] items-center gap-3"
                >
                  <span className="text-right text-sm text-ink-muted group-hover:text-ink">
                    {STATUS_LABELS[s]}
                  </span>
                  <span className="h-6 overflow-hidden rounded-r-[4px]">
                    <span
                      className="block h-full rounded-r-[4px]"
                      style={{
                        width: `${Math.max(1.5, (n / maxStatusCount) * 100)}%`,
                        backgroundColor: PIPELINE_RAMP[s],
                      }}
                    />
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------------------------ the 15 by ELT org */}
      <section aria-label="The 15 by ELT org">
        <h2 className="font-serif text-2xl">The 15, by ELT owner</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Qualified+ counts against each owner&rsquo;s share of the 15.
          {targetWarning && (
            <span className="text-flag"> {targetWarning}</span>
          )}
        </p>
        <ul className="mt-5 space-y-4">
          {elt.map((o) => (
            <li key={o.name}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm">
                  {o.name}
                  {o.note && (
                    <span
                      className="ml-1.5 cursor-help text-flag"
                      title={o.note}
                      aria-label={`Note: ${o.note}`}
                    >
                      ⚠
                    </span>
                  )}
                </span>
                <span className="text-sm tabular-nums text-ink-muted">
                  {o.qualifiedPlus}
                  {o.target !== null ? ` of ${o.target}` : ""}
                  {o.qualifiedInFlight > 0 && (
                    <span className="text-ink-faint">
                      {" "}
                      · {o.qualifiedInFlight} Qualified awaiting ROI
                    </span>
                  )}
                </span>
              </div>
              {o.target !== null && (
                <div
                  role="img"
                  aria-label={`${o.name}: ${o.qualifiedPlus} of ${o.target}`}
                  className="mt-1.5 flex h-2 gap-0.5"
                >
                  {Array.from({ length: o.target }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-full flex-1 rounded-[3px] ${
                        i < o.qualifiedPlus
                          ? "bg-st-qualifiedplus"
                          : "bg-hairline"
                      }`}
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ team coverage */}
      <section aria-label="Team coverage">
        <h2 className="font-serif text-2xl">Coverage by team</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Every AI Lead builds two workflows for their function.
          {quietTeams.length > 0 &&
            ` ${quietTeams.length} ${quietTeams.length === 1 ? "team has" : "teams have"} nothing logged yet.`}
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline-strong text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 font-medium">AI Lead(s)</th>
                <th className="py-2 pr-4 text-right font-medium">Logged</th>
                <th className="py-2 font-medium">Toward 2 per lead</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((t) => (
                <tr
                  key={t.teamId}
                  className={`border-b border-hairline ${t.useCaseCount === 0 ? "text-ink-muted" : ""}`}
                >
                  <td className="py-2 pr-4">
                    <span className="text-xs text-ink-faint">
                      {DEPARTMENT_LABELS[t.department]}
                    </span>
                    <span className="block">{t.teamName}</span>
                  </td>
                  <td className="py-2 pr-4">{t.leadNames.join(", ") || "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {t.useCaseCount === 0 ? (
                      <span className="text-flag">0</span>
                    ) : (
                      t.useCaseCount
                    )}
                  </td>
                  <td className="py-2">
                    <span
                      className="inline-flex gap-1"
                      role="img"
                      aria-label={`${Math.min(t.useCaseCount, t.target)} of ${t.target}`}
                    >
                      {Array.from({ length: t.target }).map((_, i) => (
                        <span
                          key={i}
                          className={`size-2.5 rounded-full ${
                            i < t.useCaseCount
                              ? "bg-st-launched"
                              : "border border-hairline-strong"
                          }`}
                        />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* ---------------------------------------------- movement */}
        <section aria-label="Movement this week">
          <h2 className="font-serif text-2xl">Movement this week</h2>
          {movement.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              A quiet week so far — nothing new logged, nothing moved.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {movement.slice(0, 12).map((m) => (
                <li key={m.id} className="flex gap-3 text-sm">
                  <span className="w-14 shrink-0 text-ink-faint">
                    {fmtDateShort(m.createdAt)}
                  </span>
                  <span className="min-w-0">
                    <Link
                      href={`/use-cases/${m.useCaseId}`}
                      className="font-medium hover:text-accent"
                    >
                      {m.title}
                    </Link>{" "}
                    <span className="text-ink-muted">
                      {m.fromStatus === null
                        ? `logged at ${STATUS_LABELS[m.toStatus]}`
                        : m.becameQualifiedPlus
                          ? "reached Qualified+ — qualified with complete ROI"
                          : `moved to ${STATUS_LABELS[m.toStatus]}`}
                      {m.changedByName ? ` · ${m.changedByName}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------------------------- attention */}
        <section aria-label="Needs attention">
          <h2 className="font-serif text-2xl">Needs attention</h2>
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold">
                Sitting still {attention.staleDays}+ days
              </h3>
              {attention.stale.length === 0 ? (
                <p className="mt-1.5 text-sm text-ink-muted">
                  Nothing stuck. Every record has moved recently.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {attention.stale.map((s) => (
                    <li key={s.id} className="text-sm">
                      <Link
                        href={`/use-cases/${s.id}`}
                        className="hover:text-accent"
                      >
                        {s.title}
                      </Link>{" "}
                      <span className="text-ink-muted">
                        — {s.daysInStatus} days in {STATUS_LABELS[s.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                Launched, ROI not yet scored
              </h3>
              <p className="mt-0.5 text-xs text-ink-faint">
                The Qualified+ pipeline the ROI review should chase.
              </p>
              {attention.launchedUnscored.length === 0 ? (
                <p className="mt-1.5 text-sm text-ink-muted">
                  Every launched record has complete ROI scoring.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {attention.launchedUnscored.map((s) => (
                    <li key={s.id} className="text-sm">
                      <Link
                        href={`/use-cases/${s.id}`}
                        className="hover:text-accent"
                      >
                        {s.title}
                      </Link>{" "}
                      <span className="text-ink-muted">
                        —{" "}
                        {s.roiStatus === "not_yet_measurable"
                          ? "not yet measurable"
                          : "measurement in progress"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
