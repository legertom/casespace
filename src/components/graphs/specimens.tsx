/**
 * The pipeline, drawn sixteen ways. Every specimen takes the same seven
 * counts and nothing else, so the gallery's data control drives all of them
 * at once and they can be compared honestly.
 *
 * These are review drawings, not the shipped chart — they carry no links.
 * The one that shipped lives in components/dashboard/program-dashboard.tsx.
 */
import { STATUSES, STATUS_LABELS, STATUS_SHORT_LABELS } from "@/lib/domain";
import { onRamp, PIPELINE_RAMP } from "@/lib/pipeline-ramp";
import { cumulativeReach } from "@/lib/pipeline-shapes";
import { maxRankDepth, queueRanks } from "@/lib/platform-queue";

export interface SpecimenProps {
  /** One count per status, in STATUSES order. */
  n: number[];
}

const RAMP = STATUSES.map((s) => PIPELINE_RAMP[s]);
const FULL = STATUSES.map((s) => STATUS_LABELS[s]);
const SHORT = STATUSES.map((s) => STATUS_SHORT_LABELS[s]);

const PAPER = "#faf8f3";
const INK = "#22201c";
const MUTED = "#5c564c";
const FAINT = "#8b8377";
const HAIR = "#e5ded1";
const HAIR_STRONG = "#d4caba";
const WASH = "#f6e9e1";
const WASH_DEEP = "#eddac9";

const VIEW_W = 600;
const SLOT = (VIEW_W - 40) / 7;
const BAND = (VIEW_W - 16) / 7;

const biggest = (n: number[]) => Math.max(1, ...n);
const centre = (i: number) => 20 + SLOT * i + SLOT / 2;

function Frame({
  height,
  label,
  children,
}: {
  height: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${height}`}
      role="img"
      aria-label={label}
      className="block h-auto w-full"
    >
      {children}
    </svg>
  );
}

/** "6 in In Discovery, 1 in Approved…" — the alt text every specimen shares. */
export function describe(n: number[]): string {
  return n.map((v, i) => `${v} at ${FULL[i].toLowerCase()}`).join(", ");
}

/* ------------------------------------------------------------------ 00 */

export function OriginalBars({ n }: SpecimenProps) {
  const max = biggest(n);
  return (
    <ul className="space-y-2">
      {STATUSES.map((s, i) => (
        <li
          key={s}
          className="grid grid-cols-[11rem_1fr_2.5rem] items-center gap-3"
        >
          <span className="text-right text-sm text-ink-muted">{FULL[i]}</span>
          <span className="h-6 overflow-hidden rounded-r-[4px]">
            <span
              className="block h-full rounded-r-[4px]"
              style={{
                width: `${Math.max(1.5, (n[i] / max) * 100)}%`,
                backgroundColor: RAMP[i],
              }}
            />
          </span>
          <span className="text-sm font-semibold tabular-nums">{n[i]}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ 01 */

export function AttritionRibbon({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  return (
    <Frame height={148} label={`Ribbon narrowing from ${reach[0]} to ${reach[6]}`}>
      {STATUSES.map((s, i) => {
        const xL = 8 + i * BAND;
        const tL = Math.max(1.2, (reach[i] / top) * 46);
        const tR = Math.max(1.2, ((i < 6 ? reach[i + 1] : reach[6]) / top) * 46);
        return (
          <g key={s}>
            <path
              d={`M${xL},${54 - tL} L${xL + BAND},${54 - tR} L${xL + BAND},${54 + tR} L${xL},${54 + tL} Z`}
              fill={RAMP[i]}
              stroke={PAPER}
              strokeWidth={2}
            />
            <text x={xL + BAND / 2} y={123} fontSize={10.5} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
            <text
              x={xL + BAND / 2}
              y={139}
              fontSize={13}
              fontWeight={500}
              fill={INK}
              textAnchor="middle"
              className="tabular-nums"
            >
              {reach[i]}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 02 */

export function UnitMarks({ n }: SpecimenProps) {
  return (
    <ul className="space-y-1">
      {STATUSES.map((s, i) => (
        <li
          key={s}
          className="grid grid-cols-[12.5rem_1fr_2rem] items-center gap-3 py-0.5"
        >
          <span className="text-right text-[0.8rem] text-ink-muted">{FULL[i]}</span>
          <span className="flex min-h-3.5 flex-wrap items-center gap-1">
            {n[i] === 0 ? (
              <span className="text-xs text-ink-faint">&mdash;</span>
            ) : (
              Array.from({ length: n[i] }, (_, j) => (
                <span
                  key={j}
                  className="size-3.5 rounded-[3px]"
                  style={{ backgroundColor: RAMP[i] }}
                />
              ))
            )}
          </span>
          <span className="text-right text-[0.8rem] font-medium tabular-nums">
            {n[i]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ 03 */

export function StageStrip({ n }: SpecimenProps) {
  return (
    <ul className="grid grid-cols-7 gap-1.5">
      {STATUSES.map((s, i) => (
        <li
          key={s}
          className="rounded-md px-2 pb-2.5 pt-2.5"
          style={{ backgroundColor: RAMP[i], color: onRamp(i) }}
        >
          <span className="block font-serif text-2xl leading-none tabular-nums">
            {n[i]}
          </span>
          <span className="mt-1.5 block text-[0.62rem] opacity-80">{SHORT[i]}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ 04 */

export function RuledTable({ n }: SpecimenProps) {
  const max = biggest(n);
  const total = n.reduce((a, b) => a + b, 0);
  return (
    <ul className="border-t border-hairline">
      {STATUSES.map((s, i) => (
        <li
          key={s}
          className="grid grid-cols-[1fr_2.2rem_5.5rem_2.6rem] items-center gap-3.5 border-b border-hairline px-0.5 py-2.5"
        >
          <span className="text-[0.83rem]">{FULL[i]}</span>
          <span className="text-right font-serif text-lg tabular-nums">{n[i]}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-hairline">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(n[i] / max) * 100}%`, backgroundColor: RAMP[i] }}
            />
          </span>
          <span className="text-right text-[0.72rem] tabular-nums text-ink-faint">
            {total ? Math.round((n[i] / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ 05 */

export function JourneyBeeswarm({ n }: SpecimenProps) {
  const max = biggest(n);
  const r = max > 12 ? 4 : 4.8;
  const step = r * 2 + 3;
  const base = 20 + max * step;
  return (
    <Frame height={base + 26} label={`Each record as a dot above its stage: ${describe(n)}`}>
      {STATUSES.map((s, i) => (
        <g key={s}>
          {n[i] === 0 ? (
            <circle cx={centre(i)} cy={base - r - 2} r={r} fill="none" stroke={HAIR} strokeWidth={1.5} />
          ) : (
            Array.from({ length: n[i] }, (_, j) => (
              <circle
                key={j}
                cx={centre(i)}
                cy={base - r - 2 - j * step}
                r={r}
                fill={RAMP[i]}
                stroke={PAPER}
                strokeWidth={1.5}
              />
            ))
          )}
          <text x={centre(i)} y={base + 18} fontSize={10.5} fill={MUTED} textAnchor="middle">
            {SHORT[i]}
          </text>
        </g>
      ))}
      <line x1={12} y1={base} x2={VIEW_W - 12} y2={base} stroke={HAIR} strokeWidth={1} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ 06 */

export function SubwayLine({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const thick = (v: number) => Math.max(2, (v / top) * 26);
  const max = biggest(n);
  const r = 3.8;
  const step = r * 2 + 3.5;
  const perRow = 4;
  const rows = Math.max(1, Math.ceil(max / perRow));
  const platform = 66;
  const block = rows * step;
  return (
    <Frame height={platform + block + 40} label={`Subway line: ${describe(n)}`}>
      <rect x={8} y={42 - thick(reach[0]) / 2} width={12 + SLOT / 2} height={thick(reach[0])} fill={RAMP[0]} />
      {STATUSES.slice(0, 6).map((s, i) => (
        <rect
          key={s}
          x={centre(i)}
          y={42 - thick(reach[i + 1]) / 2}
          width={SLOT}
          height={thick(reach[i + 1])}
          fill={RAMP[i + 1]}
        />
      ))}
      {STATUSES.map((s, i) => (
        <g key={s}>
          <line x1={centre(i)} y1={52} x2={centre(i)} y2={platform - 2} stroke={HAIR_STRONG} strokeWidth={1} />
          <circle cx={centre(i)} cy={42} r={8} fill={PAPER} stroke={RAMP[i]} strokeWidth={3} />
          {Array.from({ length: n[i] }, (_, j) => {
            const row = Math.floor(j / perRow);
            const inRow = Math.min(perRow, n[i] - row * perRow);
            return (
              <circle
                key={j}
                cx={centre(i) - ((inRow - 1) * step) / 2 + (j % perRow) * step}
                cy={platform + r + row * step}
                r={r}
                fill={RAMP[i]}
              />
            );
          })}
          <text x={centre(i)} y={platform + block + 16} fontSize={10.5} fill={MUTED} textAnchor="middle">
            {SHORT[i]}
          </text>
          <text
            x={centre(i)}
            y={platform + block + 31}
            fontSize={13}
            fontWeight={500}
            fill={INK}
            textAnchor="middle"
            className="tabular-nums"
          >
            {n[i]}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/* --------------------------------------------------------------- 07, 14 */

function VerticalRoute({ n, tapered }: SpecimenProps & { tapered: boolean }) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const thick = (v: number) => Math.max(2, (v / top) * 26);
  const gap = tapered ? 48 : 46;
  const height = 26 + gap * 6 + 28;
  return (
    <Frame
      height={height}
      label={`Vertical route with full stage names: ${describe(n)}`}
    >
      {tapered ? (
        <>
          <rect x={44 - thick(reach[0]) / 2} y={6} width={thick(reach[0])} height={20} fill={RAMP[0]} />
          {STATUSES.slice(0, 6).map((s, i) => (
            <rect
              key={s}
              x={44 - thick(reach[i + 1]) / 2}
              y={26 + gap * i}
              width={thick(reach[i + 1])}
              height={gap}
              fill={RAMP[i + 1]}
            />
          ))}
        </>
      ) : (
        <rect x={40} y={14} width={8} height={gap * 6 + 24} rx={4} fill={INK} />
      )}
      {STATUSES.map((s, i) => {
        const y = 26 + gap * i;
        return (
          <g key={s}>
            {!tapered && i === 6 && (
              <circle cx={44} cy={y} r={12.5} fill="none" stroke={INK} strokeWidth={1.5} />
            )}
            <circle cx={44} cy={y} r={8} fill={PAPER} stroke={RAMP[i]} strokeWidth={3.5} />
            <text x={76} y={y - 2} fontSize={13} fill={INK}>
              {FULL[i]}
            </text>
            {n[i] === 0 ? (
              <text x={76} y={y + 15} fontSize={11} fill={FAINT}>
                nobody waiting
              </text>
            ) : (
              Array.from({ length: n[i] }, (_, j) => (
                <circle key={j} cx={80 + j * 11} cy={y + 11} r={4} fill={RAMP[i]} />
              ))
            )}
            <text
              x={VIEW_W - 8}
              y={y + 4}
              fontSize={17}
              fontWeight={500}
              fill={n[i] ? INK : FAINT}
              textAnchor="end"
              className="tabular-nums"
            >
              {n[i]}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

export function TaperedRoute({ n }: SpecimenProps) {
  return <VerticalRoute n={n} tapered />;
}
export function UniformRoute({ n }: SpecimenProps) {
  return <VerticalRoute n={n} tapered={false} />;
}

/* ------------------------------------------------------------------ 08 */

export function RibbonWithPlatforms({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const scale = 46 / biggest(n);
  return (
    <Frame height={163} label={`Tapering ribbon with a pool under each stage: ${describe(n)}`}>
      {STATUSES.map((s, i) => {
        const xL = 8 + i * BAND;
        const uL = Math.max(1.2, (reach[i] / top) * 21);
        const uR = Math.max(1.2, ((i < 6 ? reach[i + 1] : reach[6]) / top) * 21);
        return (
          <path
            key={s}
            d={`M${xL},${44 - uL} L${xL + BAND},${44 - uR} L${xL + BAND},${44 + uR} L${xL},${44 + uL} Z`}
            fill={RAMP[i]}
            stroke={PAPER}
            strokeWidth={2}
          />
        );
      })}
      {STATUSES.map((s, i) => {
        const mx = 8 + i * BAND + BAND / 2;
        return (
          <g key={s}>
            <line x1={mx} y1={63} x2={mx} y2={73} stroke={HAIR_STRONG} strokeWidth={1} />
            {n[i] > 0 ? (
              <rect x={mx - 9} y={73} width={18} height={Math.max(4, n[i] * scale)} rx={4} fill={RAMP[i]} />
            ) : (
              <line x1={mx - 9} y1={73} x2={mx + 9} y2={73} stroke={HAIR} strokeWidth={2} />
            )}
            <text x={mx} y={139} fontSize={10.5} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
            <text x={mx} y={154} fontSize={13} fontWeight={500} fill={INK} textAnchor="middle" className="tabular-nums">
              {n[i]}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 09 */

export function LockStaircase({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const max = biggest(n);
  const chamber = SLOT - 10;
  return (
    <Frame height={166} label={`Canal locks, each chamber holding: ${describe(n)}`}>
      {STATUSES.map((s, i) => {
        const lx = 20 + SLOT * i + 5;
        const floor = 132 - i * 13;
        const water = n[i] ? Math.max(4, (n[i] / max) * 48) : 0;
        return (
          <g key={s}>
            <path
              d={`M${lx},${floor - 58} L${lx},${floor} L${lx + chamber},${floor} L${lx + chamber},${floor - 58}`}
              fill="none"
              stroke={HAIR_STRONG}
              strokeWidth={1.25}
            />
            {water > 0 && (
              <rect x={lx + 1.5} y={floor - water} width={chamber - 3} height={water} fill={RAMP[i]} />
            )}
            <text
              x={lx + chamber / 2}
              y={floor - water - 6}
              fontSize={13}
              fontWeight={500}
              fill={n[i] ? INK : FAINT}
              textAnchor="middle"
              className="tabular-nums"
            >
              {n[i]}
            </text>
            <text x={lx + chamber / 2} y={154} fontSize={10.5} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
            {i < 6 && (
              <>
                <line x1={lx + chamber + 5} y1={floor - 60} x2={lx + chamber + 5} y2={floor} stroke={INK} strokeWidth={2} />
                <text x={lx + chamber + 5} y={floor - 66} fontSize={10.5} fill={FAINT} textAnchor="middle" className="tabular-nums">
                  {reach[i + 1]}
                </text>
              </>
            )}
          </g>
        );
      })}
      <line x1={12} y1={133} x2={VIEW_W - 12} y2={133} stroke={HAIR} strokeWidth={1} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ 10 */

export function CoreSample({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const total = Math.max(1, n.reduce((a, b) => a + b, 0));
  const cell = Math.min(20, 300 / total);
  const x0 = 176;
  const width = 64;
  const topY = 14;
  const bottom = topY + cell * total;

  const labels: { i: number; anchor: number; y: number; boundary: number }[] = [];
  const blocks: React.ReactNode[] = [];
  let stacked = 0;
  for (let i = 6; i >= 0; i--) {
    const blockTop = topY + stacked * cell;
    if (n[i] === 0) {
      blocks.push(
        <line key={`e${i}`} x1={x0} y1={blockTop} x2={x0 + width} y2={blockTop} stroke={HAIR} strokeWidth={1.5} strokeDasharray="3 3" />,
      );
    }
    for (let j = 0; j < n[i]; j++) {
      blocks.push(
        <rect
          key={`${i}-${j}`}
          x={x0}
          y={blockTop + j * cell + 0.75}
          width={width}
          height={Math.max(2, cell - 1.5)}
          rx={cell > 7 ? 3 : 1}
          fill={RAMP[i]}
        />,
      );
    }
    const mid = blockTop + (n[i] * cell) / 2;
    labels.push({ i, anchor: mid, y: mid, boundary: topY + (stacked + n[i]) * cell });
    stacked += n[i];
  }
  for (let k = 1; k < labels.length; k++) {
    if (labels[k].y < labels[k - 1].y + 18) labels[k].y = labels[k - 1].y + 18;
  }

  return (
    <Frame height={bottom + 22} label={`A column of ${total} cells stacked by stage: ${describe(n)}`}>
      {blocks}
      <text x={x0 - 60} y={topY - 2} fontSize={11} fill={FAINT} textAnchor="end">
        reached
      </text>
      {labels.map((l) => {
        const lx = x0 + width + 4;
        return (
          <g key={l.i}>
            <polyline
              points={`${lx},${l.anchor} ${lx + 10},${l.anchor} ${lx + 16},${l.y} ${lx + 24},${l.y}`}
              fill="none"
              stroke={HAIR}
              strokeWidth={1}
            />
            <text x={lx + 30} y={l.y + 4} fontSize={12.5} fill={n[l.i] ? INK : FAINT}>
              {FULL[l.i]}
            </text>
            <text x={x0 - 10} y={l.anchor + 4} fontSize={13} fontWeight={500} fill={n[l.i] ? INK : FAINT} textAnchor="end" className="tabular-nums">
              {n[l.i]}
            </text>
            <line x1={x0 - 56} y1={l.boundary} x2={x0 - 4} y2={l.boundary} stroke={HAIR} strokeWidth={1} />
            <text x={x0 - 60} y={l.boundary + 4} fontSize={11} fill={FAINT} textAnchor="end" className="tabular-nums">
              {reach[l.i]}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 11 */

const BECK_X = [40, 125, 210, 295, 355, 440, 525];
const BECK_Y = [58, 58, 58, 58, 118, 118, 118];

export function BeckDiagram({ n }: SpecimenProps) {
  const max = biggest(n);
  return (
    <Frame height={178} label={`Underground-style line, each station sized by its crowd: ${describe(n)}`}>
      <polyline
        points="40,58 295,58 355,118 525,118"
        fill="none"
        stroke={INK}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {STATUSES.map((s, i) => {
        const r = n[i] ? 9.5 + (n[i] / max) * 11.5 : 6;
        return (
          <g key={s}>
            {i === 6 && <circle cx={BECK_X[i]} cy={BECK_Y[i]} r={r + 5} fill="none" stroke={INK} strokeWidth={1.5} />}
            {n[i] === 0 ? (
              <circle cx={BECK_X[i]} cy={BECK_Y[i]} r={6} fill={PAPER} stroke={HAIR_STRONG} strokeWidth={2} />
            ) : (
              <>
                <circle cx={BECK_X[i]} cy={BECK_Y[i]} r={r} fill={RAMP[i]} stroke={PAPER} strokeWidth={2.5} />
                <text
                  x={BECK_X[i]}
                  y={BECK_Y[i] + 4.6}
                  fontSize={Math.max(11, Math.min(14, r * 0.9))}
                  fontWeight={500}
                  fill={onRamp(i)}
                  textAnchor="middle"
                  className="tabular-nums"
                >
                  {n[i]}
                </text>
              </>
            )}
            <text x={BECK_X[i]} y={i < 4 ? 22 : 160} fontSize={11} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------------------ 12 */

export const QUEUE = {
  perRank: 8,
  pitch: 8.5,
  bodyW: 4.2,
  bodyH: 7,
  headR: 2.8,
  headDy: 9.6,
  rowGap: 6.4,
} as const;

const TRACK_Y = 30;

/** Deterministic sub-pixel wobble, so a rank reads as people, not a fence. */
export function wobble(stage: number, rank: number, i: number): number {
  return (((stage * 7 + rank * 13 + i * 5) % 5) - 2) * 0.3;
}

export function PlatformQueues({ n }: SpecimenProps) {
  const depth = maxRankDepth(n, QUEUE.perRank);
  const platformY = 60.6 + (depth - 1) * QUEUE.rowGap;
  return (
    <Frame
      height={platformY + 56}
      label={`Platform queues, one standing figure per waiting record: ${describe(n)}`}
    >
      <line x1={14} y1={TRACK_Y} x2={VIEW_W - 14} y2={TRACK_Y} strokeWidth={8} strokeLinecap="round" stroke={INK} />
      {STATUSES.map((s, i) => {
        const cx = centre(i);
        const ranks = queueRanks(n[i], QUEUE.perRank);
        return (
          <g key={s}>
            <line x1={cx} y1={TRACK_Y + 7} x2={cx} y2={platformY - 1} stroke={HAIR_STRONG} strokeWidth={1} />
            {ranks
              .map((inRank, r) => ({ inRank, r }))
              .reverse()
              .map(({ inRank, r }) => {
                const feet = platformY - r * QUEUE.rowGap;
                const rowX =
                  cx - ((inRank - 1) * QUEUE.pitch) / 2 + (r % 2 ? QUEUE.pitch / 4 : -QUEUE.pitch / 4);
                return (
                  <g key={r}>
                    {Array.from({ length: inRank }, (_, j) => {
                      const x = rowX + j * QUEUE.pitch + wobble(i, r, j);
                      return (
                        <g key={j}>
                          <rect
                            x={x - QUEUE.bodyW / 2}
                            y={feet - QUEUE.bodyH}
                            width={QUEUE.bodyW}
                            height={QUEUE.bodyH}
                            rx={QUEUE.bodyW / 2}
                            fill={RAMP[i]}
                            stroke={PAPER}
                            strokeWidth={0.85}
                          />
                          <circle cx={x} cy={feet - QUEUE.headDy} r={QUEUE.headR} fill={RAMP[i]} stroke={PAPER} strokeWidth={0.85} />
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
    </Frame>
  );
}

/* ------------------------------------------------------------------ 13 */

export function CrowdingMap({ n }: SpecimenProps) {
  const max = biggest(n);
  return (
    <Frame height={156} label={`Uniform line, each station shaded by congestion: ${describe(n)}`}>
      <line x1={20} y1={64} x2={VIEW_W - 20} y2={64} stroke={INK} strokeWidth={6} strokeLinecap="round" />
      {STATUSES.map((s, i) => {
        const x = 40 + i * (520 / 6);
        const bucket = n[i] ? Math.min(6, Math.floor((n[i] / max) * 6.99)) : -1;
        return (
          <g key={s}>
            {bucket < 0 ? (
              <>
                <circle cx={x} cy={64} r={20} fill={PAPER} stroke={HAIR_STRONG} strokeWidth={1.5} strokeDasharray="3 3" />
                <text x={x} y={69} fontSize={14} fontWeight={500} fill={FAINT} textAnchor="middle" className="tabular-nums">
                  0
                </text>
              </>
            ) : (
              <>
                <circle cx={x} cy={64} r={21} fill={RAMP[bucket]} stroke={PAPER} strokeWidth={3} />
                <text x={x} y={69} fontSize={15} fontWeight={500} fill={onRamp(bucket)} textAnchor="middle" className="tabular-nums">
                  {n[i]}
                </text>
              </>
            )}
            <text x={x} y={106} fontSize={10.5} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
          </g>
        );
      })}
      <text x={20} y={140} fontSize={11} fill={FAINT}>
        quiet
      </text>
      {RAMP.map((c, i) => (
        <rect key={c} x={56 + i * 15} y={130} width={13} height={9} rx={2} fill={c} />
      ))}
      <text x={168} y={140} fontSize={11} fill={FAINT}>
        busy
      </text>
    </Frame>
  );
}

/* ------------------------------------------------------------------ 15 */

export function ZonedMap({ n }: SpecimenProps) {
  const zx = STATUSES.map((_, i) => 46 + i * (508 / 6));
  return (
    <Frame height={162} label={`Line map with fare zones marking the two counting rules: ${describe(n)}`}>
      <rect x={zx[5] - 40} y={50} width={zx[6] - zx[5] + 80} height={84} rx={12} fill={WASH} />
      <rect x={zx[6] - 36} y={56} width={72} height={72} rx={10} fill={WASH_DEEP} />
      <text x={zx[5] - 40} y={42} fontSize={11.5} fill={MUTED}>
        Documented · {n[5] + n[6]}
      </text>
      <text x={zx[6] + 36} y={148} fontSize={11.5} fill={MUTED} textAnchor="end">
        The 15 · {n[6]}
      </text>
      <line x1={20} y1={92} x2={VIEW_W - 20} y2={92} stroke={INK} strokeWidth={7} strokeLinecap="round" />
      {STATUSES.map((s, i) => (
        <g key={s}>
          <circle cx={zx[i]} cy={92} r={16} fill={RAMP[i]} stroke={PAPER} strokeWidth={3} />
          <text x={zx[i]} y={96.5} fontSize={12.5} fontWeight={500} fill={onRamp(i)} textAnchor="middle" className="tabular-nums">
            {n[i]}
          </text>
          <text x={zx[i]} y={126} fontSize={10.5} fill={MUTED} textAnchor="middle">
            {SHORT[i]}
          </text>
        </g>
      ))}
    </Frame>
  );
}

export { Frame, RAMP, SHORT, FULL, PAPER, INK, MUTED, FAINT, HAIR, HAIR_STRONG, SLOT, VIEW_W, centre, biggest };
