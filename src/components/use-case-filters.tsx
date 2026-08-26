"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  STATUSES,
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  type Department,
  type UcStatus,
} from "@/lib/domain";
import {
  DEFAULT_PROGRAM_SCOPE,
  PROGRAM_SCOPES,
  type ProgramScope,
} from "@/lib/program-scope";
import {
  looksLikePersonQuery,
  matchPeople,
  parseSearch,
  type PersonName,
  type SearchParse,
} from "@/lib/search-parse";
import {
  aiParseSearchAction,
  recordSearchAction,
  type AiSearchParse,
} from "@/server/actions-search";

/**
 * The casebook's filter bar. No Filter button: every control writes itself
 * into the URL the moment it changes, so the server page re-renders and every
 * view stays a shareable link. The search box is a combobox — typeahead over
 * titles, people, departments, and statuses, a rule parse that turns phrases
 * like "launched in css" into filters, and an AI row (click-to-run, never
 * per-keystroke) for whatever the rules can't read.
 */

export interface CasebookFilterState {
  q: string;
  /** "" | UcStatus | "documented" (qualified or better — the 45). */
  status: string;
  department: "" | Department;
  program: ProgramScope;
  mine: boolean;
  personId: string | null;
  personName: string | null;
  /** Dashboard deep-link pass-through — kept on every change. */
  eltId: string | null;
}

interface Props {
  state: CasebookFilterState;
  /** Whole-casebook totals per scope — stable, so a tab never disagrees with itself. */
  scopeTotals: Record<ProgramScope, number>;
  /** Counts per status (plus "documented") within the other active filters. */
  stageCounts: Record<string, number>;
  people: PersonName[];
  titles: { id: string; title: string }[];
  resultCount: number;
  aiEnabled: boolean;
}

const SCOPE_TAB_LABELS: Record<ProgramScope, string> = {
  program: "In the program",
  community: "Community",
  all: "Everything",
};

/** Literal class names so Tailwind sees them; keyed off the status tokens. */
const STAGE_CLASSES: Record<UcStatus, { dot: string; underline: string }> = {
  in_discovery: { dot: "bg-st-discovery", underline: "border-st-discovery" },
  approved_by_fl: { dot: "bg-st-approved", underline: "border-st-approved" },
  under_construction: {
    dot: "bg-st-construction",
    underline: "border-st-construction",
  },
  in_testing: { dot: "bg-st-testing", underline: "border-st-testing" },
  launched: { dot: "bg-st-launched", underline: "border-st-launched" },
  qualified: { dot: "bg-st-qualified", underline: "border-st-qualified" },
  confirmed_positive_roi: {
    dot: "bg-st-confirmed",
    underline: "border-st-confirmed",
  },
};

function hi(text: string, q: string): ReactNode {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || !q) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-accent-wash">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function parseChipLabels(p: SearchParse | AiSearchParse): string[] {
  const chips: string[] = [];
  if (p.status)
    chips.push(
      p.status === "documented"
        ? "Qualified or better"
        : `status: ${STATUS_LABELS[p.status]}`,
    );
  if (p.department) chips.push(`department: ${DEPARTMENT_LABELS[p.department]}`);
  if (p.person) chips.push(`by ${p.person.name}`);
  if (p.mine) chips.push("mine");
  if (p.program) chips.push(`scope: ${SCOPE_TAB_LABELS[p.program]}`);
  return chips;
}

interface Suggestion {
  key: string;
  kind: string;
  node: ReactNode;
  run: () => void;
}

export function UseCaseFilters({
  state,
  scopeTotals,
  stageCounts,
  people,
  titles,
  resultCount,
  aiEnabled,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [input, setInput] = useState(state.q);
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(-1);
  const [aiPending, setAiPending] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLogged = useRef<string>("");
  const resultCountRef = useRef(resultCount);
  resultCountRef.current = resultCount;

  // The URL is the source of truth; local state only exists so typing stays
  // responsive. When the URL's q changes under us (a chip removed), follow it.
  useEffect(() => {
    setInput(state.q);
  }, [state.q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === "/" && !/^(INPUT|SELECT|TEXTAREA)$/.test(target?.tagName ?? "")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function hrefFor(next: Partial<CasebookFilterState>): string {
    const s = { ...state, q: input, ...next };
    const p = new URLSearchParams();
    if (s.q) p.set("q", s.q);
    if (s.status) p.set("status", s.status);
    if (s.department) p.set("department", s.department);
    if (s.program !== DEFAULT_PROGRAM_SCOPE) p.set("program", s.program);
    if (s.mine) p.set("mine", "1");
    if (s.personId) p.set("person", s.personId);
    if (s.eltId) p.set("elt", s.eltId);
    const qs = p.toString();
    return qs ? `/use-cases?${qs}` : "/use-cases";
  }

  function apply(next: Partial<CasebookFilterState>) {
    setOpen(false);
    setHot(-1);
    setAiNote(null);
    startTransition(() => {
      router.replace(hrefFor(next), { scroll: false });
    });
  }

  function onInputChange(v: string) {
    setInput(v);
    setOpen(true);
    setHot(-1);
    setAiNote(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      startTransition(() => router.replace(hrefFor({ q: v }), { scroll: false }));
    }, 250);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const settled = v.trim();
      if (settled && settled !== lastLogged.current) {
        lastLogged.current = settled;
        recordSearchAction(settled, "text", {}, resultCountRef.current).catch(
          () => {},
        );
      }
    }, 1500);
  }

  function applyParse(p: SearchParse | AiSearchParse, via: "rules" | null) {
    const next: Partial<CasebookFilterState> = { q: "" };
    if (p.status) next.status = p.status;
    if (p.department) next.department = p.department;
    if (p.person) {
      next.personId = p.person.id;
      next.personName = p.person.name;
    }
    if (p.mine) next.mine = true;
    if (p.program) next.program = p.program;
    if (via === "rules") {
      recordSearchAction(input.trim(), "rules", { ...p, person: p.person?.name }, null).catch(
        () => {},
      );
    }
    apply(next);
  }

  async function runAiParse() {
    setAiPending(true);
    setAiNote(null);
    try {
      const res = await aiParseSearchAction(input.trim());
      if (res.error) {
        setAiNote(res.error);
      } else if (res.parsed && Object.keys(res.parsed).length > 0) {
        if (res.unresolvedPerson) {
          setAiNote(`No one named “${res.unresolvedPerson}” in the directory — applying the rest.`);
        }
        applyParse(res.parsed, null);
      } else if (res.unresolvedPerson) {
        setAiNote(`No one named “${res.unresolvedPerson}” in the directory.`);
      }
    } finally {
      setAiPending(false);
    }
  }

  const q = input.trim().toLowerCase();
  const rulesParse = useMemo(
    () => (q ? parseSearch(q, people) : null),
    [q, people],
  );

  const suggestions = useMemo<Suggestion[]>(() => {
    if (!q) return [];
    const items: Suggestion[] = [];
    for (const t of titles) {
      if (items.length >= 3) break;
      if (t.title.toLowerCase().includes(q)) {
        items.push({
          key: `t-${t.id}`,
          kind: "Use case",
          node: <span>{hi(t.title, q)}</span>,
          run: () => router.push(`/use-cases/${t.id}`),
        });
      }
    }
    const tokens = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
    const seen = new Set<string>();
    for (const token of tokens) {
      for (const p of matchPeople(token, people)) {
        if (seen.has(p.id) || seen.size >= 3) continue;
        seen.add(p.id);
        items.push({
          key: `p-${p.id}`,
          kind: "Person",
          node: <span>{hi(p.name, token)}</span>,
          run: () => apply({ q: "", personId: p.id, personName: p.name }),
        });
      }
    }
    for (const d of DEPARTMENTS) {
      if (items.length >= 8) break;
      if (DEPARTMENT_LABELS[d].toLowerCase().includes(q)) {
        items.push({
          key: `d-${d}`,
          kind: "Department",
          node: <span>{hi(DEPARTMENT_LABELS[d], q)}</span>,
          run: () => apply({ q: "", department: d }),
        });
      }
    }
    for (const s of STATUSES) {
      if (items.length >= 9) break;
      if (STATUS_LABELS[s].toLowerCase().includes(q)) {
        items.push({
          key: `s-${s}`,
          kind: "Status",
          node: (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className={`size-2 rounded-full ${STAGE_CLASSES[s].dot}`} />
              <span>{hi(STATUS_LABELS[s], q)}</span>
            </span>
          ),
          run: () => apply({ q: "", status: s }),
        });
      }
    }
    return items;
    // apply/router are stable enough for suggestion identity; state rides along via closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, people, titles]);

  const peopleSuggested = suggestions.some((s) => s.kind === "Person");
  const showNoPersonNote =
    q.length > 0 && looksLikePersonQuery(q) && !peopleSuggested && !rulesParse;
  const aiEligible =
    aiEnabled && !rulesParse && q.split(/\s+/).filter(Boolean).length >= 2;

  const actionable: Suggestion[] = [...suggestions];
  if (rulesParse) {
    actionable.push({
      key: "rules-parse",
      kind: "→ filters",
      node: (
        <span className="flex flex-wrap gap-1.5">
          {parseChipLabels(rulesParse).map((c) => (
            <span key={c} className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs text-accent-deep">
              {c}
            </span>
          ))}
        </span>
      ),
      run: () => applyParse(rulesParse, "rules"),
    });
  }
  if (aiEligible) {
    actionable.push({
      key: "ai-parse",
      kind: "→ filters",
      node: (
        <span className="text-accent-deep">
          {aiPending ? "Reading the query…" : `Ask AI to turn “${input.trim()}” into filters`}
        </span>
      ),
      run: () => void runAiParse(),
    });
  }

  const dropdownOpen =
    open && q.length > 0 && (actionable.length > 0 || showNoPersonNote || aiNote);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!actionable.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setHot((h) =>
        e.key === "ArrowDown"
          ? (h + 1) % actionable.length
          : (h - 1 + actionable.length) % actionable.length,
      );
    } else if (e.key === "Enter" && hot >= 0 && hot < actionable.length) {
      e.preventDefault();
      actionable[hot].run();
    }
  }

  // ---- active filter chips -------------------------------------------------
  const chips: { label: string; undo: Partial<CasebookFilterState> }[] = [];
  if (state.status)
    chips.push({
      label:
        state.status === "documented"
          ? "Qualified or better — the 45"
          : STATUS_LABELS[state.status as UcStatus] ?? state.status,
      undo: { status: "" },
    });
  if (state.department)
    chips.push({ label: DEPARTMENT_LABELS[state.department], undo: { department: "" } });
  if (state.personId)
    chips.push({
      label: `by ${state.personName ?? "person"}`,
      undo: { personId: null, personName: null },
    });
  if (state.mine) chips.push({ label: "Mine", undo: { mine: false } });
  if (state.q) chips.push({ label: `“${state.q}”`, undo: { q: "" } });
  if (state.program !== DEFAULT_PROGRAM_SCOPE)
    chips.push({
      label: SCOPE_TAB_LABELS[state.program],
      undo: { program: DEFAULT_PROGRAM_SCOPE },
    });

  return (
    <div>
      {/* program scope: the page's tabs, with stable whole-casebook totals */}
      <div
        role="group"
        aria-label="Program scope"
        className="mt-6 flex gap-7 border-b border-hairline"
      >
        {PROGRAM_SCOPES.map((sc) => {
          const active = state.program === sc;
          return (
            <button
              key={sc}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ program: sc })}
              className={`-mb-px inline-flex items-baseline gap-2 whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-1.5 text-sm ${
                active
                  ? "border-accent font-semibold text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {SCOPE_TAB_LABELS[sc]}
              <span className={`text-xs tabular-nums ${active ? "text-accent" : "text-ink-faint"}`}>
                {scopeTotals[sc]}
              </span>
            </button>
          );
        })}
      </div>

      {/* one focal control (search); the rest recede to quiet text */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="relative min-w-64 max-w-md flex-1">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={Boolean(dropdownOpen)}
            aria-controls="casebook-search-suggestions"
            aria-autocomplete="list"
            aria-label="Search use cases"
            placeholder="Search title, description, owner…"
            autoComplete="off"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            className="w-full rounded-md border border-hairline-strong bg-surface py-1.5 pl-3 pr-8 text-sm"
          />
          <kbd
            aria-hidden
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-hairline-strong bg-paper px-1 text-[11px] text-ink-faint"
          >
            /
          </kbd>
          {dropdownOpen && (
            <div
              id="casebook-search-suggestions"
              role="listbox"
              className="absolute z-20 mt-1.5 w-full rounded-md border border-hairline-strong bg-surface p-1 shadow-md"
            >
              {actionable.map((item, i) => (
                <button
                  key={item.key}
                  type="button"
                  role="option"
                  aria-selected={hot === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={item.run}
                  className={`flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm ${
                    hot === i ? "bg-paper" : "hover:bg-paper"
                  } ${item.key === "rules-parse" || item.key === "ai-parse" ? "mt-1 border-t border-hairline pt-2" : ""}`}
                >
                  <span className="w-20 flex-none text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                    {item.kind}
                  </span>
                  {item.node}
                </button>
              ))}
              {showNoPersonNote && (
                <div className="flex items-center gap-2.5 px-2 py-1.5 text-sm italic text-ink-faint">
                  <span className="w-20 flex-none text-[10px] font-semibold not-italic uppercase tracking-wider">
                    Person
                  </span>
                  No one by that name in the directory yet
                </div>
              )}
              {aiNote && (
                <div className="px-2 py-1.5 text-sm text-ink-muted">{aiNote}</div>
              )}
            </div>
          )}
        </div>

        <select
          aria-label="Filter by department"
          value={state.department}
          onChange={(e) =>
            apply({ department: e.target.value as CasebookFilterState["department"] })
          }
          className="max-w-44 cursor-pointer rounded-md border-0 bg-transparent px-2 py-1.5 text-sm text-ink-muted hover:bg-paper hover:text-ink"
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {DEPARTMENT_LABELS[d]}
            </option>
          ))}
        </select>

        <label
          className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm ${
            state.mine
              ? "font-semibold text-accent-deep"
              : "text-ink-muted hover:bg-paper hover:text-ink"
          }`}
        >
          <input
            type="checkbox"
            checked={state.mine}
            onChange={() => apply({ mine: !state.mine })}
            className="sr-only"
          />
          <span
            aria-hidden
            className={`grid size-[15px] place-items-center rounded border text-[10px] leading-none ${
              state.mine
                ? "border-accent bg-accent text-white"
                : "border-hairline-strong bg-surface text-transparent"
            }`}
          >
            ✓
          </span>
          Mine
        </label>
      </div>

      {/* the pipeline as a quiet text rail — same underline vocabulary as the tabs */}
      <div
        role="group"
        aria-label="Filter by status"
        className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1"
      >
        {STATUSES.map((s) => {
          const active = state.status === s;
          const n = stageCounts[s] ?? 0;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              disabled={n === 0 && !active}
              onClick={() => apply({ status: active ? "" : s })}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-1 pt-0.5 text-[13.5px] disabled:cursor-default disabled:opacity-40 ${
                active
                  ? `text-ink ${STAGE_CLASSES[s].underline}`
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <span aria-hidden className={`size-2 rounded-full ${STAGE_CLASSES[s].dot}`} />
              {STATUS_SHORT_LABELS[s]}
              <span className={`text-xs tabular-nums ${active ? "text-ink-muted" : "text-ink-faint"}`}>
                {n}
              </span>
            </button>
          );
        })}
        <span aria-hidden className="h-4 w-px bg-hairline-strong" />
        <button
          type="button"
          aria-pressed={state.status === "documented"}
          disabled={(stageCounts.documented ?? 0) === 0 && state.status !== "documented"}
          title="Qualified or Confirmed ROI — the records that count toward the 45."
          onClick={() =>
            apply({ status: state.status === "documented" ? "" : "documented" })
          }
          className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-1 pt-0.5 text-[13.5px] disabled:cursor-default disabled:opacity-40 ${
            state.status === "documented"
              ? "border-st-qualified text-st-confirmed"
              : "border-transparent text-st-qualified hover:text-st-confirmed"
          }`}
        >
          The 45
          <span className="text-xs tabular-nums opacity-70">
            {stageCounts.documented ?? 0}
          </span>
        </button>
      </div>

      {/* what's filtering right now, each removable on its own */}
      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-faint">Filtering:</span>
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              aria-label={`Remove filter: ${c.label}`}
              onClick={() => apply(c.undo)}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-wash px-2.5 py-0.5 text-[13px] text-accent-deep hover:ring-1 hover:ring-accent"
            >
              {c.label}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setInput("");
              startTransition(() => router.replace("/use-cases", { scroll: false }));
            }}
            className="text-[13px] text-ink-faint underline underline-offset-2 hover:text-accent"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
