"use client";

import { useState, useTransition } from "react";
import {
  CHECKPOINT_CONTINUE,
  CHECKPOINT_DISMISSED,
  checkpointSavedOutcome,
  settledLine,
} from "@/lib/ai/decision";
import {
  reframedTheProblem,
  type DiscoveryCheckpoint,
} from "@/lib/ai/discovery";
import { DISCOVERY_CONSTRAINT_LABELS } from "@/lib/domain";
import { saveDiscoveryCheckpointAction } from "@/server/actions-discovery";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-40 shrink-0 text-ink-faint">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

/**
 * What a Discovery conversation concluded, waiting on a click.
 *
 * Four outcomes, and only two of them write. "Draft use case from this" saves
 * the checkpoint and then asks the Coach for a `propose_use_case` card — it
 * does not create a record, and there is deliberately no second create path in
 * this application. The casebook still receives nothing until the human
 * accepts that separate card.
 *
 * Same settlement rule as every other proposal card: a conversation reopened
 * from Recent replays its proposals, and a checkpoint already decided shows
 * what was decided instead of offering the buttons again. Saving twice would
 * be two checkpoints of one moment.
 */
export function DiscoveryCheckpointCard({
  checkpoint,
  chatId,
  onDecision,
  settled,
}: {
  checkpoint: DiscoveryCheckpoint;
  chatId?: string;
  onDecision: (outcome: string) => void;
  /** The outcome recorded when this card was decided in an earlier sitting. */
  settled?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<"saved" | "drafting" | null>(null);
  const [decided, setDecided] = useState(false);

  const isDecided = decided || settled !== undefined;
  const showStartedAs = reframedTheProblem(checkpoint);
  const questions = checkpoint.unresolvedQuestions ?? [];

  function save(draftUseCase: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await saveDiscoveryCheckpointAction(
        chatId ?? null,
        checkpoint,
      );
      if (res.error || !res.id) {
        setError(res.error ?? "That didn't save. Try again.");
        return;
      }
      setSaved(draftUseCase ? "drafting" : "saved");
      setDecided(true);
      onDecision(checkpointSavedOutcome(res.id, draftUseCase));
    });
  }

  return (
    <div className="my-2 rounded-md border border-hairline-strong bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Discovery checkpoint — nothing saves without you
      </p>
      <h3 className="mt-1.5 font-serif text-lg">{checkpoint.workingTitle}</h3>

      <dl className="mt-3 space-y-1 border-t border-hairline pt-3">
        <Row label="What we're solving" value={checkpoint.refinedProblem} />
        {/* Only when the framing actually moved — showing an unchanged
            "Started as" next to the refined problem reads as a mistake. */}
        {showStartedAs && (
          <Row label="Started as" value={checkpoint.statedProblem} />
        )}
        <Row label="Today, without this" value={checkpoint.baseline} />
        <Row label="Where it breaks" value={checkpoint.failurePoint} />
      </dl>

      <div className="mt-3 border-t border-hairline pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Dominant constraint
        </p>
        <p className="mt-1 text-sm font-medium">
          {DISCOVERY_CONSTRAINT_LABELS[checkpoint.dominantConstraint]}
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {checkpoint.dominantConstraintDetail}
        </p>
      </div>

      <div className="mt-3 border-t border-hairline pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Best next step
        </p>
        <p className="mt-1 text-sm">{checkpoint.nextAction}</p>
        <dl className="mt-2 space-y-1">
          <Row
            label="What it should teach us"
            value={checkpoint.expectedLearning}
          />
          <Row label="Why this step" value={checkpoint.whyThisStep} />
          <Row label="Owner" value={checkpoint.owner} />
          <Row label="Come back when" value={checkpoint.returnCondition} />
        </dl>
      </div>

      {questions.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Still unresolved
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-ink-muted">
            {questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {saved ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm">
          {saved === "drafting"
            ? "Saved. Drafting a use case from it below — nothing reaches the casebook until you accept that card."
            : "Saved. Come back when you've learned something and we'll pick it up."}
        </p>
      ) : isDecided ? (
        <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-faint">
          {settled ? settledLine(settled) : "Decision recorded."}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-hairline pt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => save(false)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save checkpoint"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => save(true)}
            className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper disabled:opacity-60"
          >
            Draft use case from this
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setDecided(true);
              onDecision(CHECKPOINT_CONTINUE);
            }}
            className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-paper disabled:opacity-60"
          >
            Keep talking
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setDecided(true);
              onDecision(CHECKPOINT_DISMISSED);
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
