/**
 * Which drawing of the pipeline a person sees on the dashboard.
 *
 * A per-person preference, stored on the user so it follows them between
 * devices rather than living in a cookie. Both drawings read the same seven
 * counts; they differ in what they encode, which is why the choice is offered
 * rather than settled — see /graphs.
 */

export const PIPELINE_CHARTS = ["conversion", "platforms"] as const;

export type PipelineChart = (typeof PIPELINE_CHARTS)[number];

/** Kate's pick. What everyone sees until they choose otherwise. */
export const DEFAULT_PIPELINE_CHART: PipelineChart = "conversion";

export const PIPELINE_CHART_LABELS: Record<PipelineChart, string> = {
  conversion: "Funnel",
  platforms: "Platforms",
};

/** The one-line explanation under each choice — they measure different things. */
export const PIPELINE_CHART_HINTS: Record<PipelineChart, string> = {
  conversion: "How many reached each stage or beyond, and where work drops off.",
  platforms: "How many are sitting at each stage right now, one figure per record.",
};

/**
 * Read a stored or submitted value. Anything unrecognized falls back to the
 * default rather than throwing — a preference is never worth a 500, and an
 * older row may predate a choice being added.
 */
export function parsePipelineChart(value: unknown): PipelineChart {
  return PIPELINE_CHARTS.includes(value as PipelineChart)
    ? (value as PipelineChart)
    : DEFAULT_PIPELINE_CHART;
}

/** The other one — what the toggle switches to. */
export function otherPipelineChart(current: PipelineChart): PipelineChart {
  return current === "conversion" ? "platforms" : "conversion";
}
