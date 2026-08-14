"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  STATUSES,
  STATUS_LABELS,
  canSetStatus,
  type Role,
  type UcStatus,
} from "@/lib/domain";
import { rejectGateAction, setStatusAction } from "@/server/actions";

interface Props {
  id: string;
  current: UcStatus;
  role: Role;
  canEdit: boolean;
  /** Open items from the ROI checklist — warns (never blocks) on confirmation. */
  roiGaps?: string[];
}

export function StatusControls({ id, current, role, canEdit, roiGaps = [] }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<UcStatus | "">("");
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const actorRole: Role = canEdit || role === "admin" ? role : "viewer";
  const options = STATUSES.filter((s) => canSetStatus(actorRole, current, s));
  if (options.length === 0 && role !== "admin") return null;

  const confirming = target === "confirmed_positive_roi";

  function apply() {
    if (!target) return;
    if (confirming && !note.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await setStatusAction(id, target as UcStatus, note.trim() || undefined);
      if (res.error) setError(res.error);
      else {
        setTarget("");
        setNote("");
        router.refresh();
      }
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const res = await rejectGateAction(id, reason);
      if (res.error) setError(res.error);
      else {
        setRejecting(false);
        setReason("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
        Move it forward
      </h2>
      {options.length > 0 && (
        <div className="space-y-2">
          <select
            aria-label="New status"
            value={target}
            onChange={(e) => setTarget(e.target.value as UcStatus | "")}
            className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
          >
            <option value="">Change status…</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
                {s === "qualified"
                  ? " (records Kate's approval)"
                  : s === "confirmed_positive_roi"
                    ? " (counts toward the 15)"
                    : ""}
              </option>
            ))}
          </select>
          {target && (
            <>
              {confirming ? (
                <>
                  {roiGaps.length > 0 && (
                    <div className="border-l-2 border-flag bg-flag-wash px-3 py-2 text-sm">
                      <p className="font-medium">
                        Heads up — the ROI checklist still lists:
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-muted">
                        {roiGaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                      <p className="mt-1 text-ink-muted">
                        You can still confirm — the call is yours.
                      </p>
                    </div>
                  )}
                  <label
                    htmlFor="annual-roi-note"
                    className="block text-sm font-medium"
                  >
                    Annual ROI (required)
                  </label>
                  <textarea
                    id="annual-roi-note"
                    placeholder="State the measured annual ROI — this line rolls up into the end-of-year wins report."
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
                  />
                </>
              ) : (
                <input
                  aria-label="Note (optional)"
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
                />
              )}
              <button
                type="button"
                onClick={apply}
                disabled={pending || (confirming && !note.trim())}
                className="w-full rounded-md bg-ink px-3 py-2 text-sm text-paper hover:bg-ink/85 disabled:opacity-60"
              >
                {pending ? "Applying…" : `Move to ${STATUS_LABELS[target as UcStatus]}`}
              </button>
            </>
          )}
        </div>
      )}

      {role === "admin" && (current === "launched" || current === "qualified") && (
        <div className="border-t border-hairline pt-3">
          {!rejecting ? (
            <button
              type="button"
              onClick={() => setRejecting(true)}
              className="text-sm text-ink-muted underline-offset-2 hover:text-accent hover:underline"
            >
              Reject at the Qualified gate…
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                aria-label="Rejection reason"
                placeholder="Why isn't this ready? The reason stays visible to its editors."
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-md border border-hairline-strong bg-surface px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reject}
                  disabled={pending || !reason.trim()}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-deep disabled:opacity-60"
                >
                  Reject with reason
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="border-l-2 border-accent bg-accent-wash px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
