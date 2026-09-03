"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_PREFIX = "casespace-coachmark-";

/**
 * A one-time pointer at something easy to walk past.
 *
 * It wraps the thing it points at rather than taking a selector or a ref, so
 * the mark cannot drift away from its target when somebody moves the button —
 * they move the button and the mark goes with it.
 *
 * Dismissal is remembered per person, in their browser, keyed by `id`. A
 * coachmark that comes back every visit stops being a hint and becomes
 * furniture, and this one sits on a record page people open all day. It is
 * deliberately not stored server-side: which hints somebody has seen is not
 * program data, it does not belong in the casebook, and losing it when they
 * switch laptops costs nothing worse than seeing a good hint twice.
 */
export function Coachmark({
  id,
  note,
  children,
}: {
  /** Stable key for "this person has seen this hint". */
  id: string;
  note: string;
  children: ReactNode;
}) {
  // Hidden until mounted: localStorage is not readable while rendering on the
  // server, and showing the mark first and retracting it is worse than a beat
  // of nothing.
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_PREFIX + id)) setShowing(true);
    } catch {
      // Private browsing, or storage disabled. The hint is optional; the
      // button behind it is not, so fail quiet and leave the mark off.
    }
  }, [id]);

  function dismiss() {
    setShowing(false);
    try {
      localStorage.setItem(STORAGE_PREFIX + id, "seen");
    } catch {
      // Nothing to do — it stays hidden for this page view either way.
    }
  }

  return (
    <div className="relative">
      {/* Taking the hint counts as having seen it. */}
      <div onClick={() => showing && dismiss()}>{children}</div>
      {showing && (
        <div
          role="note"
          className="absolute right-0 top-full z-10 mt-2 flex w-max max-w-64 items-start gap-2 rounded-md border border-accent/30 bg-accent-wash px-3 py-2 text-sm text-accent-deep shadow-sm"
        >
          <span
            aria-hidden
            className="absolute -top-1.5 right-6 size-3 rotate-45 border-l border-t border-accent/30 bg-accent-wash"
          />
          <span className="relative">{note}</span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss hint"
            className="relative -mr-1 -mt-0.5 px-1 text-base leading-none text-accent-deep/60 hover:text-accent-deep"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
