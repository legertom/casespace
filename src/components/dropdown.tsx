"use client";

import { useEffect, useRef } from "react";

/**
 * A `<details>` disclosure that closes when attention leaves it — a click
 * anywhere else, a Tab out, or Escape.
 *
 * The header's menus are native `<details>` on purpose: they need no state,
 * they are keyboard-operable for free, and an async Server Component (the
 * notification bell) can render one. The one thing the element deliberately
 * does not do is light-dismiss — it toggles on the summary and nothing else,
 * so an opened menu sits over the page until you go back and click the same
 * word again. That reads as a stuck panel. This adds the dismissals and
 * keeps everything else native.
 */
export function Dropdown({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const close = () => {
      if (el.open) el.open = false;
    };

    // pointerdown, not click: the menu should be gone by the time whatever
    // was clicked reacts, and a click that starts inside and ends outside
    // (a drag over a link) is not a dismissal.
    const onPointerDown = (e: PointerEvent) => {
      if (!el.contains(e.target as Node)) close();
    };

    // focusin on the document rather than focusout on the element: `focusout`
    // reports where focus went in `relatedTarget`, which is null for plenty
    // of legitimate moves and would close the menu mid-use.
    const onFocusIn = (e: FocusEvent) => {
      if (!el.contains(e.target as Node)) close();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || !el.open) return;
      close();
      // Escape hands focus back to the control that opened the menu, so the
      // keyboard doesn't get dropped at the top of the document.
      el.querySelector("summary")?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}
