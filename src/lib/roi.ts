/**
 * Kate's ROI method, as arithmetic.
 *
 *   ROI = (value created − project cost) ÷ project cost × 100
 *   payback = build cost ÷ monthly net value
 *
 * Everything here is in hours. The workshop prices time at one flat rate,
 * and at one rate the rate cancels out of the ratio: a workflow that saves
 * 108 hours a year against an 80-hour build is 35% whether an hour is worth
 * $75 or $200. That is what lets Casespace show the percentage Kate teaches
 * without a dollar figure anywhere in the product. It is also an assumption
 * worth stating — an hour of build time and an hour of saved time are
 * treated as worth the same, which is exactly what the workshop does.
 *
 * Only time-saved cases compute. A revenue case is counts and rates (a win
 * rate moving from 50% to 55%); turning that into a percentage needs a deal
 * value, and deal values are dollars. Those belong in Kate's confirmation
 * note, which is admin-only and allowed to carry them.
 *
 * One function feeds the form, the record page, the proposal card, and the
 * Coach's calculator tool, so all four show the same number. The worked
 * examples in `roi.test.ts` are the training module's own, and they are the
 * contract: 35% / 440% / 900% / −20% must reproduce exactly.
 */
import type { UcStatus } from "./domain";

export const VALUE_TYPES = ["time_saved", "revenue"] as const;
export type ValueType = (typeof VALUE_TYPES)[number];

export const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  time_saved: "Time saved",
  revenue: "Revenue",
};

/** One sentence each, for the form's choice and the Coach's explanation. */
export const VALUE_TYPE_DESCRIPTIONS: Record<ValueType, string> = {
  time_saved:
    "The workflow gives hours back, or covers work nobody had hours for. Measured in hours per period.",
  revenue:
    "The workflow helps win, keep, or grow business. Measured as a rate — win rate, renewal rate, deal size.",
};

export const BASELINE_PERIODS = ["week", "month", "quarter", "year"] as const;
export type BaselinePeriod = (typeof BASELINE_PERIODS)[number];

export const PERIODS_PER_YEAR: Record<BaselinePeriod, number> = {
  week: 52,
  month: 12,
  quarter: 4,
  year: 1,
};

/** The self-paced version of Kate's workshop. Linked from the form and the Coach. */
export const ROI_TRAINING_URL = "https://roi-wksp.vercel.app";

/** The unit a value type fixes, or null when the person writes their own. */
export function baselineUnitFor(valueType: ValueType | null | undefined): string | null {
  if (valueType === "time_saved") return "hours";
  if (valueType === "revenue") return "%";
  return null;
}

export interface RoiInputs {
  valueType: ValueType | null | undefined;
  /** Hours per period, before. */
  baselineValue: number | null | undefined;
  baselinePeriod: BaselinePeriod | null | undefined;
  /** Hours per period, after — expected or actual, the caller decides which. */
  afterValue: number | null | undefined;
  buildHours: number | null | undefined;
  /** Applies from year two. Absent means none. */
  maintenanceHoursPerYear?: number | null;
}

export interface RoiFigures {
  hoursSavedPerPeriod: number;
  hoursSavedPerYear: number;
  hoursSavedPerMonth: number;
  buildHours: number;
  maintenanceHoursPerYear: number;
  yearOneNetHours: number;
  yearOneRoiPct: number;
  /** Months until the build is paid back; null when it never is. */
  paybackMonths: number | null;
  /** Year two against maintenance alone; null when there is no recurring cost to divide by. */
  yearTwoRoiPct: number | null;
  twoYearRoiPct: number;
}

/** What is missing, in the order the form asks for it. */
export type RoiMissing =
  | "value_type"
  | "not_time_saved"
  | "baseline"
  | "period"
  | "after"
  | "build_hours";

export const ROI_MISSING_TEXT: Record<RoiMissing, string> = {
  value_type: "Pick what kind of value this creates first.",
  not_time_saved:
    "Only time-saved cases compute a percentage. A revenue case is reported as counts and rates.",
  baseline: "Needs a baseline — the hours it takes today.",
  period: "Needs a period for the baseline — per week, month, quarter, or year.",
  after: "Needs the after-value — the hours it takes with the workflow.",
  build_hours: "Needs the build hours, more than zero.",
};

export type RoiResult =
  | { ok: true; figures: RoiFigures }
  | { ok: false; reason: RoiMissing };

export function calculateRoi(i: RoiInputs): RoiResult {
  if (!i.valueType) return { ok: false, reason: "value_type" };
  if (i.valueType !== "time_saved") return { ok: false, reason: "not_time_saved" };
  if (i.baselineValue == null) return { ok: false, reason: "baseline" };
  if (!i.baselinePeriod) return { ok: false, reason: "period" };
  if (i.afterValue == null) return { ok: false, reason: "after" };
  if (i.buildHours == null || i.buildHours <= 0)
    return { ok: false, reason: "build_hours" };

  const buildHours = i.buildHours;
  const maintenanceHoursPerYear = i.maintenanceHoursPerYear ?? 0;
  const hoursSavedPerPeriod = i.baselineValue - i.afterValue;
  const hoursSavedPerYear =
    hoursSavedPerPeriod * PERIODS_PER_YEAR[i.baselinePeriod];
  const hoursSavedPerMonth = hoursSavedPerYear / 12;

  const yearOneNetHours = hoursSavedPerYear - buildHours;
  const yearOneRoiPct = (yearOneNetHours / buildHours) * 100;
  const paybackMonths =
    hoursSavedPerMonth > 0 ? buildHours / hoursSavedPerMonth : null;
  const yearTwoRoiPct =
    maintenanceHoursPerYear > 0
      ? ((hoursSavedPerYear - maintenanceHoursPerYear) /
          maintenanceHoursPerYear) *
        100
      : null;
  const twoYearCost = buildHours + maintenanceHoursPerYear;
  const twoYearRoiPct = ((2 * hoursSavedPerYear - twoYearCost) / twoYearCost) * 100;

  return {
    ok: true,
    figures: {
      hoursSavedPerPeriod,
      hoursSavedPerYear,
      hoursSavedPerMonth,
      buildHours,
      maintenanceHoursPerYear,
      yearOneNetHours,
      yearOneRoiPct,
      paybackMonths,
      yearTwoRoiPct,
      twoYearRoiPct,
    },
  };
}

/** The ROI columns on a record, as the queries return them. */
export interface RoiRecordFields {
  valueType: ValueType | null;
  baselineValue: number | null;
  baselinePeriod: BaselinePeriod | null;
  /** The expected after-value, entered at launch. */
  expectedValue: number | null;
  /** The actual after-value, entered on the revisit date. */
  postValue: number | null;
  buildHours: number | null;
  maintenanceHoursPerYear: number | null;
}

/** Kate's step 2: what the plan says the workflow is worth. */
export function expectedRoi(uc: RoiRecordFields): RoiResult {
  return calculateRoi({ ...uc, afterValue: uc.expectedValue });
}

/** Kate's step 4: what the measurement says it was worth. */
export function actualRoi(uc: RoiRecordFields): RoiResult {
  return calculateRoi({ ...uc, afterValue: uc.postValue });
}

// ---------------------------------------------------------------------------
// Formatting — one spelling of each number, everywhere it appears
// ---------------------------------------------------------------------------

const MINUS = "−";

export function fmtPct(pct: number): string {
  const r = Math.round(pct);
  return r < 0 ? `${MINUS}${Math.abs(r)}%` : `${r}%`;
}

/** Mirrors the training module's wording, so the two agree on "about 9 months". */
export function fmtPayback(months: number | null): string {
  if (months === null || !Number.isFinite(months)) return "never";
  if (months < 1) return "under a month";
  const r = Math.round(months);
  if (r === 1) return "about 1 month";
  if (r > 36) return "over 3 years";
  return `about ${r} months`;
}

const hoursFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function fmtHours(hours: number): string {
  const n = hoursFmt.format(Math.abs(hours));
  const sign = hours < 0 ? MINUS : "";
  return `${sign}${n} ${n === "1" ? "hour" : "hours"}`;
}

/** "90" for a baseline of 10 and an after of 1. Null without both. */
export function pctRemoved(
  baseline: number | null | undefined,
  after: number | null | undefined,
): number | null {
  if (baseline == null || after == null || baseline <= 0) return null;
  return ((baseline - after) / baseline) * 100;
}

/**
 * One line, the way the module's worksheet says it. Payback always sits
 * beside ROI: 35% with a nine-month payback reads very differently from 35%
 * with a three-year one.
 */
export function roiReadoutLine(
  f: RoiFigures,
  label: "Expected" | "Actual",
): string {
  const parts = [
    `${label} ROI, year one: ${fmtPct(f.yearOneRoiPct)}`,
    `payback ${fmtPayback(f.paybackMonths)}`,
  ];
  if (f.yearTwoRoiPct !== null) parts.push(`year two ${fmtPct(f.yearTwoRoiPct)}`);
  return parts.join(" · ");
}

/**
 * A net-impact sentence written from the numbers — a template a person
 * edits, never a claim the software makes on its own. Spelled out in hours
 * so it can go on an open surface.
 */
export function netImpactDraft(f: RoiFigures): string {
  const saved = f.hoursSavedPerMonth;
  const build = `${hoursFmt.format(f.buildHours)}-hour build`;
  if (saved <= 0) {
    return `Takes about ${fmtHours(-saved)} more a month than before, against an ${build}. Year-one ROI ${fmtPct(f.yearOneRoiPct)}.`;
  }
  const sentences = [
    `Saves about ${fmtHours(saved)} a month, ${fmtHours(f.hoursSavedPerYear)} a year.`,
    f.paybackMonths === null
      ? `The ${build} does not pay back at this rate.`
      : `The ${build} pays back in ${fmtPayback(f.paybackMonths)}.`,
    `Year-one ROI ${fmtPct(f.yearOneRoiPct)}.`,
  ];
  if (f.yearTwoRoiPct !== null) {
    sentences.push(
      `Year two, after ${fmtHours(f.maintenanceHoursPerYear)} of maintenance: ${fmtPct(f.yearTwoRoiPct)}.`,
    );
  }
  return sentences.join(" ");
}

// ---------------------------------------------------------------------------
// The three steps
// ---------------------------------------------------------------------------

/**
 * Kate's method as the form and the record page present it:
 *   1. Before you build — the plan (baseline, how you'll measure)
 *   2. At launch — expected ROI (build hours, expected after, revisit date)
 *   3. On the revisit date — actual ROI
 * All three are always shown; this says which one opens first.
 */
export type RoiStep = 1 | 2 | 3;

export const ROI_STEP_TITLES: Record<RoiStep, string> = {
  1: "Before you build — the plan",
  2: "At launch — expected ROI",
  3: "On the revisit date — actual ROI",
};

export function roiStepFor(args: {
  status: UcStatus;
  /** YYYY-MM-DD, or null. */
  revisitOn: string | null | undefined;
  /** YYYY-MM-DD. */
  today: string;
}): RoiStep {
  const { status, revisitOn, today } = args;
  if (status === "qualified" || status === "confirmed_positive_roi") return 3;
  if (revisitOn && revisitOn <= today) return 3;
  if (status === "in_testing" || status === "launched") return 2;
  return 1;
}

/**
 * Kate's step 6: the revisit date has passed and nothing was measured. A
 * confirmed record is done, whatever its dates say. The answer is a measured
 * number, a new revisit date, or a decision to decommission — never a blank.
 */
export function isRevisitDue(
  uc: {
    status: UcStatus;
    revisitOn: string | null;
    postValue: number | null;
  },
  today: string,
): boolean {
  if (uc.status === "confirmed_positive_roi") return false;
  if (!uc.revisitOn || uc.revisitOn > today) return false;
  return uc.postValue === null;
}
