"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

/** Long enough that crossing the header doesn't flash every panel open. */
const OPEN_DELAY = 100;
/** Grace to cross the gap between the trigger and the panel hung below it. */
const CLOSE_DELAY = 250;

/**
 * A header menu that opens on hover and leaves when you do.
 *
 * These were native `<details>`, which cost no JavaScript but bought the wrong
 * behaviour: a click to open, a second click in the same place to close, and a
 * panel that sat over the page in between. It also fixed what the trigger could
 * be — a `<summary>` is not a link, so the name in the corner could never be
 * the way to your own profile.
 *
 * So: hovering opens, leaving closes, and with `href` the trigger is a real
 * link that navigates on click. The three dismissals a click-menu needs are
 * still here for the pointer that never hovers — a click elsewhere, focus
 * landing outside, Escape — because a phone has no hover and a keyboard has
 * no pointer.
 */
export function HoverMenu({
  trigger,
  href,
  triggerLabel,
  triggerClassName,
  panelClassName,
  className,
  children,
}: {
  /** What the trigger shows: a name, a bell, a hamburger. */
  trigger: React.ReactNode;
  /** Where a click goes. Without it the trigger is a button that toggles. */
  href?: string;
  /** aria-label, for a trigger whose content is only an icon. */
  triggerLabel?: string;
  triggerClassName?: string;
  panelClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trig = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();
  const pathname = usePathname();

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const schedule = (next: boolean, delay: number) => {
    cancel();
    timer.current = setTimeout(() => setOpen(next), delay);
  };
  const shut = () => {
    cancel();
    setOpen(false);
  };

  // Following a link out of the panel leaves the layout — and this menu —
  // mounted, so the route is what closes it, not the click. Closing on the
  // click itself would unmount the view-as and sign-out forms mid-submit.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => cancel, []);

  useEffect(() => {
    if (!open) return;
    const el = wrap.current;
    if (!el) return;

    const outside = (target: EventTarget | null) => !el.contains(target as Node);
    const onPointerDown = (e: PointerEvent) => {
      if (outside(e.target)) shut();
    };
    // focusin on the document, not focusout on the element: focusout reports
    // where focus went in relatedTarget, which is null for plenty of
    // legitimate moves and would close the menu mid-use.
    const onFocusIn = (e: FocusEvent) => {
      if (outside(e.target)) shut();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      shut();
      trig.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  const onTriggerFocus = (e: React.FocusEvent<HTMLElement>) => {
    // Keyboard focus opens the panel. A mouse click focuses the trigger too,
    // and :focus-visible is what tells those two apart — without it, clicking
    // the name would re-open the panel the same click just closed.
    if (e.target.matches(":focus-visible")) {
      cancel();
      setOpen(true);
    }
  };

  const onTriggerClick = (e: React.MouseEvent) => {
    cancel();
    if (!href) {
      setOpen((o) => !o);
      return;
    }
    // A touch has no hover, so the first tap opens the panel instead of
    // following the link — otherwise a phone could never reach Sign out.
    // Keyboard activation reports an empty pointerType and follows the link.
    const pointerType = (e.nativeEvent as PointerEvent).pointerType;
    if ((pointerType === "touch" || pointerType === "pen") && !open) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    setOpen(false);
  };

  const shared = {
    "aria-expanded": open,
    "aria-haspopup": true,
    "aria-controls": panelId,
    "aria-label": triggerLabel,
    className: triggerClassName,
    onFocus: onTriggerFocus,
    onClick: onTriggerClick,
  } as const;

  return (
    <div
      ref={wrap}
      className={className}
      // Guarded to a mouse: a touch fires these too, and a tap would then
      // open the panel and immediately be treated as a hover.
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") schedule(true, OPEN_DELAY);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") schedule(false, CLOSE_DELAY);
      }}
    >
      {href ? (
        <Link
          href={href}
          ref={trig as React.RefObject<HTMLAnchorElement>}
          {...shared}
        >
          {trigger}
        </Link>
      ) : (
        <button
          type="button"
          ref={trig as React.RefObject<HTMLButtonElement>}
          {...shared}
        >
          {trigger}
        </button>
      )}
      {/* Rendered whether or not it is open, so aria-controls always points at
          something real; `hidden` takes it out of the tab order for free. */}
      <div id={panelId} hidden={!open} className={panelClassName}>
        {children}
      </div>
    </div>
  );
}
