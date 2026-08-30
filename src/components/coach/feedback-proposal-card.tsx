"use client";

import { useState, useTransition } from "react";
import {
  DISMISSED_FEEDBACK,
  FEEDBACK_FILED,
  settledLine,
} from "@/lib/ai/decision";
import {
  FEEDBACK_KIND_LABELS,
  type FeedbackProposal,
} from "@/lib/ai/feedback-proposal";
import { acceptFeedbackProposalAction } from "@/server/actions-feedback";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-28 shrink-0 text-ink-faint">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

export function FeedbackProposalCard({
  proposal,
  onDecision,
  settled,
}: {
  proposal: FeedbackProposal;
  onDecision: (outcome: string) => void;
  /** The outcome recorded when this card was decided in an earlier sitting. */
  settled?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filed, setFiled] = useState(false);
  const [decided, setDecided] = useState(false);

  const isFiled = filed || settled === FEEDBACK_FILED;
  const isDecided = decided || settled !== undefined;

  return (
    <div className="my-2 rounded-md border border-hairline-strong bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Product feedback — nothing files without you
      </p>
      <h3 className="mt-1.5 font-serif text-lg">{proposal.summary}</h3>
      <dl className="mt-3 space-y-1 border-t border-hairline pt-3">
        <Row label="What happened" value={proposal.whatHappened} />
        <Row label="Expected" value={proposal.expected} />
        <Row label="Where" value={proposal.area} />
        {/* Labelled as the Coach's own, on the card as in the filed message —
            an admin should never have to guess which part a person said. */}
        <Row
          label="Coach's read"
          value={proposal.kind ? FEEDBACK_KIND_LABELS[proposal.kind] : null}
        />
      </dl>

      {isFiled ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm">
          Filed. The program admins see it on the feedback page.
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
                const res = await acceptFeedbackProposalAction(proposal);
                if (res.error) setError(res.error);
                else {
                  setFiled(true);
                  setDecided(true);
                  onDecision(FEEDBACK_FILED);
                }
              });
            }}
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
          >
            {pending ? "Filing…" : "File it"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDecided(true);
              onDecision(DISMISSED_FEEDBACK);
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
