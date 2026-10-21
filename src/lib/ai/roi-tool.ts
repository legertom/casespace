/**
 * The `calculate_roi` tool, declared once.
 *
 * Model arithmetic drifts — "about 9 months", 8.9, 9.4 — and a number the
 * Coach worked out in its head is a number the record page would then
 * disagree with. So the arithmetic is a tool, and the tool is the same
 * function the form and the record page use (lib/roi). It needs no session
 * and no database, which is why the whole thing, `execute` included, lives
 * here where the evals can import it: they run the real calculator against
 * the real description, the same arrangement as `course-tools`.
 *
 * It writes nothing. That keeps it on the read side of the one rule this
 * application rests on — see proposal-tools and its test.
 */
import { tool } from "ai";
import { z } from "zod";
import {
  BASELINE_PERIODS,
  calculateRoi,
  fmtPayback,
  fmtPct,
  netImpactDraft,
  ROI_MISSING_TEXT,
  VALUE_TYPES,
} from "@/lib/roi";

export const roiToolInputSchema = z.object({
  valueType: z
    .enum(VALUE_TYPES)
    .nullish()
    .describe(
      "time_saved computes a percentage. revenue does not — the tool says why, and the case is reported as counts and rates.",
    ),
  baselineValue: z
    .number()
    .nullish()
    .describe("Hours per period the work takes today, by hand. Only a number the human gave, estimated or measured."),
  baselinePeriod: z
    .enum(BASELINE_PERIODS)
    .nullish()
    .describe("What the baseline is per. 'ten hours a month' is month."),
  afterValue: z
    .number()
    .nullish()
    .describe(
      "Hours per period with the workflow in place — the expected figure at launch, or the actual one measured on the revisit date. Same period as the baseline.",
    ),
  buildHours: z
    .number()
    .min(0)
    .nullish()
    .describe("Rough hours spent building. 'About a day' is 8."),
  maintenanceHoursPerYear: z
    .number()
    .min(0)
    .nullish()
    .describe("Recurring upkeep in hours a year, when it is more than a few. Omit for none."),
});

export type RoiToolInput = z.infer<typeof roiToolInputSchema>;

export const ROI_TOOL_DESCRIPTION =
  "Kate's ROI arithmetic, in hours: (hours saved a year − build hours) ÷ build hours × 100, with payback in months and the year-two figure. " +
  "Call it as soon as you have a baseline, an after-value and build hours from the human — never do this arithmetic yourself, and never call it with a number the human did not give. " +
  "A plain 'saves 4 hours a month' is a baseline of 4 per month with an after-value of 0; 'took 10 hours, now takes 1' is baseline 10, after 1. " +
  "Quote what it returns. It writes nothing to any record. For a revenue case it returns why there is no percentage.";

/** What the model reads back: the figures, one quotable line, and a draft sentence. */
export function calculateRoiForCoach(input: RoiToolInput) {
  const r = calculateRoi({
    valueType: input.valueType ?? null,
    baselineValue: input.baselineValue ?? null,
    baselinePeriod: input.baselinePeriod ?? null,
    afterValue: input.afterValue ?? null,
    buildHours: input.buildHours ?? null,
    maintenanceHoursPerYear: input.maintenanceHoursPerYear ?? null,
  });
  if (!r.ok) {
    return {
      computed: false as const,
      missing: r.reason,
      explanation: ROI_MISSING_TEXT[r.reason],
    };
  }
  const f = r.figures;
  const parts = [
    `ROI, year one: ${fmtPct(f.yearOneRoiPct)}`,
    `payback ${fmtPayback(f.paybackMonths)}`,
  ];
  if (f.yearTwoRoiPct !== null) parts.push(`year two ${fmtPct(f.yearTwoRoiPct)}`);
  return {
    computed: true as const,
    hoursSavedPerYear: f.hoursSavedPerYear,
    hoursSavedPerMonth: f.hoursSavedPerMonth,
    yearOneNetHours: f.yearOneNetHours,
    yearOneRoiPct: Math.round(f.yearOneRoiPct),
    paybackMonths: f.paybackMonths === null ? null : Math.round(f.paybackMonths * 10) / 10,
    yearTwoRoiPct: f.yearTwoRoiPct === null ? null : Math.round(f.yearTwoRoiPct),
    twoYearRoiPct: Math.round(f.twoYearRoiPct),
    /** The spelling the form and the record page use — quote this. */
    readout: parts.join(" · "),
    /** A net-impact sentence from the numbers, for the human to edit. */
    netImpactDraft: netImpactDraft(f),
    unit: "hours — at one hourly rate this is the same percentage as in dollars; never restate it in dollars",
  };
}

/** In the tool table for every mode but Discovery. */
export function roiTools() {
  return {
    calculate_roi: tool({
      description: ROI_TOOL_DESCRIPTION,
      inputSchema: roiToolInputSchema,
      execute: (input) => calculateRoiForCoach(input),
    }),
  };
}
