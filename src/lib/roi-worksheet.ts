/**
 * The ROI training module's "Copy for CaseSpace" text, read back.
 *
 * The module (roi-wksp, Kate's workshop as a self-paced page) ends with a
 * worksheet whose copy button emits a fixed, labelled format:
 *
 *   CaseSpace entry — MPR metrics automation
 *   Value type: Productivity
 *   Intended impact: …
 *   Metric that should move: Hours per month BizOps spends pulling metrics
 *   Baseline: 10 h/month
 *   Expected improvement: 90% of that time removed → 108 h/year
 *   Build: 80 h × $75 = $6,000
 *   Recurring: 20 h/year maintenance; no material token cost
 *   Expected ROI, year one: 35% · payback about 9 months · year two 440%
 *   Revisit date: 2027-02-21
 *   How I will confirm actual ROI: …
 *   Estimates are directional (calendar heuristic) unless noted.
 *
 * A fixed format deserves a parser, not a model: this maps the lines it
 * knows exactly, keeps the hours, and drops the dollar amounts — the module
 * prices time at $75/h and Casespace carries no dollar figure anywhere. It
 * runs ahead of the notes parser's model call, and what it finds wins over
 * what the model guesses. Anything it doesn't recognise (the impact, the
 * metric's prose) is left for the model. The module's own computed ROI line
 * is ignored on purpose: Casespace recomputes from the inputs.
 */
import type { Proposal } from "./ai/proposal";
import { PERIODS_PER_YEAR, type BaselinePeriod } from "./roi";

export type WorksheetFields = Partial<
  Pick<
    Proposal,
    | "title"
    | "valueType"
    | "baselineMetric"
    | "baselineValue"
    | "baselineUnit"
    | "baselinePeriod"
    | "expectedValue"
    | "buildHours"
    | "maintenanceHoursPerYear"
    | "revisitOn"
    | "measurementMethod"
  >
>;

const HEADER = /^\s*CaseSpace entry\s*[—–-]\s*(.+?)\s*$/im;
const NUM = "(\\d+(?:[.,]\\d+)?)";

function num(s: string): number {
  return Number(s.replace(",", "."));
}

/** The text after "Label:" on its own line, or null when it is "—" or absent. */
function line(text: string, label: string): string | null {
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+?)\\s*$`, "im");
  const m = text.match(re);
  if (!m) return null;
  const v = m[1].trim();
  return v === "—" || v === "-" || v === "" ? null : v;
}

function period(s: string): BaselinePeriod | null {
  const p = s.toLowerCase();
  return p in PERIODS_PER_YEAR ? (p as BaselinePeriod) : null;
}

/**
 * Null when the text is not the module's worksheet — the notes door then
 * behaves exactly as before.
 */
export function parseRoiWorksheet(text: string): WorksheetFields | null {
  const header = text.match(HEADER);
  if (!header) return null;

  const out: WorksheetFields = {};
  const name = header[1];
  if (name && !/^\(workflow name\)$/i.test(name)) out.title = name;

  const type = line(text, "Value type");
  if (type && /^productivity$/i.test(type)) out.valueType = "time_saved";
  else if (type && /^revenue$/i.test(type)) out.valueType = "revenue";

  const metric = line(text, "Metric that should move");
  if (metric) out.baselineMetric = metric;

  const baseline = line(text, "Baseline");
  if (baseline) {
    // "10 h/month" — time saved.
    const hours = baseline.match(new RegExp(`^${NUM}\\s*h\\s*/\\s*(week|month|quarter|year)`, "i"));
    // "50% of 50 opportunities/year at $2,500" — revenue; the rate is all that is kept.
    const rate = baseline.match(new RegExp(`^${NUM}\\s*%`));
    if (hours) {
      out.baselineValue = num(hours[1]);
      out.baselineUnit = "hours";
      out.baselinePeriod = period(hours[2]);
    } else if (rate) {
      out.baselineValue = num(rate[1]);
      out.baselineUnit = "%";
    }
  }

  const improvement = line(text, "Expected improvement");
  if (improvement) {
    // "90% of that time removed → 108 h/year": the after-value is what is
    // left of the baseline, in the baseline's period.
    const removed = improvement.match(new RegExp(`^${NUM}\\s*%\\s*of that time removed`, "i"));
    // "55% → $6,250 incremental/year": the expected rate.
    const rate = improvement.match(new RegExp(`^${NUM}\\s*%`));
    if (removed && out.baselineValue != null) {
      const left = out.baselineValue * (1 - num(removed[1]) / 100);
      out.expectedValue = Math.round(left * 100) / 100;
    } else if (rate && out.valueType === "revenue") {
      out.expectedValue = num(rate[1]);
    }
  }

  const build = line(text, "Build");
  if (build) {
    const hours = build.match(new RegExp(`^${NUM}\\s*h\\b`, "i"));
    if (hours) out.buildHours = num(hours[1]);
  }

  const recurring = line(text, "Recurring");
  if (recurring) {
    const maint = recurring.match(new RegExp(`${NUM}\\s*h\\s*/\\s*year maintenance`, "i"));
    if (maint) out.maintenanceHoursPerYear = num(maint[1]);
  }

  const revisit = line(text, "Revisit date");
  if (revisit) {
    const d = revisit.match(/\d{4}-\d{2}-\d{2}/);
    if (d) out.revisitOn = d[0];
  }

  const confirm = line(text, "How I will confirm actual ROI");
  if (confirm) out.measurementMethod = confirm;

  return out;
}
