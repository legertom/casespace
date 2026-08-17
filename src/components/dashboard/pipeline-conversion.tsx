import Link from "next/link";
import { STATUSES, STATUS_LABELS, type UcStatus } from "@/lib/domain";
import { PIPELINE_RAMP } from "@/lib/pipeline-ramp";
import { cumulativeReach } from "@/lib/pipeline-shapes";

const VIEW_W = 600;
const ROW_H = 32;
const LABEL_R = 184;
const BAR_X = 196;
const BAR_W = 300;

const HAIR = "#e5ded1";
const INK = "#22201c";
const MUTED = "#5c564c";
const FAINT = "#8b8377";
const FLAG = "#8f6a1e";

/** Below this, a step is worth noticing rather than glancing past. */
const WEAK_STEP = 60;

/**
 * The pipeline as a conversion report: bar length is how many records reached
 * that stage **or any stage beyond it**, with the step conversion from the
 * stage above.
 *
 * Each bar is two-tone on purpose. The solid part is how many are sitting at
 * that stage right now — which is exactly what the row links to — and the pale
 * remainder is the ones already further along. A single-tone bar would show
 * one number and hand you a different one on click.
 */
export function PipelineConversion({
  byStatus,
}: {
  byStatus: Record<UcStatus, number>;
}) {
  const counts = STATUSES.map((s) => byStatus[s]);
  const reach = cumulativeReach(counts);
  const top = Math.max(1, reach[0]);
  const height = 16 + STATUSES.length * ROW_H + 10;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VIEW_W} ${height}`} className="w-full min-w-[560px]">
        <text x={BAR_X} y={10} fontSize={9.5} fill={FAINT}>
          solid = here now · pale = reached it or beyond
        </text>
        <text x={VIEW_W - 8} y={10} fontSize={9.5} fill={FAINT} textAnchor="end">
          step
        </text>
        {STATUSES.map((s, i) => {
          const y = 16 + i * ROW_H;
          const reached = Math.max(3, (reach[i] / top) * BAR_W);
          const here = (counts[i] / top) * BAR_W;
          const step =
            i === 0 || reach[i - 1] === 0
              ? null
              : Math.round((reach[i] / reach[i - 1]) * 100);
          const weak = step !== null && step < WEAK_STEP;
          return (
            <Link
              key={s}
              href={`/use-cases?status=${s}`}
              className="group"
              aria-label={`${STATUS_LABELS[s]} — ${counts[i]} here now, ${reach[i]} reached this stage or beyond`}
            >
              <rect
                x={4}
                y={y + 1}
                width={VIEW_W - 8}
                height={ROW_H - 4}
                rx={5}
                className="fill-transparent group-hover:fill-accent-wash"
              />
              <text
                x={LABEL_R}
                y={y + 19}
                fontSize={12}
                textAnchor="end"
                className="fill-ink-muted group-hover:fill-ink"
              >
                {STATUS_LABELS[s]}
              </text>
              <rect x={BAR_X} y={y + 6} width={BAR_W} height={20} rx={3} fill={HAIR} opacity={0.55} />
              <rect x={BAR_X} y={y + 6} width={reached} height={20} rx={3} fill={PIPELINE_RAMP[s]} opacity={0.4} />
              {counts[i] > 0 && (
                <rect x={BAR_X} y={y + 6} width={Math.max(3, here)} height={20} rx={3} fill={PIPELINE_RAMP[s]} />
              )}
              <text
                x={BAR_X + BAR_W + 10}
                y={y + 20}
                fontSize={13}
                fontWeight={500}
                fill={INK}
                className="tabular-nums"
              >
                {reach[i]}
              </text>
              <text
                x={VIEW_W - 8}
                y={y + 20}
                fontSize={12}
                fill={weak ? FLAG : FAINT}
                textAnchor="end"
                className="tabular-nums"
              >
                {step === null ? "—" : `${step}%`}
              </text>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
