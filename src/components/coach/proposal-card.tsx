"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Proposal } from "@/lib/ai/proposal";
import { proposalToCreateInput } from "@/lib/ai/proposal";
import { computeGapFlags } from "@/lib/gap-flags";
import { DEPARTMENT_LABELS, STATUS_LABELS } from "@/lib/domain";
import {
  acceptProposalAction,
  acceptUpdateProposalAction,
} from "@/server/actions-ai";

interface BaseProps {
  onDecision: (outcome: string) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-28 shrink-0 text-ink-faint">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}

export function ProposalCard({
  proposal,
  source,
  onDecision,
}: BaseProps & { proposal: Proposal; source: "wizard" | "notes" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [decided, setDecided] = useState(false);
  const gaps = computeGapFlags(proposalToCreateInput(proposal));

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptProposalAction(proposal, source);
      if (res.error) setError(res.error);
      else if (res.id) {
        setSavedId(res.id);
        setDecided(true);
        onDecision(`Accepted — record created at /use-cases/${res.id}`);
      }
    });
  }

  function openInForm() {
    sessionStorage.setItem(
      "casespace-prefill",
      JSON.stringify(proposalToCreateInput(proposal)),
    );
    setDecided(true);
    onDecision(
      "The human chose to review and edit it in the form before saving.",
    );
    router.push("/use-cases/new/review");
  }

  function dismiss() {
    setDecided(true);
    onDecision("Dismissed — do not save this. Ask what to change if unclear.");
  }

  return (
    <div className="my-2 rounded-md border border-hairline-strong bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Proposed use case — nothing saves without you
      </p>
      <h3 className="mt-1.5 font-serif text-lg">{proposal.title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{proposal.description}</p>
      <dl className="mt-3 space-y-1 border-t border-hairline pt-3">
        <Row
          label="Department"
          value={proposal.department ? DEPARTMENT_LABELS[proposal.department] : null}
        />
        <Row label="Team" value={proposal.team} />
        <Row label="Authors" value={proposal.authors?.join(", ")} />
        <Row label="Owner" value={proposal.owner} />
        <Row
          label="Tooling"
          value={
            [proposal.aiTools?.join(", "), proposal.approach]
              .filter(Boolean)
              .join(" · ") || null
          }
        />
        <Row
          label="Steps"
          value={
            proposal.currentSteps?.length
              ? `${proposal.currentSteps.length} steps captured`
              : null
          }
        />
        <Row label="Success" value={proposal.successCriterion} />
        <Row
          label="ROI"
          value={
            proposal.baselineMetric
              ? `${proposal.baselineMetric}: ${proposal.baselineValue ?? "?"} ${proposal.baselineUnit ?? ""}${proposal.postValue != null ? ` → ${proposal.postValue}` : ""}`
              : proposal.roiStatus === "not_yet_measurable"
                ? `Not yet measurable${proposal.revisitOn ? `, revisit ${proposal.revisitOn}` : ""}`
                : null
          }
        />
        <Row
          label="Starts at"
          value={STATUS_LABELS[proposal.status ?? "in_discovery"]}
        />
      </dl>

      {gaps.length > 0 && !savedId && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-xs font-semibold text-flag">Gaps</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {savedId ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm">
          Logged.{" "}
          <a
            href={`/use-cases/${savedId}`}
            className="text-accent underline underline-offset-2"
          >
            Open the record →
          </a>
        </p>
      ) : decided ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-faint">
          Decision recorded.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
          <button
            type="button"
            onClick={accept}
            disabled={pending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
          >
            {pending ? "Saving…" : "Log it"}
          </button>
          <button
            type="button"
            onClick={openInForm}
            className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper"
          >
            Edit in form first
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="px-2 py-1.5 text-sm text-ink-faint hover:text-accent"
          >
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function UpdateProposalCard({
  id,
  reason,
  changes,
  onDecision,
}: BaseProps & { id: string; reason: string; changes: Partial<Proposal> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [decided, setDecided] = useState(false);

  const changeList = Object.entries(changes)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ({
      field: k,
      value: Array.isArray(v) ? v.join("; ") : String(v ?? "—"),
    }));

  return (
    <div className="my-2 rounded-md border border-hairline-strong bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Proposed edit — nothing changes without you
      </p>
      <p className="mt-1.5 text-sm">{reason}</p>
      <dl className="mt-3 space-y-1 border-t border-hairline pt-3">
        {changeList.map((c) => (
          <div key={c.field} className="flex gap-2 text-sm">
            <dt className="w-40 shrink-0 text-ink-faint">{c.field}</dt>
            <dd className="min-w-0 break-words">{c.value}</dd>
          </div>
        ))}
      </dl>
      {done ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm">
          Applied.{" "}
          <a
            href={`/use-cases/${id}`}
            className="text-accent underline underline-offset-2"
          >
            Open the record →
          </a>
        </p>
      ) : decided ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-faint">
          Decision recorded.
        </p>
      ) : (
        <div className="mt-3 flex gap-2 border-t border-hairline pt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await acceptUpdateProposalAction(id, changes);
                if (res.error) setError(res.error);
                else {
                  setDone(true);
                  setDecided(true);
                  onDecision("Accepted — the record was updated.");
                }
              });
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
          >
            {pending ? "Applying…" : "Apply the edit"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDecided(true);
              onDecision("Dismissed — leave the record as it is.");
            }}
            className="px-2 py-1.5 text-sm text-ink-faint hover:text-accent"
          >
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
