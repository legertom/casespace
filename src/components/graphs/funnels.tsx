/**
 * The pipeline restructured as a sales funnel, five ways — Kate's ask.
 *
 * Every one of these encodes **cumulative reach**: the width at a stage is
 * how many records are at that stage or beyond. Read the caveats in the
 * gallery's funnel section before reading the percentages; conversion here is
 * computed from a snapshot, not from the transitions in `status_changes`.
 */
import { STATUSES, STATUS_LABELS, STATUS_SHORT_LABELS, TARGET_DOCUMENTED, TARGET_ROI } from "@/lib/domain";
import { onRamp } from "@/lib/pipeline-ramp";
import { cumulativeReach } from "@/lib/pipeline-shapes";
import { maxRankDepth, queueRanks } from "@/lib/platform-queue";
import {
  centre,
  describe,
  FAINT,
  Frame,
  HAIR,
  INK,
  MUTED,
  PAPER,
  QUEUE,
  RAMP,
  SLOT,
  VIEW_W,
  wobble,
  type SpecimenProps,
} from "./specimens";

const FULL = STATUSES.map((s) => STATUS_LABELS[s]);
const SHORT = STATUSES.map((s) => STATUS_SHORT_LABELS[s]);
const STRONG = "#d4caba";
const FLAG = "#8f6a1e";

/** Step conversion into each stage, or null for the stage records enter at. */
function steps(reach: number[]): (number | null)[] {
  return reach.map((v, i) =>
    i === 0 || reach[i - 1] === 0 ? null : Math.round((v / reach[i - 1]) * 100),
  );
}

/* ------------------------------------------------------- A · tapered track */

export function TaperedTrack({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const conv = steps(reach);
  const thick = (v: number) => Math.max(2.5, (v / top) * 34);
  const depth = maxRankDepth(n, QUEUE.perRank);
  const platformY = 80 + (depth - 1) * QUEUE.rowGap;
  const cy = 44;

  return (
    <Frame
      height={platformY + 46}
      label={`Funnel laid sideways: track thickness falls from ${reach[0]} to ${reach[6]}, with figures waiting at each station. ${describe(n)}`}
    >
      <rect x={8} y={cy - thick(reach[0]) / 2} width={12 + SLOT / 2} height={thick(reach[0])} fill={RAMP[0]} />
      {STATUSES.slice(0, 6).map((s, i) => (
        <rect key={s} x={centre(i)} y={cy - thick(reach[i + 1]) / 2} width={SLOT} height={thick(reach[i + 1])} fill={RAMP[i + 1]} />
      ))}
      {STATUSES.map((s, i) => {
        const cx = centre(i);
        const ranks = queueRanks(n[i], QUEUE.perRank);
        return (
          <g key={s}>
            <line x1={cx} y1={cy + 21} x2={cx} y2={platformY - 1} stroke={STRONG} strokeWidth={1} />
            <circle cx={cx} cy={cy} r={7.5} fill={PAPER} stroke={RAMP[i]} strokeWidth={3} />
            {ranks
              .map((inRank, r) => ({ inRank, r }))
              .reverse()
              .map(({ inRank, r }) => {
                const feet = platformY - r * QUEUE.rowGap;
                const rowX = cx - ((inRank - 1) * QUEUE.pitch) / 2 + (r % 2 ? QUEUE.pitch / 4 : -QUEUE.pitch / 4);
                return (
                  <g key={r}>
                    {Array.from({ length: inRank }, (_, j) => {
                      const x = rowX + j * QUEUE.pitch + wobble(i, r, j);
                      return (
                        <g key={j}>
                          <rect x={x - QUEUE.bodyW / 2} y={feet - QUEUE.bodyH} width={QUEUE.bodyW} height={QUEUE.bodyH} rx={QUEUE.bodyW / 2} fill={RAMP[i]} stroke={PAPER} strokeWidth={0.85} />
                          <circle cx={x} cy={feet - QUEUE.headDy} r={QUEUE.headR} fill={RAMP[i]} stroke={PAPER} strokeWidth={0.85} />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            <rect x={cx - SLOT / 2 + 7} y={platformY} width={SLOT - 14} height={2.5} rx={1.25} fill={STRONG} />
            <text x={cx} y={platformY + 22} fontSize={14} fontWeight={500} fill={INK} textAnchor="middle" className="tabular-nums">
              {reach[i]}
            </text>
            <text x={cx} y={platformY + 36} fontSize={10} fill={MUTED} textAnchor="middle">
              {SHORT[i]}
            </text>
            {conv[i] !== null && (
              <text x={cx - SLOT / 2} y={cy - 26} fontSize={10} fill={FAINT} textAnchor="middle" className="tabular-nums">
                {conv[i]}%
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

/* ----------------------------------------------------- B · standing funnel */

export function StandingFunnel({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const conv = steps(reach);
  const bandH = 42;
  const cx = 286;
  const maxW = 286;
  const topY = 18;
  const pitch = Math.min(7.5, (maxW / top) * 0.9);

  return (
    <Frame height={topY + 7 * bandH + 16} label={`Upright funnel with waiting records standing inside each band. ${describe(n)}`}>
      {STATUSES.map((s, i) => {
        const w1 = Math.max(7, (reach[i] / top) * maxW);
        const w2 = Math.max(7, ((i < 6 ? reach[i + 1] : reach[6]) / top) * maxW);
        const yT = topY + i * bandH;
        const yB = yT + bandH;
        const half = ((n[i] - 1) * pitch) / 2;
        return (
          <g key={s}>
            <path
              d={`M${cx - w1 / 2},${yT} L${cx + w1 / 2},${yT} L${cx + w2 / 2},${yB} L${cx - w2 / 2},${yB} Z`}
              fill={RAMP[i]}
              stroke={PAPER}
              strokeWidth={1.5}
            />
            {Array.from({ length: n[i] }, (_, j) => {
              const fx = cx - half + j * pitch;
              return (
                <g key={j} opacity={0.82}>
                  <rect x={fx - 1.7} y={yB - 13} width={3.4} height={6} rx={1.7} fill={onRamp(i)} />
                  <circle cx={fx} cy={yB - 15.2} r={2.3} fill={onRamp(i)} />
                </g>
              );
            })}
            <text x={cx - maxW / 2 - 12} y={yT + bandH / 2 + 4} fontSize={11.5} fill={MUTED} textAnchor="end">
              {FULL[i]}
            </text>
            <text x={cx + maxW / 2 + 12} y={yT + bandH / 2 + 1} fontSize={15} fontWeight={500} fill={INK} className="tabular-nums">
              {reach[i]}
            </text>
            <text x={cx + maxW / 2 + 12} y={yT + bandH / 2 + 15} fontSize={10} fill={FAINT} className="tabular-nums">
              {conv[i] === null ? "entered here" : `${conv[i]}% of previous`}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------------ C · classic funnel */

export function ClassicFunnel({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const conv = steps(reach);
  const bandH = 36;
  const cx = 250;
  const maxW = 250;
  const topY = 16;

  return (
    <Frame height={topY + 7 * bandH + 14} label={`Classic funnel with conversion between stages. ${describe(n)}`}>
      {STATUSES.map((s, i) => {
        const w1 = Math.max(6, (reach[i] / top) * maxW);
        const w2 = Math.max(6, ((i < 6 ? reach[i + 1] : reach[6]) / top) * maxW);
        const y1 = topY + i * bandH;
        const y2 = y1 + bandH;
        return (
          <g key={s}>
            <path
              d={`M${cx - w1 / 2},${y1} L${cx + w1 / 2},${y1} L${cx + w2 / 2},${y2} L${cx - w2 / 2},${y2} Z`}
              fill={RAMP[i]}
              stroke={PAPER}
              strokeWidth={1.5}
            />
            <text x={cx} y={y1 + bandH / 2 + 5} fontSize={15} fontWeight={500} fill={onRamp(i)} textAnchor="middle" className="tabular-nums">
              {reach[i]}
            </text>
            <text x={cx - maxW / 2 - 12} y={y1 + bandH / 2 + 4} fontSize={12} fill={MUTED} textAnchor="end">
              {FULL[i]}
            </text>
            {conv[i] !== null && (
              <>
                <text x={cx + maxW / 2 + 14} y={y1 + 2} fontSize={12.5} fontWeight={500} fill={INK} className="tabular-nums">
                  {conv[i]}%
                </text>
                <text x={cx + maxW / 2 + 14} y={y1 + 15} fontSize={10} fill={FAINT}>
                  of {SHORT[i - 1]}
                </text>
                <text x={cx + maxW / 2 + 14} y={y1 + 27} fontSize={10} fill={FLAG} className="tabular-nums">
                  {reach[i - 1] - reach[i]} stopped here
                </text>
              </>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

/* --------------------------------------------------- D · conversion report */

export function ConversionReport({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const top = Math.max(1, reach[0]);
  const conv = steps(reach);
  const rowH = 30;
  // 184px of gutter: the longest status name measures 176px at 12px in the
  // app's font, and at 150 it ran off the left edge.
  const x0 = 196;
  const barW = 300;

  return (
    <Frame height={14 + 7 * rowH + 12} label={`Conversion report: records reaching each stage and the step conversion. ${describe(n)}`}>
      <text x={x0} y={10} fontSize={9.5} fill={FAINT}>
        reached this stage or beyond
      </text>
      <text x={VIEW_W - 10} y={10} fontSize={9.5} fill={FAINT} textAnchor="end">
        step
      </text>
      {STATUSES.map((s, i) => {
        const y = 14 + i * rowH;
        const w = Math.max(3, (reach[i] / top) * barW);
        const weak = conv[i] !== null && (conv[i] as number) < 60;
        return (
          <g key={s}>
            <text x={x0 - 12} y={y + 18} fontSize={12} fill={MUTED} textAnchor="end">
              {FULL[i]}
            </text>
            <rect x={x0} y={y + 5} width={barW} height={20} rx={3} fill={HAIR} opacity={0.5} />
            <rect x={x0} y={y + 5} width={w} height={20} rx={3} fill={RAMP[i]} />
            <text x={x0 + w + 7} y={y + 19} fontSize={13} fontWeight={500} fill={INK} className="tabular-nums">
              {reach[i]}
            </text>
            <text x={VIEW_W - 10} y={y + 19} fontSize={12} fill={weak ? FLAG : FAINT} textAnchor="end" className="tabular-nums">
              {conv[i] === null ? "—" : `${conv[i]}%`}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

/* ------------------------------------------------ E · funnel against target */

export function FunnelAgainstTarget({ n }: SpecimenProps) {
  const reach = cumulativeReach(n);
  const scale = Math.max(reach[0], TARGET_DOCUMENTED, 1);
  const bandH = 34;
  const cx = 280;
  const maxW = 280;
  const topY = 26;

  return (
    <Frame
      height={topY + 7 * bandH + 16}
      label={`The funnel drawn against the ${TARGET_DOCUMENTED} and ${TARGET_ROI} targets rather than against today. ${describe(n)}`}
    >
      <text x={cx} y={14} fontSize={10} fill={FAINT} textAnchor="middle">
        drawn against the {TARGET_DOCUMENTED}, not against today
      </text>
      {STATUSES.map((s, i) => {
        const w1 = Math.max(5, (reach[i] / scale) * maxW);
        const w2 = Math.max(5, ((i < 6 ? reach[i + 1] : reach[6]) / scale) * maxW);
        const y1 = topY + i * bandH;
        const y2 = y1 + bandH;
        const target = i === 5 ? TARGET_DOCUMENTED : i === 6 ? TARGET_ROI : null;
        const tw = target ? (target / scale) * maxW : 0;
        return (
          <g key={s}>
            <path
              d={`M${cx - w1 / 2},${y1} L${cx + w1 / 2},${y1} L${cx + w2 / 2},${y2} L${cx - w2 / 2},${y2} Z`}
              fill={RAMP[i]}
              stroke={PAPER}
              strokeWidth={1.5}
            />
            <text x={cx - maxW / 2 - 12} y={y1 + bandH / 2 + 4} fontSize={11.5} fill={MUTED} textAnchor="end">
              {FULL[i]}
            </text>
            <text x={cx + maxW / 2 + 14} y={y1 + bandH / 2 + 4} fontSize={14} fontWeight={500} fill={INK} className="tabular-nums">
              {reach[i]}
            </text>
            {target !== null && (
              <>
                <rect x={cx - tw / 2} y={y1 + 1} width={tw} height={bandH - 2} fill="none" stroke={FLAG} strokeWidth={1.5} strokeDasharray="4 3" />
                <text x={cx + tw / 2 + 6} y={y1 + 12} fontSize={10} fill={FLAG} className="tabular-nums">
                  target {target}
                </text>
              </>
            )}
          </g>
        );
      })}
    </Frame>
  );
}
