import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import {
  approachLabels,
  APPROACHES,
  APPROACH_LABELS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  RATING_FIELDS,
  STATUS_LABELS,
  documentedGatesComplete,
  roiGaps,
} from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { canEditUseCase, canLinkUseCases } from "@/lib/permissions";
import { listComments, listMentionableUsers } from "@/server/comment-queries";
import { listEltOrgs, listPeopleLite, listTeams } from "@/server/reference";
import {
  listLinkableUseCases,
  listRecordLinks,
} from "@/server/use-case-link-queries";
import { getUseCase } from "@/server/use-case-queries";
import { AskCoachSelection } from "@/components/coach/ask-coach-selection";
import { CommentThread } from "@/components/comments/comment-thread";
import { DeleteUseCase } from "@/components/delete-use-case";
import { PersonLink, PersonLinks } from "@/components/person-link";
import { GateToggle } from "@/components/record/gate-toggle";
import { RelatedWorkflows } from "@/components/record/related-workflows";
import {
  InlineField,
  type Choice,
  type TeamChoice,
} from "@/components/record/inline-field";
import { ConfirmedRoiBadge, StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";

function Gate({
  ok,
  help,
  children,
}: {
  ok: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2 text-sm" title={help}>
      <span
        aria-hidden
        className={`mt-0.5 inline-flex size-4 items-center justify-center rounded-sm border text-[10px] ${
          ok
            ? "border-st-qualified bg-st-qualified text-white"
            : "border-hairline-strong text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={ok ? "" : "text-ink-muted"}>
        {children}
        <span className="sr-only">{ok ? " — met" : " — not met"}</span>
      </span>
    </li>
  );
}

/** The muted stand-in an editor sees where a field is still empty. */
function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-faint">{children}</span>;
}

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const uc = await getUseCase(id).catch(() => null);
  if (!uc) notFound();

  const [comments, mentionable, links] = await Promise.all([
    listComments(uc.id),
    listMentionableUsers(),
    listRecordLinks(uc.id),
  ]);
  // Only someone who can link needs the candidate list.
  const canLink = canLinkUseCases(user.role);
  const linkable = canLink ? await listLinkableUseCases(uc.id) : [];

  const editable = canEditUseCase(
    { id: user.id, role: user.role },
    {
      createdById: uc.createdById,
      ownerUserId: uc.ownerUserId,
      authorUserIds: uc.authors
        .map((a) => a.userId)
        .filter((x): x is string => !!x),
    },
  );

  // Pickers only matter to someone who can edit; don't make viewers pay for them.
  const [people, teams, orgs] = editable
    ? await Promise.all([listPeopleLite(), listTeams(), listEltOrgs()])
    : [[], [], []];
  const departmentChoices: Choice[] = DEPARTMENTS.map((d) => ({
    value: d,
    label: DEPARTMENT_LABELS[d],
  }));
  const teamChoices: TeamChoice[] = teams.map((t) => ({
    value: t.id,
    label: t.name,
    department: t.department,
  }));
  const orgChoices: Choice[] = orgs.map((o) => ({ value: o.id, label: o.name }));
  const approachChoices: Choice[] = APPROACHES.map((a) => ({
    value: a,
    label: APPROACH_LABELS[a],
  }));

  const record = { id: uc.id, title: uc.title };
  const confirmed = uc.status === "confirmed_positive_roi";
  const gates = documentedGatesComplete(uc);
  const gaps = roiGaps(uc);
  const ratings = Object.fromEntries(
    RATING_FIELDS.map(([k]) => [k, uc[k]]),
  ) as Record<(typeof RATING_FIELDS)[number][0], number | null>;
  const anyRating = RATING_FIELDS.some(([k]) => uc[k] !== null);
  const measuring = uc.roiStatus !== "not_yet_measurable";

  return (
    <article>
      <AskCoachSelection record={record}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm text-ink-faint">
              <Link href="/use-cases" className="hover:text-accent">
                Use cases
              </Link>{" "}
              / {uc.department ? DEPARTMENT_LABELS[uc.department] : "Unassigned"}
            </p>
            <InlineField
              record={record}
              field="title"
              label="Title"
              value={uc.title}
              editor={{ kind: "text" }}
              canEdit={editable}
              required
            >
              <h1 className="mt-1 font-serif text-4xl leading-tight">
                {uc.title}
              </h1>
            </InlineField>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusBadge status={uc.status} />
              {confirmed && <ConfirmedRoiBadge />}
              {uc.rejectionReason && editable && (
                <span className="text-sm text-flag">
                  Rejected at the gate — see note below
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {(editable || user.role === "admin") &&
              (uc.status === "launched" || uc.status === "qualified") && (
                <Link
                  href={`/coach?review=${uc.id}`}
                  className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
                >
                  Run ROI review
                </Link>
              )}
            {editable && (
              <Link
                href={`/use-cases/${uc.id}/edit`}
                className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
              >
                Edit everything
              </Link>
            )}
          </div>
        </div>

        {editable && (
          <p className="mt-4 text-sm text-ink-faint">
            Every field carries a pencil to edit it in place. Highlight any text
            to ask the Coach about it.
          </p>
        )}

        {uc.rejectionReason && editable && (
          <div className="mt-6 max-w-2xl border-l-2 border-flag bg-surface px-4 py-3">
            <p className="text-sm">
              <strong>Rejected at the Qualified gate.</strong>{" "}
              {uc.rejectionReason}
            </p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-10">
            <section>
              <h2 className="font-serif text-2xl">What it does</h2>
              <InlineField
                record={record}
                field="description"
                label="What it does"
                value={uc.description}
                editor={{ kind: "textarea", rows: 6 }}
                canEdit={editable}
                required
                className="mt-3"
              >
                <p className="max-w-prose whitespace-pre-line leading-relaxed">
                  {uc.description}
                </p>
              </InlineField>

              {(uc.aiTools.length > 0 || editable) && (
                <InlineField
                  record={record}
                  field="aiTools"
                  label="AI tools"
                  value={uc.aiTools}
                  editor={{ kind: "tags" }}
                  canEdit={editable}
                  className="mt-4"
                >
                  <p className="text-sm text-ink-muted">
                    <strong className="text-ink">Tools:</strong>{" "}
                    {uc.aiTools.length > 0 ? (
                      uc.aiTools.join(", ")
                    ) : (
                      <Empty>none named yet</Empty>
                    )}
                  </p>
                </InlineField>
              )}

              {(uc.approaches.length > 0 || editable) && (
                <InlineField
                  record={record}
                  field="approaches"
                  label="Approach"
                  value={uc.approaches}
                  editor={{ kind: "checkboxes", options: approachChoices }}
                  canEdit={editable}
                  className="mt-1.5"
                >
                  <p className="text-sm text-ink-muted">
                    <strong className="text-ink">Approach:</strong>{" "}
                    {uc.approaches.length > 0 ? (
                      approachLabels(uc.approaches)
                    ) : (
                      <Empty>not identified yet</Empty>
                    )}
                  </p>
                </InlineField>
              )}
            </section>

            {(uc.currentSteps.length > 0 || editable) && (
              <section>
                <h2 className="font-serif text-2xl">
                  The workflow, start to finish
                </h2>
                <InlineField
                  record={record}
                  field="currentSteps"
                  label="Workflow steps"
                  value={uc.currentSteps}
                  editor={{ kind: "lines", rows: 7 }}
                  canEdit={editable}
                  className="mt-3"
                >
                  {uc.currentSteps.length > 0 ? (
                    <ol className="max-w-prose list-decimal space-y-1.5 pl-5 leading-relaxed">
                      {uc.currentSteps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>
                      <Empty>
                        No steps captured yet — one step per line, as the work
                        happens today.
                      </Empty>
                    </p>
                  )}
                </InlineField>
              </section>
            )}

            {(anyRating || editable) && (
              <section>
                <h2 className="font-serif text-2xl">Worksheet ratings</h2>
                <InlineField
                  record={record}
                  label="Worksheet ratings"
                  ratings={ratings}
                  editor={{ kind: "ratings" }}
                  canEdit={editable}
                  className="mt-3"
                >
                  {anyRating ? (
                    <dl className="grid max-w-prose grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                      {RATING_FIELDS.filter(([k]) => uc[k] !== null).map(
                        ([k, label]) => (
                          <div
                            key={k}
                            className="flex items-baseline justify-between border-b border-hairline pb-1.5"
                          >
                            <dt className="text-sm text-ink-muted">{label}</dt>
                            {/* A long label may wrap; the score never should. */}
                            <dd className="shrink-0 whitespace-nowrap text-sm font-semibold">
                              {uc[k]} / 5
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  ) : (
                    <p>
                      <Empty>Not rated yet — all seven are optional.</Empty>
                    </p>
                  )}
                </InlineField>
              </section>
            )}

            {(uc.functionalLeaderSuccess || editable) && (
              <section>
                <h2 className="font-serif text-2xl">
                  The functional leader&rsquo;s view of success
                </h2>
                <InlineField
                  record={record}
                  field="functionalLeaderSuccess"
                  label="The functional leader's view of success"
                  value={uc.functionalLeaderSuccess}
                  editor={{ kind: "textarea", rows: 3 }}
                  canEdit={editable}
                  className="mt-3"
                >
                  <p className="max-w-prose leading-relaxed">
                    {uc.functionalLeaderSuccess ?? (
                      <Empty>
                        Not captured yet — what would the head of this function
                        call success?
                      </Empty>
                    )}
                  </p>
                </InlineField>
              </section>
            )}

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

            <RelatedWorkflows
              useCaseId={uc.id}
              links={links}
              candidates={linkable}
              currentUserId={user.id}
              canLink={canLink}
              canEditRecord={editable}
              isAdmin={user.role === "admin"}
            />

            <section>
              <h2 className="font-serif text-2xl">History</h2>
              <ol className="mt-3 space-y-2.5">
                {uc.history.map((h) => (
                  <li key={h.id} className="flex gap-4 text-sm">
                    <span className="w-24 shrink-0 text-ink-faint">
                      {fmtDate(h.createdAt)}
                    </span>
                    <span>
                      {h.fromStatus === null ? (
                        <>Logged into the casebook at {STATUS_LABELS[h.toStatus]}</>
                      ) : (
                        <>
                          {STATUS_LABELS[h.fromStatus]} →{" "}
                          {STATUS_LABELS[h.toStatus]}
                        </>
                      )}
                      {h.changedByName && (
                        <span className="text-ink-faint"> · {h.changedByName}</span>
                      )}
                      {h.note && (
                        <span className="block text-ink-muted">{h.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <CommentThread
              useCaseId={uc.id}
              comments={comments}
              people={mentionable}
              currentUserId={user.id}
              isAdmin={user.role === "admin"}
            />

            {editable && (
              <div className="border-t border-hairline pt-6">
                <DeleteUseCase id={uc.id} title={uc.title} />
              </div>
            )}
          </div>

          {/* ---------------------------------------------- sidebar */}
          <aside className="space-y-8">
            <div className="rounded-md border border-hairline bg-surface p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Credit
              </h2>
              <dl className="mt-3 space-y-3 text-sm">
                <InlineField
                  record={record}
                  field="authors"
                  label="Authors"
                  people={uc.authors.map((a) => ({
                    personId: a.personId,
                    userId: a.userId,
                    displayName: a.displayName,
                  }))}
                  editor={{ kind: "people", people, multiple: true }}
                  canEdit={editable}
                >
                  <div>
                    <dt className="text-ink-faint">
                      {uc.authors.length === 1 ? "Author" : "Authors"}
                    </dt>
                    <dd className="mt-0.5">
                      {uc.authors.length > 0 ? (
                        <PersonLinks people={uc.authors} />
                      ) : (
                        <Empty>nobody credited yet</Empty>
                      )}
                    </dd>
                  </div>
                </InlineField>
                <InlineField
                  record={record}
                  field="owner"
                  label="Owner"
                  people={
                    uc.ownerName
                      ? [
                          {
                            personId: uc.ownerPersonId,
                            userId: uc.ownerUserId,
                            displayName: uc.ownerName,
                          },
                        ]
                      : []
                  }
                  editor={{ kind: "people", people }}
                  canEdit={editable}
                >
                  <div>
                    <dt className="text-ink-faint">Owner</dt>
                    <dd className="mt-0.5">
                      {uc.ownerName ? (
                        <PersonLink
                          name={uc.ownerName}
                          personId={uc.ownerPersonId}
                        />
                      ) : (
                        <Empty>nobody named yet</Empty>
                      )}
                    </dd>
                  </div>
                </InlineField>
                <InlineField
                  record={record}
                  field="eltOrgId"
                  label="Counts toward (ELT org)"
                  value={uc.eltOrgId}
                  editor={{
                    kind: "select",
                    options: orgChoices,
                    empty: "Unallocated",
                  }}
                  canEdit={editable}
                >
                  <div>
                    <dt
                      className="text-ink-faint"
                      title="The ELT (executive leadership team) owner whose target this record counts toward."
                    >
                      Counts toward
                    </dt>
                    <dd className="mt-0.5">{uc.eltOrgName ?? "Unallocated"}</dd>
                  </div>
                </InlineField>
                <InlineField
                  record={record}
                  label="Department and team"
                  department={uc.department}
                  teamId={uc.teamId}
                  editor={{
                    kind: "team",
                    departments: departmentChoices,
                    teams: teamChoices,
                  }}
                  canEdit={editable}
                >
                  <div>
                    <dt className="text-ink-faint">Team</dt>
                    <dd className="mt-0.5">
                      {[
                        uc.department ? DEPARTMENT_LABELS[uc.department] : null,
                        uc.teamName,
                      ]
                        .filter(Boolean)
                        .join(" · ") || <Empty>unassigned</Empty>}
                    </dd>
                  </div>
                </InlineField>
                <div>
                  <dt className="text-ink-faint">Logged</dt>
                  <dd className="mt-0.5">
                    {fmtDate(uc.createdAt)} by {uc.createdByName ?? "—"} · via{" "}
                    {uc.source}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-md border border-hairline bg-surface p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Documented gates {gates ? "· all four met" : ""}
              </h2>
              <ul className="mt-3 space-y-2">
                {editable ? (
                  <>
                    <GateToggle
                      id={uc.id}
                      field="gateNamed"
                      checked={uc.gateNamed}
                      label="Named workflow, clear description"
                      help="The title names one specific workflow and the description explains it in plain language."
                    >
                      Named workflow, clear description
                    </GateToggle>
                    <GateToggle
                      id={uc.id}
                      field="gateTool"
                      checked={uc.gateTool}
                      label="AI tool & approach identified"
                      help="The record says which AI tool does the work, and how it is applied."
                    >
                      AI tool &amp; approach identified
                    </GateToggle>
                    <GateToggle
                      id={uc.id}
                      field="gateAdoption"
                      checked={uc.gateAdoption}
                      label="Adoption beyond the author(s)"
                      help="Someone beyond the author(s) actively uses it."
                    >
                      Adoption beyond the author(s)
                    </GateToggle>
                    <InlineField
                      record={record}
                      field="adoptionEvidence"
                      label="Adoption evidence"
                      value={uc.adoptionEvidence}
                      editor={{ kind: "textarea", rows: 3 }}
                      canEdit={editable}
                      className="pl-6"
                    >
                      <p className="text-xs text-ink-faint">
                        {uc.adoptionEvidence ?? (
                          <Empty>Who uses it, and how do you know?</Empty>
                        )}
                      </p>
                    </InlineField>
                    <GateToggle
                      id={uc.id}
                      field="gateOwner"
                      checked={uc.gateOwner}
                      label="A named owner"
                      help="One specific person is responsible for keeping it running."
                    >
                      A named owner
                    </GateToggle>
                  </>
                ) : (
                  <>
                    <Gate
                      ok={uc.gateNamed}
                      help="The title names one specific workflow and the description explains it in plain language."
                    >
                      Named workflow, clear description
                    </Gate>
                    <Gate
                      ok={uc.gateTool}
                      help="The record says which AI tool does the work, and how it is applied."
                    >
                      AI tool &amp; approach identified
                    </Gate>
                    <Gate
                      ok={uc.gateAdoption}
                      help="Someone beyond the author(s) actively uses it."
                    >
                      Adoption beyond the author(s)
                      {uc.adoptionEvidence && (
                        <span className="mt-0.5 block text-xs text-ink-faint">
                          {uc.adoptionEvidence}
                        </span>
                      )}
                    </Gate>
                    <Gate
                      ok={uc.gateOwner}
                      help="One specific person is responsible for keeping it running."
                    >
                      A named owner
                    </Gate>
                  </>
                )}
              </ul>
            </div>

            <StatusControls
              id={uc.id}
              current={uc.status}
              role={user.role}
              canEdit={editable}
              roiGaps={gaps}
            />
          </aside>
        </div>
      </AskCoachSelection>
    </article>
  );
}
