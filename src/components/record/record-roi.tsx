import { etDateString, roiGaps, SUCCESS_MET_LABELS } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import {
  actualRoi,
  BASELINE_PERIODS,
  expectedRoi,
  fmtPct,
  pctRemoved,
  ROI_STEP_TITLES,
  ROI_TRAINING_URL,
  roiStepFor,
  VALUE_TYPE_LABELS,
  VALUE_TYPES,
  type RoiStep,
} from "@/lib/roi";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { Empty } from "@/components/record/empty";
import { InlineField } from "@/components/record/inline-field";
import { RoiReadout } from "@/components/record/roi-readout";
import { ConfirmedRoiBadge } from "@/components/status-badge";

/**
 * Success & ROI, as Kate's three steps: the plan before building, expected
 * ROI at launch, actual ROI on the revisit date. All three are always on the
 * page — the baseline is editable at every stage, which it was not when the
 * measurement fields hid behind "not yet measurable" — and the step that
 * matches the record's stage opens first.
 *
 * The readouts come from lib/roi, the same function the form and the Coach
 * use, in hours. Nothing here is on the ROI checklist except what always
 * was; the gap list for a Qualified record is unchanged.
 */
export function RecordRoi({
  uc,
  record,
  editable,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
}) {
  const confirmed = uc.status === "confirmed_positive_roi";
  const gaps = roiGaps(uc);
  const open = roiStepFor({
    status: uc.status,
    revisitOn: uc.revisitOn,
    today: etDateString(new Date()),
  });
  const expected = expectedRoi(uc);
  const actual = actualRoi(uc);
  const timeSaved = uc.valueType === "time_saved";
  const per = timeSaved && uc.baselinePeriod ? ` per ${uc.baselinePeriod}` : "";
  const removed = pctRemoved(uc.baselineValue, uc.expectedValue);
  /** "1 hour per month", "2 hours per month", "55 %". */
  const withUnit = (v: number) => {
    const unit = uc.baselineUnit ?? "";
    const u = unit === "hours" && v === 1 ? "hour" : unit;
    return `${v} ${u}${per}`.trim();
  };

  return (
    <section>
      <h2 className="font-serif text-2xl">Success &amp; ROI</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">
        Kate&rsquo;s method in three steps. Hours, never dollars.{" "}
        <a
          href={ROI_TRAINING_URL}
          target="_blank"
          rel="noopener"
          className="text-accent underline underline-offset-2"
        >
          The training
        </a>{" "}
        walks through the same three; <em>Run ROI review</em> above works
        them through with the Coach.
      </p>

      <div className="mt-4 max-w-prose space-y-3">
        {/* ---------- 1 · before you build */}
        <StepBox n={1} open={open === 1}>
          <InlineField
            record={record}
            field="valueType"
            label="Kind of value"
            value={uc.valueType}
            editor={{
              kind: "select",
              options: VALUE_TYPES.map((v) => ({
                value: v,
                label: VALUE_TYPE_LABELS[v],
              })),
              empty: "Not sure yet",
            }}
            canEdit={editable}
          >
            <Line k="Value">
              {uc.valueType ? (
                VALUE_TYPE_LABELS[uc.valueType]
              ) : (
                <Empty>not chosen yet — time saved or revenue</Empty>
              )}
            </Line>
          </InlineField>
          <InlineField
            record={record}
            field="successCriterion"
            label="Success criterion"
            value={uc.successCriterion}
            editor={{ kind: "textarea", rows: 3 }}
            canEdit={editable}
          >
            <Line k="How we'll know">
              {uc.successCriterion ?? <Empty>none defined yet</Empty>}
            </Line>
          </InlineField>
          {(uc.baselineMetric || editable) && (
            <InlineField
              record={record}
              field="baselineMetric"
              label="What is measured"
              value={uc.baselineMetric}
              editor={{ kind: "text" }}
              canEdit={editable}
            >
              <Line k="Measuring">
                {uc.baselineMetric ?? (
                  <Empty>what you measure before and after</Empty>
                )}
              </Line>
            </InlineField>
          )}
          {(uc.baselineValue !== null || editable) && (
            <InlineField
              record={record}
              field="baselineValue"
              label="Baseline value"
              value={uc.baselineValue}
              editor={{ kind: "number" }}
              canEdit={editable}
            >
              <Line k="Baseline">
                {uc.baselineValue !== null ? (
                  withUnit(uc.baselineValue)
                ) : (
                  <Empty>what it takes today, by hand</Empty>
                )}
                {uc.baselineEstimated === true
                  ? " (estimated)"
                  : uc.baselineEstimated === false
                    ? " (measured)"
                    : ""}
              </Line>
            </InlineField>
          )}
          {!uc.valueType && (uc.baselineUnit || editable) && (
            <InlineField
              record={record}
              field="baselineUnit"
              label="Unit"
              value={uc.baselineUnit}
              editor={{ kind: "text" }}
              canEdit={editable}
            >
              <Line k="Unit">
                {uc.baselineUnit ?? <Empty>hours, tickets, %…</Empty>}
              </Line>
            </InlineField>
          )}
          {timeSaved && (uc.baselinePeriod || editable) && (
            <InlineField
              record={record}
              field="baselinePeriod"
              label="Baseline period"
              value={uc.baselinePeriod}
              editor={{
                kind: "select",
                options: BASELINE_PERIODS.map((p) => ({ value: p, label: p })),
                empty: "—",
              }}
              canEdit={editable}
            >
              <Line k="Per">
                {uc.baselinePeriod ?? <Empty>week, month, quarter, or year</Empty>}
              </Line>
            </InlineField>
          )}
          {(uc.baselineEstimated !== null || editable) && (
            <InlineField
              record={record}
              field="baselineEstimated"
              label="Measured or estimated"
              value={uc.baselineEstimated}
              editor={{
                kind: "tri",
                yes: "Estimated — the calendar heuristic",
                no: "Measured",
                unset: "Not said",
              }}
              canEdit={editable}
            >
              <Line k="Basis">
                {uc.baselineEstimated === true
                  ? "Estimated. A stated estimate beats a missing baseline."
                  : uc.baselineEstimated === false
                    ? "Measured."
                    : <Empty>measured, or an estimate?</Empty>}
              </Line>
            </InlineField>
          )}
          {(uc.measurementMethod || editable) && (
            <InlineField
              record={record}
              field="measurementMethod"
              label="Measurement method"
              value={uc.measurementMethod}
              editor={{ kind: "textarea", rows: 2 }}
              canEdit={editable}
            >
              <Line k="Method">
                {uc.measurementMethod ?? (
                  <Empty>
                    how both numbers are captured — the same way both times
                  </Empty>
                )}
              </Line>
            </InlineField>
          )}
        </StepBox>

        {/* ---------- 2 · at launch */}
        <StepBox n={2} open={open === 2}>
          {(uc.buildHours !== null || editable) && (
            <InlineField
              record={record}
              field="buildHours"
              label="Hours spent building"
              value={uc.buildHours}
              editor={{ kind: "number" }}
              canEdit={editable}
            >
              <Line k="Build effort">
                {uc.buildHours !== null ? (
                  `~${uc.buildHours} ${uc.buildHours === 1 ? "hour" : "hours"} (estimated)`
                ) : (
                  <Empty>not estimated yet</Empty>
                )}
              </Line>
            </InlineField>
          )}
          {(uc.expectedValue !== null || editable) && (
            <InlineField
              record={record}
              field="expectedValue"
              label="Expected after launch"
              value={uc.expectedValue}
              editor={{ kind: "number" }}
              canEdit={editable}
            >
              <Line k="Expected after">
                {uc.expectedValue !== null ? (
                  `${withUnit(uc.expectedValue)}${
                    timeSaved && removed !== null
                      ? ` — ${fmtPct(removed)} of that time removed`
                      : ""
                  }`
                ) : (
                  <Empty>what it should take once the workflow is in place</Empty>
                )}
              </Line>
            </InlineField>
          )}
          {(uc.maintenanceHoursPerYear !== null || editable) && (
            <InlineField
              record={record}
              field="maintenanceHoursPerYear"
              label="Maintenance, hours a year"
              value={uc.maintenanceHoursPerYear}
              editor={{ kind: "number" }}
              canEdit={editable}
            >
              <Line k="Maintenance">
                {uc.maintenanceHoursPerYear !== null ? (
                  `${uc.maintenanceHoursPerYear} hours a year, from year two`
                ) : (
                  <Empty>none counted — fine if it is only a few hours</Empty>
                )}
              </Line>
            </InlineField>
          )}
          {timeSaved && <RoiReadout result={expected} label="Expected" />}
          <InlineField
            record={record}
            field="revisitOn"
            label="Revisit date"
            value={uc.revisitOn}
            editor={{ kind: "date" }}
            canEdit={editable}
          >
            <Line k="Revisit">
              {uc.revisitOn ? (
                `${fmtDate(uc.revisitOn)} — about three runs after launch is the earliest worth measuring.`
              ) : (
                <Empty>no revisit date set. Never fake a number; set a date instead.</Empty>
              )}
            </Line>
          </InlineField>
        </StepBox>

        {/* ---------- 3 · on the revisit date */}
        <StepBox n={3} open={open === 3}>
          {(uc.postValue !== null || editable) && (
            <InlineField
              record={record}
              field="postValue"
              label="Actual, after launch"
              value={uc.postValue}
              editor={{ kind: "number" }}
              canEdit={editable}
            >
              <Line k="Actual after">
                {uc.postValue !== null ? (
                  withUnit(uc.postValue)
                ) : (
                  <Empty>not measured yet — same method as the baseline</Empty>
                )}
              </Line>
            </InlineField>
          )}
          {timeSaved && (
            <RoiReadout result={actual} label="Actual" compare={expected} />
          )}
          {(uc.netImpactStatement || editable) && (
            <InlineField
              record={record}
              field="netImpactStatement"
              label="Net impact statement"
              value={uc.netImpactStatement}
              editor={{ kind: "textarea", rows: 3 }}
              canEdit={editable}
            >
              <Line k="Net impact">
                {uc.netImpactStatement ?? (
                  <Empty>one plain sentence of net impact, in hours and counts</Empty>
                )}
              </Line>
            </InlineField>
          )}
          <InlineField
            record={record}
            field="successCriterionMet"
            label="Whether the success criterion is met"
            value={uc.successCriterionMet}
            editor={{
              kind: "select",
              options: (["not_yet", "yes", "no"] as const).map((v) => ({
                value: v,
                label: SUCCESS_MET_LABELS[v],
              })),
            }}
            canEdit={editable}
          >
            <Line k="Success criterion">
              {SUCCESS_MET_LABELS[uc.successCriterionMet]}
            </Line>
          </InlineField>
          <InlineField
            record={record}
            field="isPositive"
            label="Whether the outcome is positive"
            value={uc.isPositive}
            editor={{
              kind: "tri",
              yes: "Positive, attributable to the AI workflow",
              no: "Not positive",
              unset: "Not yet assessed",
            }}
            canEdit={editable}
          >
            <Line k="Outcome">
              {uc.isPositive === true
                ? "Positive, attributable to the AI workflow"
                : uc.isPositive === false
                  ? "Not positive"
                  : "Not yet assessed"}
            </Line>
          </InlineField>
          <InlineField
            record={record}
            field="roiStatus"
            label="Where the measurement stands"
            value={uc.roiStatus}
            editor={{
              kind: "select",
              options: [
                { value: "not_yet_measurable", label: "Not measurable yet" },
                { value: "in_progress", label: "Measuring now" },
                { value: "complete", label: "Measured" },
              ],
            }}
            canEdit={editable}
          >
            <Line k="Measurement">
              {uc.roiStatus === "not_yet_measurable"
                ? "not measurable yet"
                : uc.roiStatus === "in_progress"
                  ? "measuring now"
                  : "measured"}
            </Line>
          </InlineField>

          {uc.status === "qualified" && gaps.length > 0 && (
            <div className="border-t border-hairline pt-3">
              <p className="text-sm font-medium">
                Standing between this record and Confirmed Positive ROI:
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">
                {gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {confirmed ? (
            <p className="border-t border-hairline pt-3 text-sm">
              <ConfirmedRoiBadge /> — confirmed
              {uc.roiConfirmedAt ? ` ${fmtDate(uc.roiConfirmedAt)}` : ""}.
              The annual-ROI note is in the activity below and rolls up
              into the end-of-year wins report.
            </p>
          ) : (
            uc.postValue !== null && (
              <p className="border-t border-hairline pt-3 text-xs text-ink-faint">
                Measured? Tell Kate: @mention her in a comment below so she
                can confirm positive ROI. Her confirmation is what counts
                toward the 15.
              </p>
            )
          )}
        </StepBox>
      </div>
    </section>
  );
}

function StepBox({
  n,
  open,
  children,
}: {
  n: RoiStep;
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      className="rounded-md border border-hairline bg-surface"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        <span className="mr-2 text-ink-faint">{n}</span>
        {ROI_STEP_TITLES[n]}
      </summary>
      <div className="space-y-3 border-t border-hairline px-4 pb-4 pt-3 text-sm">
        {children}
      </div>
    </details>
  );
}

function Line({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-medium">{k}</dt>
      <dd className="text-ink-muted">{children}</dd>
    </div>
  );
}
