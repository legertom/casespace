"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { onAskCoach } from "@/lib/coach-bus";
import { CoachChat } from "./coach-chat";
import { CoachIcon } from "./coach-icon";

/**
 * The floating Coach: available on every page, one persistent panel
 * conversation per browser (survives navigation via a stable chat id).
 */
export function CoachLauncher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [seed, setSeed] = useState<{ text: string; nonce: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // "Ask the Coach" from anywhere on the page opens the panel with the text
  // waiting in the composer.
  useEffect(
    () =>
      onAskCoach(({ text }) => {
        setOpen(true);
        setSeed({ text, nonce: Date.now() });
      }),
    [],
  );

  useEffect(() => {
    const key = "casespace-coach-panel-chat";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    setChatId(id);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open]);

  // The full-page Coach replaces the panel.
  if (pathname === "/coach") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close the Coach" : "Open the Coach"}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-hairline-strong bg-ink px-4 py-2.5 font-serif text-sm text-paper shadow-md transition-colors hover:bg-ink/85"
      >
        <CoachIcon className="size-4" />
        {open ? "Close" : "Coach"}
      </button>

      {open && chatId && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Casespace Coach"
          className="fixed bottom-20 right-5 z-40 flex h-[36rem] max-h-[calc(100vh-7rem)] w-[26rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-lg border border-hairline-strong bg-paper shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <p className="font-serif">The Coach</p>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
              <button
                type="button"
                className="text-ink-faint hover:text-accent"
                onClick={() => {
                  const id = crypto.randomUUID();
                  localStorage.setItem("casespace-coach-panel-chat", id);
                  setChatId(id);
                }}
              >
                New chat
              </button>
              {/* Discovery starts on the full page rather than in here. The
                  panel is one persistent conversation per browser, and
                  working a problem through wants both the room and a chat of
                  its own — turning this into a mode switcher would be the
                  wrong shape for a 26rem box. */}
              <Link
                href="/coach?intent=discovery"
                className="text-ink-faint hover:text-accent"
                onClick={() => setOpen(false)}
              >
                Work through an idea ↗
              </Link>
              <Link
                href="/coach"
                className="text-ink-faint hover:text-accent"
                onClick={() => setOpen(false)}
              >
                Full page ↗
              </Link>
            </div>
          </div>
          <CoachChat key={chatId} chatId={chatId} seed={seed ?? undefined} compact />
        </div>
      )}
    </>
  );
}
