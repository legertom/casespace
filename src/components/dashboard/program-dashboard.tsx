import Link from "next/link";
import {
  DEPARTMENT_LABELS,
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  TARGET_DOCUMENTED,
  TARGET_ROI,
  targetSumWarning,
} from "@/lib/domain";
import { fmtDateShort } from "@/lib/format";
import { getCurrentUser } from "@/lib/current-user";
import { parsePipelineChart } from "@/lib/pipeline-chart";
import { PIPELINE_RAMP } from "@/lib/pipeline-ramp";
import { maxRankDepth, queueRanks } from "@/lib/platform-queue";
import { PipelineConversion } from "./pipeline-conversion";
import { PipelineSwitcher } from "./pipeline-switcher";
import {
  getAttentionFlags,
  getCommunitySubmissions,
  getEltProgress,
  getMovement,
  getProgramCounts,
  getTeamCoverage,
  type EltProgressRow,
} from "@/server/dashboard-queries";
import { canManageProgram } from "@/lib/permissions";
import { STATUSES, type UcStatus } from "@/lib/domain";
import { PersonLinks } from "@/components/person-link";

/**
 * Platform-queue geometry, in viewBox units. A figure is the same size at
 * every station — a bigger crowd stands deeper, never smaller — so one
 * record looks like one record wherever it is in the pipeline.
 */
const QUEUE = {
  perRank: 8,
  pitch: 8.5,
  bodyW: 4.2,
  bodyH: 7,
  headR: 2.8,
  headDy: 9.6,
  rowGap: 6.4,
} as const;

const VIEW_W = 600;
const TRACK_Y = 30;
const SLOT = (VIEW_W - 40) / 7;

/** Sub-pixel wobble so a rank reads as people and not as a picket fence.
 *  Deterministic — a seeded jitter would differ between server and client. */
function wobble(stage: number, rank: number, i: number): number {
  return (((stage * 7 + rank * 13 + i * 5) % 5) - 2) * 0.3;
}

/**
 * The pipeline as a transit line: one station per status, and one standing
 * figure for every record waiting there now. Nothing here encodes how far
 * work got — only where it is sitting.
 */
function PipelineQueues({ byStatus }: { byStatus: Record<UcStatus, number> }) {
  const depth = maxRankDepth(
    STATUSES.map((s) => byStatus[s]),
    QUEUE.perRank,
  );
  const platformY = 60.6 + (depth - 1) * QUEUE.rowGap;
  const height = platformY + 56;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className="w-full min-w-[560px]"
        aria-hidden={false}
      >
        <line
          x1={14}
          y1={TRACK_Y}
          x2={VIEW_W - 14}
          y2={TRACK_Y}
          strokeWidth={8}
          strokeLinecap="round"
          className="stroke-ink"
        />
        {STATUSES.map((s, i) => {
          const n = byStatus[s];
          const cx = 20 + SLOT * i + SLOT / 2;
          const ranks = queueRanks(n, QUEUE.perRank);
          return (
            <Link
              key={s}
              href={`/use-cases?status=${s}`}
              className="group"
              aria-label={`${STATUS_LABELS[s]} — ${n} ${
                n === 1 ? "use case" : "use cases"
              }`}
            >
              {/* Whole column is the hit target; the marks are too thin to aim
                  at. Inset so neighbouring columns don't share an edge on
                  hover, and run past the label so descenders clear it. */}
              <rect
                x={cx - SLOT / 2 + 3}
                y={10}
                width={SLOT - 6}
                height={platformY + 40}
                rx={6}
                className="fill-transparent group-hover:fill-accent-wash"
              />
              <line
                x1={cx}
                y1={TRACK_Y + 7}
                x2={cx}
                y2={platformY - 1}
                strokeWidth={1}
                className="stroke-hairline-strong"
              />
              {ranks
                .map((inRank, r) => ({ inRank, r }))
                .reverse()
                .map(({ inRank, r }) => {
                  const feetY = platformY - r * QUEUE.rowGap;
                  const rowX =
                    cx -
                    ((inRank - 1) * QUEUE.pitch) / 2 +
                    (r % 2 ? QUEUE.pitch / 4 : -QUEUE.pitch / 4);
                  return (
                    <g key={r}>
                      {Array.from({ length: inRank }, (_, j) => {
                        const x = rowX + j * QUEUE.pitch + wobble(i, r, j);
                        return (
                          <g key={j}>
                            <rect
                              x={x - QUEUE.bodyW / 2}
                              y={feetY - QUEUE.bodyH}
                              width={QUEUE.bodyW}
                              height={QUEUE.bodyH}
                              rx={QUEUE.bodyW / 2}
                              fill={PIPELINE_RAMP[s]}
                              strokeWidth={0.85}
                              className="stroke-paper"
                            />
                            <circle
                              cx={x}
                              cy={feetY - QUEUE.headDy}
                              r={QUEUE.headR}
                              fill={PIPELINE_RAMP[s]}
                              strokeWidth={0.85}
                              className="stroke-paper"
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              <rect
                x={cx - SLOT / 2 + 7}
                y={platformY}
                width={SLOT - 14}
                height={2.5}
                rx={1.25}
                className="fill-hairline-strong"
              />
              <circle
                cx={cx}
                cy={TRACK_Y}
                r={7}
                stroke={PIPELINE_RAMP[s]}
                strokeWidth={3.5}
                className="fill-paper"
              />
              <text
                x={cx}
                y={platformY + 24}
                fontSize={15}
                fontWeight={500}
                textAnchor="middle"
                className={`tabular-nums ${n ? "fill-ink" : "fill-ink-faint"}`}
              >
                {n}
              </text>
              <text
                x={cx}
                y={platformY + 40}
                fontSize={10.5}
                textAnchor="middle"
                className="fill-ink-muted group-hover:fill-ink"
              >
                {STATUS_SHORT_LABELS[s]}
              </text>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}

function HeroNumber({
  label,
  actual,
  target,
  href,
  inFlight = 0,
  footnote,
}: {
  label: string;
  actual: number;
  target: number;
  href: string;
  /** Counted toward nothing yet, but real — drawn as a ghost segment so a
   *  headline of 0 never reads as "nothing is happening". */
  inFlight?: number;
  footnote?: string;
}) {
  const pct = Math.min(100, Math.round((actual / target) * 100));
  const inFlightPct = inFlight
    ? Math.max(2, Math.min(100 - pct, Math.round((inFlight / target) * 100)))
    : 0;
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
        aria-label={
          inFlight
            ? `${actual} of ${target}, plus ${inFlight} in flight`
            : `${actual} of ${target}`
        }
        className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-hairline"
      >
        <div
          className="h-full shrink-0 bg-accent"
          style={{ width: `${pct}%` }}
        />
        {inFlightPct > 0 && (
          <div
            className="h-full shrink-0 bg-accent/25"
            style={{ width: `${inFlightPct}%` }}
          />
        )}
      </div>
      {footnote && (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {footnote}
        </p>
      )}
    </Link>
  );
}

/**
 * Shade for one slot of an ELT owner's share, deepest first: counted toward
 * the 15, then Qualified awaiting ROI, then still in the pipeline. Same hue
 * throughout so the ramp reads as maturity rather than as categories.
 */
const ELT_SHADES = {
  confirmedRoi: "bg-st-confirmed",
  qualifiedInFlight: "bg-st-qualified",
  inPipeline: "bg-st-qualified/45",
  empty: "bg-hairline",
} as const;

function eltSlotClass(i: number, o: EltProgressRow, target: number): string {
  const cr = Math.min(o.confirmedRoi, target);
  const q = Math.min(o.qualifiedInFlight, target - cr);
  const p = Math.min(o.inPipeline, target - cr - q);
  if (i < cr) return ELT_SHADES.confirmedRoi;
  if (i < cr + q) return ELT_SHADES.qualifiedInFlight;
  if (i < cr + q + p) return ELT_SHADES.inPipeline;
  return ELT_SHADES.empty;
}

/** "0 of 3 · 1 in the pipeline" — the detail after the count, or nothing. */
function eltDetail(o: EltProgressRow): string | null {
  const parts: string[] = [];
  if (o.qualifiedInFlight > 0)
    parts.push(`${o.qualifiedInFlight} Qualified awaiting ROI confirmation`);
  if (o.inPipeline > 0) parts.push(`${o.inPipeline} in the pipeline`);
  return parts.length ? parts.join(" · ") : null;
}

/** e.g. "1 in flight — 1 has all four gates met, waiting on the Qualified gate." */
function inFlightNote(
  inFlight: number,
  readyForGate: number,
): string | undefined {
  if (inFlight === 0) return undefined;
  const lead = `${inFlight} in flight`;
  if (readyForGate === 0) return `${lead}, none through the four gates yet.`;
  const subject = readyForGate === 1 ? "1 has" : `${readyForGate} have`;
  return `${lead} — ${subject} all four gates met, waiting on the Qualified gate.`;
}

export async function ProgramDashboard() {
  const user = await getCurrentUser();
  const chart = parsePipelineChart(user?.pipelineChart);
  const [counts, elt, coverage, movement, attention, community] =
    await Promise.all([
      getProgramCounts(),
      getEltProgress(),
      getTeamCoverage(),
      getMovement(7),
      getAttentionFlags(),
      // The community queue is a list of decisions only an admin can make, so
      // it is chrome they alone see — not a fourth read exception: every record
      // on it is public in the casebook. Gate the fetch, not just the markup.
      // This reads the effective role, so an admin previewing as an employee
      // loses the card.
      canManageProgram(user?.role ?? "viewer")
        ? getCommunitySubmissions(5)
        : Promise.resolve(null),
    ]);

  const awaitingRoi = counts.byStatus.qualified;
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
            actual={counts.documented}
            target={TARGET_DOCUMENTED}
            inFlight={counts.inFlight}
            footnote={inFlightNote(counts.inFlight, counts.readyForGate)}
            // An empty filter is a dead end; send them to the real work instead.
            href={
              counts.documented > 0
                ? "/use-cases?status=documented"
                : "/use-cases"
            }
          />
          <HeroNumber
            label="Quantified, positive ROI — Confirmed"
            actual={counts.confirmedRoi}
            target={TARGET_ROI}
            inFlight={awaitingRoi}
            footnote={
              awaitingRoi
                ? `${awaitingRoi} Qualified ${awaitingRoi === 1 ? "record is" : "records are"} awaiting ROI confirmation.`
                : undefined
            }
            href={
              counts.confirmedRoi > 0
                ? "/use-cases?status=confirmed_positive_roi"
                : awaitingRoi > 0
                  ? "/use-cases?status=qualified"
                  : "/use-cases"
            }
          />
        </div>
      </section>

      {/* ------------------------------------------------ pipeline */}
      <section aria-label="Pipeline">
        <h2 className="font-serif text-2xl">The pipeline</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          All {counts.total} use cases by status. Click a stage to see its
          records.
        </p>
        <div className="mt-5">
          {/* Both drawings render here; the switcher shows one and remembers
              which, so the choice costs a click and never a page load. */}
          <PipelineSwitcher
            initial={chart}
            charts={{
              conversion: <PipelineConversion byStatus={counts.byStatus} />,
              platforms: <PipelineQueues byStatus={counts.byStatus} />,
            }}
          />
        </div>
      </section>

      {/* ------------------------------------------------ the 15 by ELT org */}
      <section aria-label="The 15 by ELT org">
        <h2 className="font-serif text-2xl">The 15, by ELT owner</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Confirmed Positive ROI counts against each owner&rsquo;s share of the
          15. Shades show how far along the rest is. Click an owner to see their
          records.
          {targetWarning && <span className="text-flag"> {targetWarning}</span>}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-faint">
          {[
            ["Counts toward the 15", ELT_SHADES.confirmedRoi],
            ["Qualified, ROI pending", ELT_SHADES.qualifiedInFlight],
            ["In the pipeline", ELT_SHADES.inPipeline],
          ].map(([caption, shade]) => (
            <li key={caption} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-[3px] ${shade}`} />
              {caption}
            </li>
          ))}
        </ul>
        <ul className="mt-5 space-y-1">
          {elt.map((o) => {
            const detail = eltDetail(o);
            return (
              <li key={o.name}>
                <Link
                  href={`/use-cases?elt=${o.id ?? "none"}`}
                  className="block rounded-md py-2 transition-colors hover:bg-surface"
                >
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
                      {o.confirmedRoi}
                      {o.target !== null ? ` of ${o.target}` : ""}
                      {detail && (
                        <span className="text-ink-faint"> · {detail}</span>
                      )}
                    </span>
                  </div>
                  {o.target !== null && (
                    <div
                      role="img"
                      aria-label={`${o.name}: ${o.confirmedRoi} of ${o.target} counted${detail ? `, ${detail}` : ""}`}
                      className="mt-1.5 flex h-2 gap-0.5"
                    >
                      {Array.from({ length: o.target }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-full flex-1 rounded-[3px] ${eltSlotClass(i, o, o.target!)}`}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
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
                  <td className="py-2 pr-4">
                    <PersonLinks
                      people={t.leads.map((l) => ({
                        displayName: l.name,
                        personId: l.personId,
                      }))}
                    />
                  </td>
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

      {/* ------------------------------------ community submissions */}
      {community && community.total > 0 && (
        <section aria-label="Community submissions">
          <h2 className="font-serif text-2xl">Community submissions</h2>
          <p className="mt-2 max-w-prose text-sm text-ink-muted">
            {community.total} {community.total === 1 ? "record" : "records"}{" "}
            logged outside the program. Nothing here counts toward the 45 or the
            15 until an admin says it does.
          </p>
          <ul className="mt-4 space-y-2.5">
            {community.recent.map((c) => (
              <li key={c.id} className="flex gap-3 text-sm">
                <span className="w-14 shrink-0 text-ink-faint">
                  {fmtDateShort(c.createdAt)}
                </span>
                <Link
                  href={`/use-cases/${c.id}`}
                  className="truncate hover:text-accent"
                >
                  {c.title}
                </Link>
                {c.ownerName && (
                  <span className="shrink-0 text-ink-faint">{c.ownerName}</span>
                )}
              </li>
            ))}
          </ul>
          <Link
            href="/use-cases?program=community"
            className="mt-4 inline-block text-sm text-accent underline underline-offset-2"
          >
            See all {community.total}.
          </Link>
        </section>
      )}

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
                        : m.reachedConfirmedRoi
                          ? "confirmed positive ROI — counts toward the 15"
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
                The pipeline of future confirmed wins the ROI review should
                chase.
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
