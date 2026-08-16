import { roiGaps } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { Empty } from "@/components/record/empty";
import { InlineField } from "@/components/record/inline-field";
import { ConfirmedRoiBadge } from "@/components/status-badge";

/**
 * Success & ROI: the success criterion, the measurement box, what still
 * stands between a Qualified record and confirmation, and the standing
 * counts-and-rates-never-dollars reminder.
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
  const measuring = uc.roiStatus !== "not_yet_measurable";

  return (
    <section>
      <h2 className="font-serif text-2xl">Success &amp; ROI</h2>
      <InlineField
        record={record}
        field="successCriterion"
        label="Success criterion"
        value={uc.successCriterion}
        editor={{ kind: "textarea", rows: 3 }}
        canEdit={editable}
        className="mt-3"
      >
        <p className="max-w-prose leading-relaxed">
          <strong>Success criterion:</strong>{" "}
          {uc.successCriterion ?? (
            <Empty>none defined yet</Empty>
          )}
        </p>
      </InlineField>
      <InlineField
        record={record}
        field="successCriterionMet"
        label="Whether the success criterion is met"
        value={uc.successCriterionMet}
        editor={{
          kind: "select",
          options: [
            { value: "not_yet", label: "Not yet evaluated" },
            { value: "yes", label: "Met" },
            { value: "no", label: "Not met" },
          ],
        }}
        canEdit={editable}
        className="mt-1.5"
      >
        <p className="text-sm text-ink-muted">
          {uc.successCriterionMet === "yes"
            ? "Met."
            : uc.successCriterionMet === "no"
              ? "Not met."
              : "Not yet evaluated."}
        </p>
      </InlineField>

      <div className="mt-4 max-w-prose space-y-3 rounded-md border border-hairline bg-surface p-4">
        <InlineField
          record={record}
          field="roiStatus"
          label="ROI status"
          value={uc.roiStatus}
          editor={{
            kind: "select",
            options: [
              { value: "not_yet_measurable", label: "Not yet measurable" },
              { value: "in_progress", label: "Measurement in progress" },
              { value: "complete", label: "Complete" },
            ],
          }}
          canEdit={editable}
        >
          <p className="text-sm">
            <strong>ROI:</strong>{" "}
            {uc.roiStatus === "not_yet_measurable"
              ? "not measurable yet"
              : uc.roiStatus === "in_progress"
                ? "measurement in progress"
                : "scoring complete"}
          </p>
        </InlineField>

        {uc.roiStatus === "not_yet_measurable" ? (
          <InlineField
            record={record}
            field="revisitOn"
            label="Revisit date"
            value={uc.revisitOn}
            editor={{ kind: "date" }}
            canEdit={editable}
          >
            <p className="text-sm text-ink-muted">
              {uc.revisitOn ? (
                `Revisit on ${fmtDate(uc.revisitOn)}.`
              ) : (
                <Empty>No revisit date set.</Empty>
              )}{" "}
              Never fake a number.
            </p>
          </InlineField>
        ) : (
          <dl className="space-y-3 text-sm">
            {(uc.baselineMetric || editable) && (
              <InlineField
                record={record}
                field="baselineMetric"
                label="Baseline metric"
                value={uc.baselineMetric}
                editor={{ kind: "text" }}
                canEdit={editable}
              >
                <div>
                  <dt className="font-medium">Baseline metric</dt>
                  <dd className="text-ink-muted">
                    {uc.baselineMetric ?? (
                      <Empty>what you measured before</Empty>
                    )}
                  </dd>
                </div>
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
                <div>
                  <dt className="font-medium">Before</dt>
                  <dd className="text-ink-muted">
                    {uc.baselineValue ?? <Empty>—</Empty>}{" "}
                    {uc.baselineUnit ?? ""}
                  </dd>
                </div>
              </InlineField>
            )}
            {(uc.baselineUnit || editable) && (
              <InlineField
                record={record}
                field="baselineUnit"
                label="Unit"
                value={uc.baselineUnit}
                editor={{ kind: "text" }}
                canEdit={editable}
              >
                <div>
                  <dt className="font-medium">Unit</dt>
                  <dd className="text-ink-muted">
                    {uc.baselineUnit ?? (
                      <Empty>hours, tickets, %…</Empty>
                    )}
                  </dd>
                </div>
              </InlineField>
            )}
            {(uc.postValue !== null || editable) && (
              <InlineField
                record={record}
                field="postValue"
                label="Post value"
                value={uc.postValue}
                editor={{ kind: "number" }}
                canEdit={editable}
              >
                <div>
                  <dt className="font-medium">After</dt>
                  <dd className="text-ink-muted">
                    {uc.postValue ?? (
                      <Empty>not measured yet</Empty>
                    )}{" "}
                    {uc.postValue !== null ? (uc.baselineUnit ?? "") : ""}
                  </dd>
                </div>
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
                <div>
                  <dt className="font-medium">Method</dt>
                  <dd className="text-ink-muted">
                    {uc.measurementMethod ?? (
                      <Empty>
                        how both numbers were captured — same method
                        both times
                      </Empty>
                    )}
                  </dd>
                </div>
              </InlineField>
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
                <div>
                  <dt className="font-medium">Net impact</dt>
                  <dd className="text-ink-muted">
                    {uc.netImpactStatement ?? (
                      <Empty>one plain sentence of net impact</Empty>
                    )}
                  </dd>
                </div>
              </InlineField>
            )}
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
              <div>
                <dt className="font-medium">Outcome</dt>
                <dd className="text-ink-muted">
                  {uc.isPositive === true
                    ? "Positive, attributable to the AI workflow"
                    : uc.isPositive === false
                      ? "Not positive"
                      : "Not yet assessed"}
                </dd>
              </div>
            </InlineField>
          </dl>
        )}

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
        {confirmed && (
          <p className="border-t border-hairline pt-3 text-sm">
            <ConfirmedRoiBadge /> — confirmed
            {uc.roiConfirmedAt ? ` ${fmtDate(uc.roiConfirmedAt)}` : ""}.
            The annual-ROI note is in the history below and rolls up
            into the end-of-year wins report.
          </p>
        )}
        {measuring && (
          <p className="border-t border-hairline pt-3 text-xs text-ink-faint">
            Counts and rates, never dollars. Baseline and post
            measurement must use the same method.
          </p>
        )}
      </div>
    </section>
  );
}
