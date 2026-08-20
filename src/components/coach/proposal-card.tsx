"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Proposal } from "@/lib/ai/proposal";
import { proposalToCreateInput } from "@/lib/ai/proposal";
import {
  createdOutcome,
  DISMISSED_CREATE,
  DISMISSED_UPDATE,
  OPENED_IN_FORM,
  recordIdFromOutcome,
  settledLine,
  UPDATED,
} from "@/lib/ai/decision";
import { computeGapFlags } from "@/lib/gap-flags";
import {
  approachLabels,
  DEPARTMENT_LABELS,
  GATE_FIELDS,
  RATING_FIELDS,
  STATUS_LABELS,
  SUCCESS_MET_LABELS,
} from "@/lib/domain";
import { urlDisplayLabel } from "@/lib/use-case-urls";
import {
  acceptProposalAction,
  acceptUpdateProposalAction,
} from "@/server/actions-ai";
import {
  addDismissReasonAction,
  recordDecisionAction,
  recordProposedAction,
} from "@/server/actions-coach-events";

interface BaseProps {
  onDecision: (outcome: string) => void;
  /**
   * The outcome already recorded for this proposal, when the human decided it
   * in an earlier sitting — undefined while the decision is still open.
   *
   * A conversation reopened from the sidebar replays its proposals, and a
   * decision made once must not be put a second time: the buttons would write
   * a duplicate record, and the card would log its proposal to `coach_events`
   * afresh, as though nobody had ever answered it.
   */
  settled?: string;
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
  proposalRef,
  chatId,
  onDecision,
  settled,
}: BaseProps & {
  proposal: Proposal;
  source: "wizard" | "notes";
  /** Correlates this card's four possible outcomes in `coach_events`. */
  proposalRef: string;
  chatId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [decided, setDecided] = useState(false);
  const [askingWhy, setAskingWhy] = useState(false);
  const [why, setWhy] = useState("");
  const [thanked, setThanked] = useState(false);
  const logged = useRef(false);
  const gaps = computeGapFlags(proposalToCreateInput(proposal));
  // Shown as a count, like Steps: seven rows of numbers would bury the fields
  // people actually correct.
  const ratingsGiven = RATING_FIELDS.filter(
    ([key]) => proposal[key] != null,
  ).length;

  // A record logged in an earlier sitting is still reachable: its id rode along
  // in the outcome, so the reopened card keeps its link to the record.
  const shownId = savedId ?? (settled ? recordIdFromOutcome(settled) : null);
  const isDecided = decided || settled !== undefined;

  // The card is the moment worth measuring: what the Coach guessed, before
  // anyone touched it. Recorded once, even though streaming re-renders this —
  // and never on a card that arrives already settled, whose proposal was
  // logged when it was new.
  useEffect(() => {
    if (settled !== undefined || logged.current) return;
    logged.current = true;
    void recordProposedAction({
      proposalRef,
      chatId,
      door: source,
      proposed: { ...proposalToCreateInput(proposal), teamName: proposal.team ?? null },
    });
  }, [proposal, proposalRef, chatId, source, settled]);

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptProposalAction(proposal, source);
      if (res.error) setError(res.error);
      else if (res.id) {
        setSavedId(res.id);
        setDecided(true);
        void recordDecisionAction({
          proposalRef,
          chatId,
          door: source,
          kind: "accepted",
          useCaseId: res.id,
        });
        onDecision(createdOutcome(res.id));
      }
    });
  }

  function openInForm() {
    sessionStorage.setItem(
      "casespace-prefill",
      JSON.stringify({
        input: proposalToCreateInput(proposal),
        source,
        proposalRef,
        proposedTeamName: proposal.team ?? null,
      }),
    );
    setDecided(true);
    onDecision(OPENED_IN_FORM);
    router.push("/use-cases/new/review");
  }

  // Recorded on the click, not on the explanation — see addDismissReasonAction.
  function dismiss() {
    setDecided(true);
    setAskingWhy(true);
    void recordDecisionAction({
      proposalRef,
      chatId,
      door: source,
      kind: "dismissed",
    });
    onDecision(DISMISSED_CREATE);
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
            [proposal.aiTools?.join(", "), approachLabels(proposal.approaches ?? [])]
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
        {/* Text, not anchors: nothing here is saved yet, and a link the human
            hasn't accepted shouldn't be one click from opening. */}
        <Row
          label="Links"
          value={
            proposal.urls?.length
              ? proposal.urls
                  .map((u) => `${urlDisplayLabel(u)}: ${u.url}`)
                  .join(" · ")
              : null
          }
        />
        <Row
          label="Build time"
          value={
            proposal.buildHours != null
              ? `${proposal.buildHours} ${proposal.buildHours === 1 ? "hour" : "hours"}`
              : null
          }
        />
        <Row
          label="Ratings"
          value={
            ratingsGiven > 0 ? `${ratingsGiven} of 7 rated` : null
          }
        />
        <Row label="Success" value={proposal.successCriterion} />
        <Row
          label="Success met"
          value={
            proposal.successCriterionMet
              ? SUCCESS_MET_LABELS[proposal.successCriterionMet]
              : null
          }
        />
        <Row label="Adoption" value={proposal.adoptionEvidence} />
        {/* Shown in full, ticked or not: these four decide whether the record
            counts as documented, and clicking Log it is the moment a person
            takes responsibility for them. An unshown tick is a guess nobody
            can audit later. */}
        <Row
          label="Gates"
          value={
            <ul className="space-y-0.5">
              {GATE_FIELDS.map(([key, label]) => (
                <li
                  key={key}
                  className={proposal[key] ? "" : "text-ink-faint"}
                >
                  {proposal[key] ? "✓" : "○"} {label}
                </li>
              ))}
            </ul>
          }
        />
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

      {gaps.length > 0 && !shownId && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-xs font-semibold text-flag">Gaps</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
            {gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {shownId ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm">
          Logged.{" "}
          <a
            href={`/use-cases/${shownId}`}
            className="text-accent underline underline-offset-2"
          >
            Open the record →
          </a>
        </p>
      ) : askingWhy ? (
        <div className="mt-3 border-t border-hairline pt-3">
          {thanked ? (
            <p className="text-sm text-ink-faint">
              Noted — thank you. That goes to whoever tunes the Coach.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!why.trim()) {
                  setAskingWhy(false);
                  return;
                }
                void addDismissReasonAction(proposalRef, why);
                setThanked(true);
              }}
            >
              <label htmlFor={`why-${proposalRef}`} className="text-sm">
                What was off about it?
              </label>
              <p className="mt-0.5 text-xs text-ink-faint">
                Optional, one line. Shared with the program admins so the Coach
                gets better.
              </p>
              <div className="mt-1.5 flex gap-2">
                <input
                  id={`why-${proposalRef}`}
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="Wrong team, invented a number, missed the point…"
                  className="min-w-0 flex-1 rounded-md border border-hairline-strong bg-surface px-3 py-1.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper"
                >
                  {why.trim() ? "Send" : "Skip"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : isDecided ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-faint">
          {settled ? settledLine(settled) : "Decision recorded."}
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
  settled,
}: BaseProps & { id: string; reason: string; changes: Partial<Proposal> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [decided, setDecided] = useState(false);

  const isApplied = done || settled === UPDATED;
  const isDecided = decided || settled !== undefined;

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
      {isApplied ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm">
          Applied.{" "}
          <a
            href={`/use-cases/${id}`}
            className="text-accent underline underline-offset-2"
          >
            Open the record →
          </a>
        </p>
      ) : isDecided ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-faint">
          {settled ? settledLine(settled) : "Decision recorded."}
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
                  onDecision(UPDATED);
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
              onDecision(DISMISSED_UPDATE);
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
