"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions";
import {
  APPROACHES,
  APPROACH_LABELS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  RATING_FIELDS,
  STATUSES,
  STATUS_LABELS,
  type Approach,
  type Department,
  type RatingKey,
} from "@/lib/domain";
import type { PersonRef, UseCaseCreateInput } from "@/lib/use-case-input";
import { ErrorNote } from "./error-note";
import { PeoplePicker, type PersonOption } from "./people-picker";

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
  hint?: string;
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

const inputCls =
  "w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm";
/** Textareas resize vertically only — dragging one wider would break the column. */
const textareaCls = `${inputCls} resize-y`;

export function UseCaseForm({
  people,
  teams,
  eltOrgs,
  initial = {},
  mode,
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
  const [baselineMetric, setBaselineMetric] = useState(
    initial.baselineMetric ?? "",
  );
  const [baselineValue, setBaselineValue] = useState(
    initial.baselineValue?.toString() ?? "",
  );
  const [baselineUnit, setBaselineUnit] = useState(initial.baselineUnit ?? "");
  const [postValue, setPostValue] = useState(
    initial.postValue?.toString() ?? "",
  );
  const [method, setMethod] = useState(initial.measurementMethod ?? "");
  const [netImpact, setNetImpact] = useState(initial.netImpactStatement ?? "");
  const [isPositive, setIsPositive] = useState<string>(
    initial.isPositive === true ? "yes" : initial.isPositive === false ? "no" : "",
  );
  const [roiStatus, setRoiStatus] = useState(
    initial.roiStatus ?? "not_yet_measurable",
  );
  const [revisitOn, setRevisitOn] = useState(initial.revisitOn ?? "");
  const [status, setStatus] = useState(initial.status ?? "in_discovery");
  const isEdit = mode === "edit";

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
      baselineMetric: baselineMetric.trim() || null,
      baselineValue: baselineValue === "" ? null : Number(baselineValue),
      baselineUnit: baselineUnit.trim() || null,
      postValue: postValue === "" ? null : Number(postValue),
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

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
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

      {/* ------------------------------------------------ success + ROI */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Success &amp; ROI</h2>
        <Field
          label="Success criterion"
          hint="The measurable definition of success, captured at intake."
        >
          <textarea
            rows={2}
            value={successCriterion}
            onChange={(e) => setSuccessCriterion(e.target.value)}
            className={textareaCls}
          />
        </Field>
        <Field
          label="Success criterion met?"
          hint="Leave on Not yet until there's a real measurement behind the answer."
        >
          <select
            value={successMet}
            onChange={(e) => setSuccessMet(e.target.value as typeof successMet)}
            className={inputCls}
          >
            <option value="not_yet">Not yet</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm text-ink-muted">
            ROI is measured in counts and rates — never dollars. Baseline and
            post-measurement must use the same methodology. If it isn&rsquo;t
            measurable yet, say so honestly and set a revisit date.
          </p>
          <div className="mt-4 space-y-4">
            <Field label="ROI status">
              <select
                value={roiStatus}
                onChange={(e) =>
                  setRoiStatus(e.target.value as typeof roiStatus)
                }
                className={inputCls}
              >
                <option value="not_yet_measurable">Not yet measurable</option>
                <option value="in_progress">Measurement in progress</option>
                <option value="complete">Complete</option>
              </select>
            </Field>
            {roiStatus === "not_yet_measurable" && (
              <Field label="Revisit on">
                <input
                  type="date"
                  value={revisitOn}
                  onChange={(e) => setRevisitOn(e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Baseline metric"
                hint="What you measured before the AI workflow, e.g. hours per onboarding."
              >
                <input
                  value={baselineMetric}
                  onChange={(e) => setBaselineMetric(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Baseline value" hint="The number, before.">
                <input
                  type="number"
                  step="any"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Unit" hint="hours, tickets, %…">
                <input
                  value={baselineUnit}
                  onChange={(e) => setBaselineUnit(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Post value"
                hint="The same metric after the workflow, measured the same way."
              >
                <input
                  type="number"
                  step="any"
                  value={postValue}
                  onChange={(e) => setPostValue(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field
                label="Measurement method"
                hint="How the numbers were captured, e.g. a Zendesk report or time tracking. Baseline and post must use the same method."
                className="sm:col-span-2"
              >
                <input
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field
              label="Net impact statement"
              hint="One plain-English sentence of net impact."
            >
              <textarea
                rows={2}
                value={netImpact}
                onChange={(e) => setNetImpact(e.target.value)}
                className={textareaCls}
              />
            </Field>
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
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ status (create only) */}
      {!isEdit && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Where does it stand?</h2>
          <Field
            label="Status"
            hint="Qualified is granted later by an admin — it records Kate's approval."
          >
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as typeof status)
              }
              className={inputCls}
            >
              {STATUSES.filter((s) => s !== "qualified").map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        </section>
      )}

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
