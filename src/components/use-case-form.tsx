"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions";
import {
  APPROACHES,
  APPROACH_LABELS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  RATING_FIELDS,
  SETTABLE_STATUSES,
  STATUS_LABELS,
  SUCCESS_MET_LABELS,
  type Approach,
  type Department,
  type RatingKey,
  type UcStatus,
} from "@/lib/domain";
import {
  actualRoi,
  BASELINE_PERIODS,
  baselineUnitFor,
  expectedRoi,
  fmtPct,
  netImpactDraft,
  pctRemoved,
  ROI_STEP_TITLES,
  ROI_TRAINING_URL,
  roiStepFor,
  VALUE_TYPE_DESCRIPTIONS,
  VALUE_TYPE_LABELS,
  VALUE_TYPES,
  type BaselinePeriod,
  type RoiStep,
  type ValueType,
} from "@/lib/roi";
import type { PersonRef, UseCaseCreateInput } from "@/lib/use-case-input";
import { ErrorNote } from "./error-note";
import { PeoplePicker, type PersonOption } from "./people-picker";
import { RoiReadout } from "./record/roi-readout";
import { cleanUrls, toRows, UrlRows } from "./use-case-url-rows";

export interface TeamOption {
  id: string;
  name: string;
  department: Department;
}

export interface EltOrgOption {
  id: string;
  name: string;
  departments: Department[];
}

interface Props {
  people: PersonOption[];
  teams: TeamOption[];
  eltOrgs: EltOrgOption[];
  initial?: Partial<UseCaseCreateInput>;
  /** Create sends status and shows the status section; edit defers to the record page. */
  mode: "create" | "edit";
  /** Edit mode: the saved record, for the read-only status line and for opening the right ROI step. */
  current?: { id: string; status: UcStatus };
  submitLabel: string;
  onSubmit: (input: UseCaseCreateInput) => Promise<ActionResult>;
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // Full-height column with the control pushed to the bottom, so side-by-side
  // fields line up on their inputs however many lines their hints wrap to.
  return (
    <label className={`flex h-full flex-col ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 text-xs text-ink-faint">{hint}</span>}
      <span className="mt-auto block pt-1.5">{children}</span>
    </label>
  );
}

/** Like Field, for a row of more than one control — a label can wrap only one. */
function Group({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full flex-col ${className ?? ""}`}>
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 text-xs text-ink-faint">{hint}</span>}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
        {children}
      </div>
    </div>
  );
}

/**
 * One of Kate's three ROI steps. Collapsible, never hidden: the one that
 * matches the record's stage opens first, the other two are a click away.
 */
function Step({
  n,
  open,
  onToggle,
  lede,
  children,
}: {
  n: RoiStep;
  open: boolean;
  onToggle: (open: boolean) => void;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-md border border-hairline bg-surface"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        <span className="mr-2 text-ink-faint">{n}</span>
        {ROI_STEP_TITLES[n]}
      </summary>
      <div className="space-y-4 border-t border-hairline px-4 pb-4 pt-4">
        <p className="text-xs text-ink-faint">{lede}</p>
        {children}
      </div>
    </details>
  );
}

const inputCls =
  "w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm";
/** Textareas resize vertically only — dragging one wider would break the column. */
const textareaCls = `${inputCls} resize-y`;
/** A number beside its unit, so the row reads "10 hours per month". */
const narrowCls = inputCls.replace("w-full", "w-28");

function num(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function UseCaseForm({
  people,
  teams,
  eltOrgs,
  initial = {},
  mode,
  current,
  submitLabel,
  onSubmit,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<ActionResult | null>(null);

  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [department, setDepartment] = useState<Department | "">(
    (initial.department as Department) ?? "",
  );
  const [teamId, setTeamId] = useState(initial.teamId ?? "");
  const [eltOrgId, setEltOrgId] = useState(initial.eltOrgId ?? "");
  const [authors, setAuthors] = useState<PersonRef[]>(initial.authors ?? []);
  const [owner, setOwner] = useState<PersonRef[]>(
    initial.owner ? [initial.owner] : [],
  );
  const [aiTools, setAiTools] = useState((initial.aiTools ?? []).join(", "));
  const [urls, setUrls] = useState(() => toRows(initial.urls ?? []));
  const [approaches, setApproaches] = useState<Approach[]>(
    initial.approaches ?? [],
  );
  const [steps, setSteps] = useState((initial.currentSteps ?? []).join("\n"));
  const [ratings, setRatings] = useState<Record<RatingKey, number | null>>({
    ratingFrequency: initial.ratingFrequency ?? null,
    ratingPain: initial.ratingPain ?? null,
    ratingDataAvailability: initial.ratingDataAvailability ?? null,
    ratingRisk: initial.ratingRisk ?? null,
    ratingOwnershipClarity: initial.ratingOwnershipClarity ?? null,
    ratingEvaluationClarity: initial.ratingEvaluationClarity ?? null,
    ratingMaintenanceBurden: initial.ratingMaintenanceBurden ?? null,
  });
  const [flSuccess, setFlSuccess] = useState(
    initial.functionalLeaderSuccess ?? "",
  );
  const [gateNamed, setGateNamed] = useState(initial.gateNamed ?? false);
  const [gateTool, setGateTool] = useState(initial.gateTool ?? false);
  const [gateAdoption, setGateAdoption] = useState(initial.gateAdoption ?? false);
  const [adoptionEvidence, setAdoptionEvidence] = useState(
    initial.adoptionEvidence ?? "",
  );
  const [gateOwner, setGateOwner] = useState(initial.gateOwner ?? false);
  const [successCriterion, setSuccessCriterion] = useState(
    initial.successCriterion ?? "",
  );
  const [successMet, setSuccessMet] = useState(
    initial.successCriterionMet ?? "not_yet",
  );
  const [valueType, setValueType] = useState<ValueType | "">(
    initial.valueType ?? "",
  );
  const [baselineMetric, setBaselineMetric] = useState(
    initial.baselineMetric ?? "",
  );
  const [baselineValue, setBaselineValue] = useState(
    initial.baselineValue?.toString() ?? "",
  );
  const [baselineUnit, setBaselineUnit] = useState(initial.baselineUnit ?? "");
  const [baselinePeriod, setBaselinePeriod] = useState<BaselinePeriod>(
    initial.baselinePeriod ?? "month",
  );
  const [baselineEstimated, setBaselineEstimated] = useState<"" | "yes" | "no">(
    initial.baselineEstimated === true
      ? "yes"
      : initial.baselineEstimated === false
        ? "no"
        : "",
  );
  const [method, setMethod] = useState(initial.measurementMethod ?? "");
  const [buildHours, setBuildHours] = useState(
    initial.buildHours?.toString() ?? "",
  );
  const [expectedValue, setExpectedValue] = useState(
    initial.expectedValue?.toString() ?? "",
  );
  const [maintenance, setMaintenance] = useState(
    initial.maintenanceHoursPerYear?.toString() ?? "",
  );
  const [revisitOn, setRevisitOn] = useState(initial.revisitOn ?? "");
  const [postValue, setPostValue] = useState(
    initial.postValue?.toString() ?? "",
  );
  const [netImpact, setNetImpact] = useState(initial.netImpactStatement ?? "");
  const [isPositive, setIsPositive] = useState<string>(
    initial.isPositive === true ? "yes" : initial.isPositive === false ? "no" : "",
  );
  const [roiStatus, setRoiStatus] = useState(
    initial.roiStatus ?? "not_yet_measurable",
  );
  const [status, setStatus] = useState(initial.status ?? "in_discovery");
  const isEdit = mode === "edit";

  // Which of Kate's three steps opens first follows the record's stage. All
  // three stay a click away; this is a starting point, not a gate.
  const stageStatus: UcStatus = isEdit ? (current?.status ?? "in_discovery") : status;
  const [openSteps, setOpenSteps] = useState<Record<RoiStep, boolean>>(() => {
    const s = roiStepFor({
      status: stageStatus,
      revisitOn: initial.revisitOn,
      today: todayIso(),
    });
    return { 1: s === 1, 2: s === 2, 3: s === 3 };
  });
  function setStep(n: RoiStep, open: boolean) {
    setOpenSteps((prev) => ({ ...prev, [n]: open }));
  }

  /** Rebuilt from APPROACHES so the stored order is always the canonical one. */
  function toggleApproach(approach: Approach, on: boolean) {
    setApproaches((prev) =>
      APPROACHES.filter((a) => (a === approach ? on : prev.includes(a))),
    );
  }

  const visibleTeams = department
    ? teams.filter((t) => t.department === department)
    : teams;
  const suggestedOrg = department
    ? eltOrgs.find((o) => o.departments.includes(department))
    : undefined;

  // The unit follows the value type: hours, a rate, or whatever they wrote.
  const fixedUnit = baselineUnitFor(valueType || null);
  const unitLabel = fixedUnit ?? (baselineUnit.trim() || "");
  const perPeriod = valueType === "time_saved" ? ` per ${baselinePeriod}` : "";
  const roiFields = {
    valueType: valueType || null,
    baselineValue: num(baselineValue),
    baselinePeriod: valueType === "time_saved" ? baselinePeriod : null,
    expectedValue: num(expectedValue),
    postValue: num(postValue),
    buildHours: num(buildHours),
    maintenanceHoursPerYear: num(maintenance),
  };
  const expected = expectedRoi(roiFields);
  const actual = actualRoi(roiFields);
  const removed = pctRemoved(roiFields.baselineValue, roiFields.expectedValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: UseCaseCreateInput = {
      title: title.trim(),
      description: description.trim(),
      department: department || null,
      teamId: teamId || null,
      eltOrgId: eltOrgId || null,
      authors,
      owner: owner[0] ?? null,
      aiTools: aiTools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      // Blank rows are dropped, not rejected: clicking "Add a link" and
      // reconsidering shouldn't cost you the save.
      urls: cleanUrls(urls),
      approaches,
      currentSteps: steps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      ...ratings,
      functionalLeaderSuccess: flSuccess.trim() || null,
      gateNamed,
      gateTool,
      gateAdoption,
      adoptionEvidence: adoptionEvidence.trim() || null,
      gateOwner,
      successCriterion: successCriterion.trim() || null,
      successCriterionMet: successMet as "yes" | "no" | "not_yet",
      buildHours: num(buildHours),
      valueType: valueType || null,
      baselineMetric: baselineMetric.trim() || null,
      baselineValue: num(baselineValue),
      baselineUnit: fixedUnit ?? (baselineUnit.trim() || null),
      baselinePeriod: valueType === "time_saved" ? baselinePeriod : null,
      baselineEstimated:
        baselineEstimated === "yes" ? true : baselineEstimated === "no" ? false : null,
      expectedValue: num(expectedValue),
      maintenanceHoursPerYear: num(maintenance),
      postValue: num(postValue),
      measurementMethod: method.trim() || null,
      netImpactStatement: netImpact.trim() || null,
      isPositive: isPositive === "yes" ? true : isPositive === "no" ? false : null,
      roiStatus: roiStatus as "not_yet_measurable" | "in_progress" | "complete",
      revisitOn: revisitOn || null,
      ...(isEdit ? {} : { status: status as UseCaseCreateInput["status"] }),
    };
    startTransition(async () => {
      const result = await onSubmit(input);
      if (result?.error) setError(result);
    });
  }

  /** The before/after/expected control for the value type in play. */
  function valueInput(
    value: string,
    set: (v: string) => void,
    ariaLabel: string,
  ) {
    return (
      <>
        <input
          type="number"
          step="any"
          min={valueType === "revenue" ? 0 : undefined}
          max={valueType === "revenue" ? 100 : undefined}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => set(e.target.value)}
          className={narrowCls}
        />
        {valueType === "time_saved" ? (
          <span className="text-sm text-ink-muted">hours per {baselinePeriod}</span>
        ) : valueType === "revenue" ? (
          <span className="text-sm text-ink-muted">%</span>
        ) : unitLabel ? (
          <span className="text-sm text-ink-muted">{unitLabel}</span>
        ) : null}
      </>
    );
  }

  const statusSection = isEdit ? (
    current && (
      <section className="space-y-2">
        <h2 className="font-serif text-2xl">Where does it stand?</h2>
        <p className="text-sm">
          <span className="font-medium">{STATUS_LABELS[current.status]}.</span>{" "}
          <span className="text-ink-muted">
            Status changes happen on{" "}
            <Link
              href={`/use-cases/${current.id}`}
              className="text-accent underline underline-offset-2"
            >
              the record page
            </Link>
            , so the history stays complete. Everything below is the same
            record, evolving.
          </span>
        </p>
      </section>
    )
  ) : (
    <section className="space-y-4">
      <h2 className="font-serif text-2xl">Where does it stand?</h2>
      <Field
        label="Status"
        hint="This decides how much of the rest applies right now — an idea in discovery has no ROI to measure yet. Qualified and Confirmed Positive ROI are granted later by an admin; they record Kate's decisions."
      >
        <select
          value={status}
          onChange={(e) => {
            const next = e.target.value as typeof status;
            setStatus(next);
            setStep(
              roiStepFor({ status: next, revisitOn, today: todayIso() }),
              true,
            );
          }}
          className={inputCls}
        >
          {SETTABLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
    </section>
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      {/* ------------------------------------------------ status, first */}
      {statusSection}

      {/* ------------------------------------------------ identity */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">The workflow</h2>
        <Field label="Title" hint="Name the workflow so a colleague would recognize it.">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field
          label="What it does"
          hint="Plain language: what does this workflow do, for whom?"
        >
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaCls}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Department"
            hint="The function this workflow serves. Picking one narrows the Team list."
          >
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value as Department | "");
                setTeamId("");
                setEltOrgId("");
              }}
              className={inputCls}
            >
              <option value="">—</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Team"
            hint="The specific team inside that department. Optional."
          >
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className={inputCls}
            >
              <option value="">—</option>
              {visibleTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {department ? "" : ` (${DEPARTMENT_LABELS[t.department]})`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Counts toward (ELT org)"
          hint={
            suggestedOrg && !eltOrgId
              ? `Left blank, this will count toward ${suggestedOrg.name} based on the department.`
              : "ELT is Clever's executive leadership team — this is whose target the record counts toward. Unmapped departments stay honestly unallocated."
          }
        >
          <select
            value={eltOrgId}
            onChange={(e) => setEltOrgId(e.target.value)}
            className={inputCls}
          >
            <option value="">
              {suggestedOrg ? `Auto: ${suggestedOrg.name}` : "Unallocated"}
            </option>
            {eltOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
      </section>

      {/* ------------------------------------------------ people */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">People</h2>
        <PeoplePicker
          label="Authors"
          hint="Everyone who built it. Credit lands on real people."
          people={people}
          value={authors}
          onChange={setAuthors}
          multiple
        />
        <PeoplePicker
          label="Owner"
          hint="Exactly one named person responsible for maintaining it."
          people={people}
          value={owner}
          onChange={setOwner}
        />
      </section>

      {/* ------------------------------------------------ tooling */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Tool &amp; approach</h2>
        <Field label="AI tools" hint="Comma-separated, e.g. Claude, Zapier, Cursor.">
          <input
            value={aiTools}
            onChange={(e) => setAiTools(e.target.value)}
            className={inputCls}
          />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">Approach</legend>
          <p className="mt-0.5 text-xs text-ink-faint">
            Check every one that applies — one workflow can be several at once.
            Prompt, automation, and agentic mean AI does the work at runtime.
            AI-built means AI (e.g. Claude Code) built the tool, even if it
            doesn&rsquo;t run AI itself. Leave them all unchecked if you&rsquo;re
            not sure yet.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {APPROACHES.map((a) => (
              <label key={a} className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  name="approaches"
                  value={a}
                  checked={approaches.includes(a)}
                  onChange={(e) => toggleApproach(a, e.target.checked)}
                />
                {APPROACH_LABELS[a]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* ------------------------------------------------ where to find it */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Where to find it</h2>
        <p className="max-w-prose text-sm text-ink-muted">
          Links to the thing itself — the live tool, the repo, the Claude
          artifact, project, or skill. Add as many as it has. For anything else,
          pick Link and say what it is.
        </p>
        <UrlRows value={urls} onChange={setUrls} />
      </section>

      {/* ------------------------------------------------ discovery */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Workflow discovery</h2>
        <Field
          label="Current workflow, start to finish"
          hint="One step per line — how the work happens today."
        >
          <textarea
            rows={5}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className={textareaCls}
          />
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Worksheet ratings <span className="font-normal text-ink-faint">(1 low – 5 high, all optional)</span>
          </legend>
          <p className="text-xs text-ink-faint">
            Seven lenses from the use-case scoping worksheet, for sizing up a
            workflow and comparing candidates. Rate what you know; skip what
            you don&rsquo;t. Click a number again to clear it.
          </p>
          {RATING_FIELDS.map(([key, label, hint]) => (
            <div
              key={key}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline py-2 last:border-0"
            >
              <div>
                <span className="text-sm">{label}</span>
                <span className="ml-2 text-xs text-ink-faint">{hint}</span>
              </div>
              <div role="radiogroup" aria-label={label} className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={ratings[key] === n}
                    onClick={() =>
                      setRatings((r) => ({
                        ...r,
                        [key]: r[key] === n ? null : n,
                      }))
                    }
                    className={`size-8 rounded-md border text-sm ${
                      ratings[key] === n
                        ? "border-accent bg-accent text-white"
                        : "border-hairline-strong bg-surface hover:border-accent"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
        <Field
          label="Functional leader's view of success"
          hint="The functional leader is the head of the department this serves. What would they call success?"
        >
          <textarea
            rows={2}
            value={flSuccess}
            onChange={(e) => setFlSuccess(e.target.value)}
            className={textareaCls}
          />
        </Field>
      </section>

      {/* ------------------------------------------------ gates */}
      <section className="space-y-3">
        <h2 className="font-serif text-2xl">The four documented gates</h2>
        <p className="text-sm text-ink-muted">
          All four must hold for a use case to count as documented.
        </p>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={gateNamed}
            onChange={(e) => setGateNamed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>Named workflow</strong> with a clear description
            <span className="mt-0.5 block text-xs text-ink-faint">
              The title names one specific workflow a colleague would
              recognize, and the description says what it does in plain
              language. If your title and description above do that, this
              gate is met.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={gateTool}
            onChange={(e) => setGateTool(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>AI tool &amp; approach</strong> identified
            <span className="mt-0.5 block text-xs text-ink-faint">
              The record says which AI tool does the work, and how &mdash;
              the Tool &amp; approach section above.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={gateAdoption}
            onChange={(e) => setGateAdoption(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>Adoption evidence</strong> — in active use by at least one
            person beyond the author(s)
          </span>
        </label>
        {gateAdoption && (
          <div className="ml-6">
            <Field label="Evidence" hint="Who uses it, and how do you know?">
              <textarea
                rows={2}
                value={adoptionEvidence}
                onChange={(e) => setAdoptionEvidence(e.target.value)}
                className={textareaCls}
              />
            </Field>
          </div>
        )}
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={gateOwner}
            onChange={(e) => setGateOwner(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>A named owner</strong> going forward
            <span className="mt-0.5 block text-xs text-ink-faint">
              One specific person is on the hook for keeping it running
              &mdash; the Owner field above.
            </span>
          </span>
        </label>
      </section>

      {/* ------------------------------------------------ success + ROI, Kate's three steps */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Success &amp; ROI</h2>
        <p className="max-w-prose text-sm text-ink-muted">
          Kate&rsquo;s ROI method in three steps. Fill in the step you&rsquo;re
          at and come back for the rest. Estimates are fine &mdash; just say
          so. Hours, never dollars.{" "}
          <a
            href={ROI_TRAINING_URL}
            target="_blank"
            rel="noopener"
            className="text-accent underline underline-offset-2"
          >
            The 30-minute training
          </a>{" "}
          walks through the same steps.
        </p>

        {/* ---------- 1 · before you build */}
        <Step
          n={1}
          open={openSteps[1]}
          onToggle={(o) => setStep(1, o)}
          lede="What kind of value, how you'll know it worked, and the baseline. A baseline is the cheapest insurance a workflow can buy: without one, a workflow that works still reads as “no measurable impact”."
        >
          <fieldset>
            <legend className="text-sm font-medium">What kind of value?</legend>
            <div role="radiogroup" aria-label="Value type" className="mt-1.5 flex flex-wrap gap-2">
              {[...VALUE_TYPES, "" as const].map((v) => (
                <button
                  key={v || "unsure"}
                  type="button"
                  role="radio"
                  aria-checked={valueType === v}
                  onClick={() => setValueType(v)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    valueType === v
                      ? "border-accent bg-accent text-white"
                      : "border-hairline-strong bg-surface hover:border-accent"
                  }`}
                >
                  {v ? VALUE_TYPE_LABELS[v] : "Not sure yet"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">
              {valueType
                ? VALUE_TYPE_DESCRIPTIONS[valueType]
                : "Time saved is the common case — a process nobody formalised still counts, and so does coverage nobody had hours for. Revenue is a rate that moves: win rate, renewals."}
            </p>
          </fieldset>

          <Field
            label="How will you know it worked?"
            hint={
              <>
                The success criterion. Write the target now, before the
                results are in, so &ldquo;did it work?&rdquo; isn&rsquo;t a
                matter of opinion later. Name what you measure, which way it
                should move, and by how much.
                <span className="mt-1 block">
                  Example: &ldquo;90% of the review&rsquo;s metrics pulled
                  automatically each month&rdquo; &mdash; not &ldquo;prep gets
                  faster.&rdquo;
                </span>
              </>
            }
          >
            <textarea
              rows={2}
              value={successCriterion}
              onChange={(e) => setSuccessCriterion(e.target.value)}
              className={textareaCls}
            />
          </Field>

          <Field
            label="What you're measuring"
            hint={
              valueType === "time_saved"
                ? "The time that goes into this today, e.g. “hours BizOps spends pulling metrics for the monthly review”."
                : valueType === "revenue"
                  ? "The rate that should move, e.g. “demo-to-close win rate”."
                  : "The metric you'll compare before and after, e.g. “hours per onboarding” or “same-day triage rate”."
            }
          >
            <input
              value={baselineMetric}
              onChange={(e) => setBaselineMetric(e.target.value)}
              className={inputCls}
            />
          </Field>

          <div
            className={`grid grid-cols-1 gap-4 ${valueType ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
          >
            <Group
              label={
                valueType === "time_saved"
                  ? "Today this takes"
                  : valueType === "revenue"
                    ? "Today's rate"
                    : "Baseline value"
              }
              hint={
                valueType === "time_saved"
                  ? "By hand, before the workflow. Half-hours are fine."
                  : valueType === "revenue"
                    ? "As a percentage, before the workflow."
                    : "The number, before."
              }
            >
              {valueInput(baselineValue, setBaselineValue, "Baseline value")}
              {valueType === "time_saved" && (
                <select
                  aria-label="Baseline period"
                  value={baselinePeriod}
                  onChange={(e) =>
                    setBaselinePeriod(e.target.value as BaselinePeriod)
                  }
                  className={`${inputCls} w-auto`}
                >
                  {BASELINE_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </Group>
            {!valueType && (
              <Field label="Unit" hint="hours, tickets, %…">
                <input
                  value={baselineUnit}
                  onChange={(e) => setBaselineUnit(e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}
            <Field
              label="Measured, or estimated?"
              hint="No timesheet? Ask: how much time would I block on my calendar to do this by hand? That's an estimate, and a stated estimate beats a missing baseline."
            >
              <select
                value={baselineEstimated}
                onChange={(e) =>
                  setBaselineEstimated(e.target.value as "" | "yes" | "no")
                }
                className={inputCls}
              >
                <option value="">Not said</option>
                <option value="no">Measured</option>
                <option value="yes">Estimated</option>
              </select>
            </Field>
          </div>

          <Field
            label="How you'll measure it"
            hint="Decide now and use the same method on the revisit date — a Zendesk report, calendar blocks, time tracking. If the baseline is an estimate, write the assumption here."
          >
            <input
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={inputCls}
            />
          </Field>
        </Step>

        {/* ---------- 2 · at launch */}
        <Step
          n={2}
          open={openSteps[2]}
          onToggle={(o) => setStep(2, o)}
          lede="What it cost to build, what you expect it to save, and when to come back and check. Expected ROI decides whether the build was worth it; the actual number comes later."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Hours spent building"
              hint="A rough estimate is fine — “about a day” is 8. We weigh time spent against time saved."
            >
              <input
                type="number"
                step="any"
                min="0"
                value={buildHours}
                onChange={(e) => setBuildHours(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field
              label="Maintenance, hours a year"
              hint="Count it if it's more than a few hours a year; it applies from year two. Leave blank for none."
            >
              <input
                type="number"
                step="any"
                min="0"
                value={maintenance}
                onChange={(e) => setMaintenance(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Group
            label={
              valueType === "time_saved"
                ? "Expected after launch"
                : valueType === "revenue"
                  ? "Expected rate"
                  : "Expected value"
            }
            hint={
              valueType === "time_saved"
                ? "Hours the task should take once the workflow is in place. “90% automated” on 10 hours a month is 1."
                : valueType === "revenue"
                  ? "The rate you expect once the workflow is in place."
                  : "The number you expect, in the baseline's unit."
            }
          >
            {valueInput(expectedValue, setExpectedValue, "Expected value")}
            {valueType === "time_saved" && removed !== null && (
              <span className="text-sm text-ink-faint">
                = {fmtPct(removed)} of that time removed
              </span>
            )}
          </Group>
          {valueType === "time_saved" ? (
            <RoiReadout result={expected} label="Expected" />
          ) : valueType === "revenue" ? (
            <p className="text-xs text-ink-faint">
              Revenue cases are reported in the audience&rsquo;s language
              &mdash; &ldquo;about two and a half more deals a year for a week
              of build.&rdquo; The percentage needs a deal value, so it goes
              in Kate&rsquo;s confirmation note, not here.
            </p>
          ) : null}
          <Field
            label="Revisit date"
            hint="When will the process have run about three times? That's the earliest actual ROI is worth measuring. Put it in the calendar."
          >
            <input
              type="date"
              value={revisitOn}
              onChange={(e) => setRevisitOn(e.target.value)}
              className={inputCls}
            />
          </Field>
        </Step>

        {/* ---------- 3 · on the revisit date */}
        <Step
          n={3}
          open={openSteps[3]}
          onToggle={(o) => setStep(3, o)}
          lede="The measurement, taken the same way as the baseline. Below expected and still positive is the most common outcome, and a fine one. This is the half Kate confirms."
        >
          <Group
            label={
              valueType === "time_saved"
                ? "Actual, after launch"
                : valueType === "revenue"
                  ? "Actual rate"
                  : "Post value"
            }
            hint="Measured the same way, over the same window, as the baseline. Leave blank until it has really been measured."
          >
            {valueInput(postValue, setPostValue, "Actual value")}
          </Group>
          {valueType === "time_saved" && (
            <RoiReadout result={actual} label="Actual" compare={expected} />
          )}
          <Field
            label="Net impact statement"
            hint="One plain sentence of net impact, in hours and counts. The button drafts it from the numbers; edit it to say what actually happened."
          >
            <textarea
              rows={2}
              value={netImpact}
              onChange={(e) => setNetImpact(e.target.value)}
              className={textareaCls}
            />
          </Field>
          {actual.ok && (
            <button
              type="button"
              onClick={() => setNetImpact(netImpactDraft(actual.figures))}
              className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper"
            >
              Use the numbers
            </button>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Was the success criterion met?"
              hint="Leave on Not yet until there's a real measurement behind the answer."
            >
              <select
                value={successMet}
                onChange={(e) => setSuccessMet(e.target.value as typeof successMet)}
                className={inputCls}
              >
                {(["not_yet", "yes", "no"] as const).map((v) => (
                  <option key={v} value={v}>
                    {SUCCESS_MET_LABELS[v]}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Where's the measurement?"
              hint="Measured means both numbers are in and the method matched."
            >
              <select
                value={roiStatus}
                onChange={(e) =>
                  setRoiStatus(e.target.value as typeof roiStatus)
                }
                className={inputCls}
              >
                <option value="not_yet_measurable">Not measurable yet</option>
                <option value="in_progress">Measuring now</option>
                <option value="complete">Measured</option>
              </select>
            </Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">
              Net outcome positive and primarily attributable to the AI
              workflow?
            </legend>
            <div className="mt-1.5 flex gap-5 text-sm">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="positive"
                  checked={isPositive === "yes"}
                  onChange={() => setIsPositive("yes")}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="positive"
                  checked={isPositive === "no"}
                  onChange={() => setIsPositive("no")}
                />
                No
              </label>
              <label className="inline-flex items-center gap-1.5 text-ink-faint">
                <input
                  type="radio"
                  name="positive"
                  checked={isPositive === ""}
                  onChange={() => setIsPositive("")}
                />
                Not assessed
              </label>
            </div>
          </fieldset>
        </Step>
      </section>

      {error && <ErrorNote result={error} />}

      <div className="flex items-center gap-3 border-t border-hairline pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
