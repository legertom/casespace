"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { askCoach, quoteForCoach } from "@/lib/coach-bus";

interface Props {
  /** The record the selected text came from, so the Coach can look it up. */
  record: { id: string; title: string };
  children: React.ReactNode;
}

interface Spot {
  text: string;
  top: number;
  left: number;
}

/** Selections shorter than this are usually a stray double-click, not a question. */
const MIN_CHARS = 3;

/**
 * Highlight anything inside a record and a small "Ask the Coach" button
 * appears over the selection. Clicking it drops the quoted text into the
 * Coach's composer — nothing is sent until the user says so.
 */
export function AskCoachSelection({ record, children }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);

  const read = useCallback(() => {
    const host = hostRef.current;
    const selection = window.getSelection();
    if (!host || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSpot(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length < MIN_CHARS) {
      setSpot(null);
      return;
    }
    const range = selection.getRangeAt(0);
    // Both ends inside the record: a selection that starts in the header or
    // the Coach panel isn't about this record's prose.
    if (
      !host.contains(range.startContainer) ||
      !host.contains(range.endContainer)
    ) {
      setSpot(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSpot(null);
      return;
    }
    setSpot({
      text,
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    // Read after the gesture ends, not during: mid-drag rects jump around.
    const onUp = () => window.setTimeout(read, 0);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("selectionchange", onUp);
    window.addEventListener("scroll", read, true);
    window.addEventListener("resize", read);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("selectionchange", onUp);
      window.removeEventListener("scroll", read, true);
      window.removeEventListener("resize", read);
    };
  }, [read]);

  function ask() {
    if (!spot) return;
    askCoach(quoteForCoach(record, spot.text));
    window.getSelection()?.removeAllRanges();
    setSpot(null);
  }

  return (
    <div ref={hostRef}>
      {children}
      {spot && (
        <button
          type="button"
          // mousedown would clear the selection before the click lands.
          onMouseDown={(e) => e.preventDefault()}
          onClick={ask}
          style={{ top: spot.top, left: spot.left }}
          className="fixed z-30 -translate-x-1/2 -translate-y-full rounded-full border border-hairline-strong bg-ink px-3 py-1.5 text-xs text-paper shadow-md transition-colors hover:bg-ink/85"
        >
          Ask the Coach
        </button>
      )}
    </div>
  );
}
