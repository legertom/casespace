import Link from "next/link";
import {
  STATUSES,
  STATUS_DESCRIPTIONS,
  STATUS_LABELS,
  type UcStatus,
} from "@/lib/domain";
import { PIPELINE_RAMP } from "@/lib/pipeline-ramp";
import { cumulativeReach } from "@/lib/pipeline-shapes";

const ROW_H = 32;
const LABEL_R = 184;
const BAR_X = 196;
const BAR_W = 300;
const COUNT_X = BAR_X + BAR_W + 10;
/** Step conversion, right-aligned, just before the description column. */
const STEP_R = 570;
/**
 * Each stage says what it means on its own row, rather than in a caption
 * somewhere else on the page: at seven rows the eye is never near a shared
 * caption when it reaches the row it cares about. Costs width, which this
 * chart has — the bars are a fixed 300 and the gutter is sized to the longest
 * status name, so the rest of the viewBox was empty.
 */
const DESC_X = 590;
/**
 * Wide enough for the longest description with room to spare: measured, the
 * longest runs ~407 units from DESC_X, and the margin past it absorbs the
 * font falling back to something wider on a machine without the app's own.
 */
const VIEW_W = 1040;

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
 *
 * Every row also carries what its stage means, in the column on the right.
 * That is deliberately not a tooltip: what a stage means is the thing a
 * newcomer needs most, and hiding it behind a hover puts it out of reach of
 * every phone and every person who doesn't think to point at a bar.
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
  // The Qualified gate: only an admin moves a record across this line.
  const gateY = 16 + STATUSES.indexOf("qualified") * ROW_H - 1;

  return (
    <div className="overflow-x-auto">
      {/* The min-width rises with the viewBox: the descriptions are the point
          of the extra width, and letting the whole chart shrink to a phone
          would render them at half size. It scrolls sideways instead. */}
      <svg viewBox={`0 0 ${VIEW_W} ${height}`} className="w-full min-w-[920px]">
        <text x={BAR_X} y={10} fontSize={9.5} fill={FAINT}>
          solid = here now · pale = reached it or beyond
        </text>
        <text x={STEP_R} y={10} fontSize={9.5} fill={FAINT} textAnchor="end">
          step
        </text>
        <text x={DESC_X} y={10} fontSize={9.5} fill={FAINT}>
          what the stage means
        </text>
        <line
          x1={8}
          y1={gateY}
          x2={VIEW_W - 8}
          y2={gateY}
          stroke={FAINT}
          strokeWidth={1}
          strokeDasharray="5 4"
        />
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
              aria-label={`${STATUS_LABELS[s]} — ${STATUS_DESCRIPTIONS[s]} ${counts[i]} here now, ${reach[i]} reached this stage or beyond`}
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
                x={COUNT_X}
                y={y + 20}
                fontSize={13}
                fontWeight={500}
                fill={INK}
                className="tabular-nums"
              >
                {reach[i]}
              </text>
              <text
                x={STEP_R}
                y={y + 20}
                fontSize={12}
                fill={weak ? FLAG : FAINT}
                textAnchor="end"
                className="tabular-nums"
              >
                {step === null ? "—" : `${step}%`}
              </text>
              <text
                x={DESC_X}
                y={y + 20}
                fontSize={11.5}
                className="fill-ink-muted group-hover:fill-ink"
              >
                {STATUS_DESCRIPTIONS[s]}
              </text>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
