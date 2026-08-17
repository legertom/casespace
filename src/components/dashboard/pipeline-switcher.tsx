"use client";

import { useState, useTransition, type ReactNode } from "react";
import { setPipelineChartAction } from "@/server/actions-preferences";
import {
  PIPELINE_CHARTS,
  PIPELINE_CHART_HINTS,
  PIPELINE_CHART_LABELS,
  type PipelineChart,
} from "@/lib/pipeline-chart";

/**
 * Lets a person choose which drawing of the pipeline they see, and remembers
 * it on their account.
 *
 * Both drawings are rendered on the server and handed in as props, so
 * switching is instant — the server action only persists the choice for next
 * time and never gates what is on screen. If that write fails the view stays
 * where the person put it; a preference that doesn't stick is worth far less
 * noise than a chart that snaps back under them.
 */
export function PipelineSwitcher({
  initial,
  charts,
}: {
  initial: PipelineChart;
  charts: Record<PipelineChart, ReactNode>;
}) {
  const [choice, setChoice] = useState<PipelineChart>(initial);
  const [, startTransition] = useTransition();

  function pick(next: PipelineChart) {
    if (next === choice) return;
    setChoice(next);
    startTransition(async () => {
      await setPipelineChartAction(next);
    });
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Pipeline chart"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        {PIPELINE_CHARTS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={choice === option}
            title={PIPELINE_CHART_HINTS[option]}
            onClick={() => pick(option)}
            className={`rounded-md border px-3 py-1 text-sm transition-colors ${
              choice === option
                ? "border-accent bg-accent-wash font-medium text-accent"
                : "border-hairline-strong text-ink-muted hover:text-ink"
            }`}
          >
            {PIPELINE_CHART_LABELS[option]}
          </button>
        ))}
      </div>
      {charts[choice]}
      <p className="mt-3 text-sm text-ink-muted">{PIPELINE_CHART_HINTS[choice]}</p>
    </div>
  );
}
