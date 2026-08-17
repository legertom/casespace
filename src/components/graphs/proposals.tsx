/**
 * Five drawings the pipeline can't currently make, because each needs a
 * dimension the dashboard doesn't query yet — how long a record has stood
 * where it is, how the crowd moved week to week, whose team it belongs to.
 *
 * The shapes are real; the numbers behind them are derived from the same
 * seven counts as everything else on /graphs, deterministically, so the data
 * control still drives them. Every one of these is badged in the gallery so
 * nobody reads an illustrative figure as a measurement.
 */
import { STATUSES } from "@/lib/domain";
import { onRamp } from "@/lib/pipeline-ramp";
import { queueRanks, maxRankDepth } from "@/lib/platform-queue";
import {
  biggest,
  centre,
  describe,
  FAINT,
  Frame,
  HAIR,
  HAIR_STRONG,
  INK,
  MUTED,
  PAPER,
  QUEUE,
  RAMP,
  SHORT,
  SLOT,
  VIEW_W,
  wobble,
  type SpecimenProps,
} from "./specimens";

/** How long a record has stood where it is. Three buckets, not a gradient —
 *  "stale" is already a defined thing in the program (21 days). */
const DWELL = ["#ded6c7", "#b08a5a", "#8f6a1e"];
const DWELL_LABEL = ["under a week", "one to three weeks", "over 21 days"];

/**
 * A deterministic random source seeded from the counts themselves, so these
 * drawings change with the data control but never differ between the server
 * render and the client's.
 */
function rngFrom(n: number[]): () => number {
  let s = 2166136261;
  for (let i = 0; i < n.length; i++)
    s = Math.imul(s ^ (n[i] + i * 31 + 7), 16777619) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TRACK_Y = 30;

/* ------------------------------------------------------------------ 16 */

export function DwellPlatform({ n }: SpecimenProps) {
  const rand = rngFrom(n);
  const depth = maxRankDepth(n, QUEUE.perRank);
  const platformY = 60.6 + (depth - 1) * QUEUE.rowGap;
  // Later stages have had longer to accumulate long-waiters.
  const buckets = STATUSES.map((_, i) =>
    Array.from({ length: n[i] }, () => {
      const r = rand() + i * 0.05;
      return r > 0.78 ? 2 : r > 0.42 ? 1 : 0;
    }),
  );
  return (
    <Frame
      height={platformY + 74}
      label={`Platform queues shaded by how long each record has waited: ${describe(n)}`}
    >
      <line x1={14} y1={TRACK_Y} x2={VIEW_W - 14} y2={TRACK_Y} strokeWidth={8} strokeLinecap="round" stroke={INK} />
      {STATUSES.map((s, i) => {
        const cx = centre(i);
        const ranks = queueRanks(n[i], QUEUE.perRank);
        let placed = 0;
        return (
          <g key={s}>
            <line x1={cx} y1={TRACK_Y + 7} x2={cx} y2={platformY - 1} stroke={HAIR_STRONG} strokeWidth={1} />
            {ranks
              .map((inRank, r) => {
                const from = placed;
                placed += inRank;
                return { inRank, r, from };
              })
              .reverse()
              .map(({ inRank, r, from }) => {
                const feet = platformY - r * QUEUE.rowGap;
                const rowX =
                  cx - ((inRank - 1) * QUEUE.pitch) / 2 + (r % 2 ? QUEUE.pitch / 4 : -QUEUE.pitch / 4);
                return (
                  <g key={r}>
                    {Array.from({ length: inRank }, (_, j) => {
                      const x = rowX + j * QUEUE.pitch + wobble(i, r, j);
                      const tone = DWELL[buckets[i][from + j] ?? 0];
                      return (
                        <g key={j}>
                          <rect
                            x={x - QUEUE.bodyW / 2}
                            y={feet - QUEUE.bodyH}
                            width={QUEUE.bodyW}
                            height={QUEUE.bodyH}
                            rx={QUEUE.bodyW / 2}
                            fill={tone}
                            stroke={PAPER}
                            strokeWidth={0.85}
                          />
                          <circle cx={x} cy={feet - QUEUE.headDy} r={QUEUE.headR} fill={tone} stroke={PAPER} strokeWidth={0.85} />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            <rect x={cx - SLOT / 2 + 7} y={platformY} width={SLOT - 14} height={2.5} rx={1.25} fill={HAIR_STRONG} />
            <circle cx={cx} cy={TRACK_Y} r={7} fill={PAPER} stroke={RAMP[i]} strokeWidth={3.5} />
            <text x={cx} y={platformY + 24} fontSize={15} fontWeight={500} fill={n[i] ? INK : FAINT} textAnchor="middle" className="tabular-nums">
              {n[i]}
            </text>
            <text x={cx} y={platformY + 40} fontSize={10.5} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
          </g>
        );
      })}
      {DWELL.map((tone, i) => (
        <g key={tone}>
          <circle cx={22 + i * 132} cy={platformY + 60} r={3.4} fill={tone} />
          <rect x={20 + i * 132} y={platformY + 62} width={4.2} height={7} rx={2.1} fill={tone} />
          <text x={32 + i * 132} y={platformY + 69} fontSize={10.5} fill={FAINT}>
            {DWELL_LABEL[i]}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 17 */

const WEEKS = 8;

export function PipelineOverTime({ n }: SpecimenProps) {
  const rand = rngFrom(n);
  // Earlier weeks drift away from today's shape; the last row is today.
  const grid: number[][] = [];
  for (let w = 0; w < WEEKS - 1; w++) {
    const drift = (WEEKS - 1 - w) / WEEKS;
    grid.push(
      STATUSES.map((_, i) =>
        Math.max(0, Math.round(n[i] * (1 - drift * 0.55) + (rand() - 0.4) * drift * 6)),
      ),
    );
  }
  grid.push(n.slice());
  const max = Math.max(1, ...grid.flat());

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <caption className="sr-only">
          Records at each status, week by week, for the last {WEEKS} weeks
        </caption>
        <thead>
          <tr>
            <th className="w-20" />
            {SHORT.map((label) => (
              <th key={label} className="pb-2 text-center text-[0.62rem] font-normal text-ink-muted">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, w) => (
            <tr key={w}>
              <th scope="row" className="pr-3 text-right text-[0.68rem] font-normal tabular-nums text-ink-faint">
                {w === WEEKS - 1 ? "now" : `${WEEKS - 1 - w} wk`}
              </th>
              {row.map((v, i) => {
                const bucket = v ? Math.min(6, Math.floor((v / max) * 6.99)) : -1;
                return (
                  <td key={i} className="p-[1.5px]">
                    <div
                      className="flex h-6 items-center justify-center rounded-[3px] text-[0.66rem] tabular-nums"
                      style={{
                        backgroundColor: bucket < 0 ? "transparent" : RAMP[bucket],
                        border: bucket < 0 ? `1px dashed ${HAIR}` : "none",
                        color: bucket < 0 ? FAINT : onRamp(bucket),
                      }}
                    >
                      {v}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ 18 */

export function JourneyTracks({ n }: SpecimenProps) {
  const rand = rngFrom(n);
  const rows: { stage: number; dwell: number }[] = [];
  STATUSES.forEach((_, i) => {
    for (let j = 0; j < n[i]; j++) {
      const r = rand() + i * 0.05;
      rows.push({ stage: i, dwell: r > 0.78 ? 2 : r > 0.42 ? 1 : 0 });
    }
  });
  rows.sort((a, b) => a.stage - b.stage || b.dwell - a.dwell);

  const rowH = rows.length > 30 ? 6.4 : 9;
  const top = 26;
  const height = top + rows.length * rowH + 14;
  const x0 = 96;
  const span = VIEW_W - x0 - 24;
  const stationX = (i: number) => x0 + (span / 6) * i;

  return (
    <Frame height={height} label={`One track per record, marked at the station it is sitting at: ${describe(n)}`}>
      {STATUSES.map((s, i) => (
        <text key={s} x={stationX(i)} y={14} fontSize={9.5} fill={MUTED} textAnchor="middle">
          {SHORT[i]}
        </text>
      ))}
      {STATUSES.map((s, i) => (
        <line key={`v${s}`} x1={stationX(i)} y1={top - 6} x2={stationX(i)} y2={height - 12} stroke={HAIR} strokeWidth={1} />
      ))}
      {rows.map((row, k) => {
        const y = top + k * rowH + rowH / 2;
        return (
          <g key={k}>
            <line x1={x0} y1={y} x2={stationX(row.stage)} y2={y} stroke={HAIR_STRONG} strokeWidth={0.8} />
            <circle cx={stationX(row.stage)} cy={y} r={rowH > 7 ? 3.4 : 2.6} fill={DWELL[row.dwell]} />
          </g>
        );
      })}
      <text x={x0 - 10} y={top + 10} fontSize={9.5} fill={FAINT} textAnchor="end">
        {rows.length} records
      </text>
    </Frame>
  );
}

/* ------------------------------------------------------------------ 19 */

const TEAMS = [
  "Business Operations",
  "Product & Design",
  "Engineering",
  "Integration Engineering",
  "Technical Pre-sales",
  "POps",
];

export function StageByTeam({ n }: SpecimenProps) {
  const rand = rngFrom(n);
  const cells = TEAMS.map(() => STATUSES.map(() => 0));
  STATUSES.forEach((_, i) => {
    for (let j = 0; j < n[i]; j++) {
      cells[Math.floor(rand() * TEAMS.length)][i] += 1;
    }
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[540px] border-collapse text-left">
        <caption className="sr-only">Records by status and by team</caption>
        <thead>
          <tr>
            <th className="w-40" />
            {SHORT.map((label) => (
              <th key={label} className="pb-2 text-center text-[0.62rem] font-normal text-ink-muted">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TEAMS.map((team, t) => (
            <tr key={team} className="border-t border-hairline">
              <th scope="row" className="py-1.5 pr-3 text-[0.76rem] font-normal text-ink-muted">
                {team}
              </th>
              {cells[t].map((v, i) => (
                <td key={i} className="px-1 py-1.5 align-middle">
                  <span className="flex flex-wrap justify-center gap-[2px]">
                    {v === 0 ? (
                      <span className="text-[0.66rem] text-ink-faint">·</span>
                    ) : (
                      Array.from({ length: v }, (_, j) => (
                        <span
                          key={j}
                          className="size-[7px] rounded-[2px]"
                          style={{ backgroundColor: RAMP[i] }}
                        />
                      ))
                    )}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ 20 */

export function ArrivalsDepartures({ n }: SpecimenProps) {
  const rand = rngFrom(n);
  const inFlow = STATUSES.map((_, i) => Math.round(n[i] * (0.3 + rand() * 0.5)));
  const outFlow = STATUSES.map((_, i) =>
    i === 6 ? 0 : Math.round(n[i] * (0.15 + rand() * 0.45)),
  );
  const max = Math.max(1, ...inFlow, ...outFlow);
  const mid = 84;
  const arm = 34;
  const scale = arm / max;

  return (
    <Frame
      height={190}
      label={`Arrivals into and departures out of each stage over four weeks, against ${describe(n)}`}
    >
      <line x1={14} y1={TRACK_Y} x2={VIEW_W - 14} y2={TRACK_Y} strokeWidth={8} strokeLinecap="round" stroke={INK} />
      <line x1={20} y1={mid} x2={VIEW_W - 20} y2={mid} stroke={HAIR_STRONG} strokeWidth={1} />
      <text x={16} y={mid - arm - 6} fontSize={9.5} fill={FAINT}>
        arrived
      </text>
      <text x={16} y={mid + arm + 13} fontSize={9.5} fill={FAINT}>
        moved on
      </text>
      {STATUSES.map((s, i) => {
        const cx = centre(i);
        const up = Math.max(1.5, inFlow[i] * scale);
        const down = Math.max(1.5, outFlow[i] * scale);
        const stuck = outFlow[i] === 0 && n[i] > 0 && i !== 6;
        return (
          <g key={s}>
            <line x1={cx} y1={TRACK_Y + 7} x2={cx} y2={mid - arm - 12} stroke={HAIR_STRONG} strokeWidth={1} />
            <circle cx={cx} cy={TRACK_Y} r={7} fill={PAPER} stroke={RAMP[i]} strokeWidth={3.5} />
            <rect x={cx - 11} y={mid - up} width={22} height={up} rx={2} fill={RAMP[i]} />
            <rect x={cx - 11} y={mid} width={22} height={down} rx={2} fill={RAMP[i]} opacity={0.42} />
            <text x={cx} y={mid - up - 5} fontSize={11} fill={MUTED} textAnchor="middle" className="tabular-nums">
              {inFlow[i]}
            </text>
            <text x={cx} y={mid + down + 12} fontSize={11} fill={stuck ? "#8f6a1e" : MUTED} textAnchor="middle" className="tabular-nums">
              {outFlow[i]}
            </text>
            <text x={cx} y={mid + arm + 32} fontSize={10.5} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
            <text x={cx} y={mid + arm + 47} fontSize={12.5} fontWeight={500} fill={INK} textAnchor="middle" className="tabular-nums">
              {n[i]} here
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

export { biggest };
