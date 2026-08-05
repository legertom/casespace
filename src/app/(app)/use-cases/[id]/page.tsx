import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import {
  DEPARTMENT_LABELS,
  STATUS_LABELS,
  documentedGatesComplete,
  isQualifiedPlus,
  roiGaps,
} from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { canEditUseCase } from "@/lib/permissions";
import { getUseCase } from "@/server/use-case-queries";
import { DeleteUseCase } from "@/components/delete-use-case";
import { QualifiedPlusBadge, StatusBadge } from "@/components/status-badge";
import { StatusControls } from "@/components/status-controls";

const RATING_LABELS: [keyof RatingSource, string][] = [
  ["ratingFrequency", "Frequency"],
  ["ratingPain", "Pain"],
  ["ratingDataAvailability", "Data availability"],
  ["ratingRisk", "Risk"],
  ["ratingOwnershipClarity", "Ownership clarity"],
  ["ratingEvaluationClarity", "Evaluation clarity"],
  ["ratingMaintenanceBurden", "Maintenance burden"],
];

interface RatingSource {
  ratingFrequency: number | null;
  ratingPain: number | null;
  ratingDataAvailability: number | null;
  ratingRisk: number | null;
  ratingOwnershipClarity: number | null;
  ratingEvaluationClarity: number | null;
  ratingMaintenanceBurden: number | null;
}

function Gate({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
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

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const uc = await getUseCase(id).catch(() => null);
  if (!uc) notFound();

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
  const qualifiedPlus = isQualifiedPlus(uc);
  const gates = documentedGatesComplete(uc);
  const gaps = roiGaps(uc);

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-ink-faint">
            <Link href="/use-cases" className="hover:text-accent">
              Use cases
            </Link>{" "}
            / {uc.department ? DEPARTMENT_LABELS[uc.department] : "Unassigned"}
          </p>
          <h1 className="mt-1 font-serif text-4xl leading-tight">{uc.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusBadge status={uc.status} />
            {qualifiedPlus && <QualifiedPlusBadge />}
            {uc.rejectionReason && editable && (
              <span className="text-sm text-flag">
                Rejected at the gate — see note below
              </span>
            )}
          </div>
        </div>
        {editable && (
          <Link
            href={`/use-cases/${uc.id}/edit`}
            className="rounded-md border border-hairline-strong px-3.5 py-1.5 text-sm hover:bg-surface"
          >
            Edit
          </Link>
        )}
      </div>

      {uc.rejectionReason && editable && (
        <div className="mt-6 max-w-2xl border-l-2 border-flag bg-surface px-4 py-3">
          <p className="text-sm">
            <strong>Rejected at the Qualified gate.</strong> {uc.rejectionReason}
          </p>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="font-serif text-2xl">What it does</h2>
            <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed">
              {uc.description}
            </p>
            {uc.aiTools.length > 0 && (
              <p className="mt-4 text-sm text-ink-muted">
                <strong className="text-ink">Tools:</strong>{" "}
                {uc.aiTools.join(", ")}
                {uc.approach && (
                  <>
                    {" · "}
                    <strong className="text-ink">Approach:</strong>{" "}
                    {uc.approach}
                  </>
                )}
              </p>
            )}
          </section>

          {uc.currentSteps.length > 0 && (
            <section>
              <h2 className="font-serif text-2xl">The workflow, start to finish</h2>
              <ol className="mt-3 max-w-prose list-decimal space-y-1.5 pl-5 leading-relaxed">
                {uc.currentSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </section>
          )}

          {RATING_LABELS.some(([k]) => uc[k] !== null) && (
            <section>
              <h2 className="font-serif text-2xl">Worksheet ratings</h2>
              <dl className="mt-3 grid max-w-prose grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                {RATING_LABELS.filter(([k]) => uc[k] !== null).map(([k, label]) => (
                  <div key={k} className="flex items-baseline justify-between border-b border-hairline pb-1.5">
                    <dt className="text-sm text-ink-muted">{label}</dt>
                    <dd className="text-sm font-semibold">{uc[k]} / 5</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {uc.functionalLeaderSuccess && (
            <section>
              <h2 className="font-serif text-2xl">
                The functional leader&rsquo;s view of success
              </h2>
              <p className="mt-3 max-w-prose leading-relaxed">
                {uc.functionalLeaderSuccess}
              </p>
            </section>
          )}

          <section>
            <h2 className="font-serif text-2xl">Success &amp; ROI</h2>
            {uc.successCriterion ? (
              <p className="mt-3 max-w-prose leading-relaxed">
                <strong>Success criterion:</strong> {uc.successCriterion}{" "}
                <span className="text-ink-muted">
                  (
                  {uc.successCriterionMet === "yes"
                    ? "met"
                    : uc.successCriterionMet === "no"
                      ? "not met"
                      : "not yet evaluated"}
                  )
                </span>
              </p>
            ) : (
              <p className="mt-3 text-ink-muted">No success criterion defined yet.</p>
            )}

            <div className="mt-4 max-w-prose rounded-md border border-hairline bg-surface p-4">
              {uc.roiStatus === "not_yet_measurable" ? (
                <p className="text-sm text-ink-muted">
                  ROI isn&rsquo;t measurable yet
                  {uc.revisitOn ? ` — revisit on ${fmtDate(uc.revisitOn)}` : ""}.
                  Never fake a number.
                </p>
              ) : (
                <dl className="space-y-2 text-sm">
                  {uc.baselineMetric && (
                    <div>
                      <dt className="font-medium">Baseline — {uc.baselineMetric}</dt>
                      <dd className="text-ink-muted">
                        {uc.baselineValue ?? "—"} {uc.baselineUnit ?? ""}
                        {uc.postValue !== null &&
                          ` → ${uc.postValue} ${uc.baselineUnit ?? ""} after`}
                      </dd>
                    </div>
                  )}
                  {uc.measurementMethod && (
                    <div>
                      <dt className="font-medium">Method</dt>
                      <dd className="text-ink-muted">{uc.measurementMethod}</dd>
                    </div>
                  )}
                  {uc.netImpactStatement && (
                    <div>
                      <dt className="font-medium">Net impact</dt>
                      <dd className="text-ink-muted">{uc.netImpactStatement}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-medium">Outcome</dt>
                    <dd className="text-ink-muted">
                      {uc.isPositive === true
                        ? "Positive, attributable to the AI workflow"
                        : uc.isPositive === false
                          ? "Not positive"
                          : "Not yet assessed"}
                      {" · "}
                      {uc.roiStatus === "complete"
                        ? "scoring complete"
                        : "measurement in progress"}
                    </dd>
                  </div>
                </dl>
              )}
              {uc.status === "qualified" && gaps.length > 0 && (
                <div className="mt-3 border-t border-hairline pt-3">
                  <p className="text-sm font-medium">
                    Standing between this record and Qualified+:
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-ink-muted">
                    {gaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {qualifiedPlus && (
                <p className="mt-3 border-t border-hairline pt-3 text-sm">
                  <QualifiedPlusBadge /> — derived automatically: Qualified with
                  complete, positive ROI scoring. Never hand-set.
                </p>
              )}
            </div>
          </section>

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
                      <>Logged into the ledger at {STATUS_LABELS[h.toStatus]}</>
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
              <div>
                <dt className="text-ink-faint">
                  {uc.authors.length === 1 ? "Author" : "Authors"}
                </dt>
                <dd className="mt-0.5">
                  {uc.authors.length
                    ? uc.authors.map((a) => a.displayName).join(", ")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Owner</dt>
                <dd className="mt-0.5">{uc.ownerName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Counts toward</dt>
                <dd className="mt-0.5">{uc.eltOrgName ?? "Unallocated"}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Team</dt>
                <dd className="mt-0.5">
                  {[
                    uc.department ? DEPARTMENT_LABELS[uc.department] : null,
                    uc.teamName,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
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
              <Gate ok={uc.gateNamed}>Named workflow, clear description</Gate>
              <Gate ok={uc.gateTool}>AI tool &amp; approach identified</Gate>
              <Gate ok={uc.gateAdoption}>
                Adoption beyond the author(s)
                {uc.adoptionEvidence && (
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {uc.adoptionEvidence}
                  </span>
                )}
              </Gate>
              <Gate ok={uc.gateOwner}>A named owner</Gate>
            </ul>
          </div>

          <StatusControls
            id={uc.id}
            current={uc.status}
            role={user.role}
            canEdit={editable}
          />
        </aside>
      </div>
    </article>
  );
}
