"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActionResult } from "@/server/actions";
import { computeGapFlags } from "@/lib/gap-flags";
import type { UseCaseCreateInput } from "@/lib/use-case-input";
import type { Department } from "@/lib/domain";
import { UseCaseForm, type EltOrgOption, type TeamOption } from "./use-case-form";
import type { PersonOption } from "./people-picker";

interface Props {
  people: PersonOption[];
  teams: TeamOption[];
  eltOrgs: EltOrgOption[];
  onSubmit: (
    input: UseCaseCreateInput,
    source: "form" | "wizard" | "notes",
  ) => Promise<ActionResult>;
}

interface PrefillPayload {
  input: Partial<UseCaseCreateInput>;
  source?: "wizard" | "notes";
}

/**
 * The review screen the AI doors converge on: the full form, pre-filled, with
 * gap flags on top. Reads the handoff from sessionStorage exactly once.
 */
export function PrefillUseCaseForm({ people, teams, eltOrgs, onSubmit }: Props) {
  const [payload] = useState<PrefillPayload | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("casespace-prefill");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? "input" in parsed
          ? (parsed as PrefillPayload)
          : { input: parsed as Partial<UseCaseCreateInput> }
        : null;
    } catch {
      return null;
    }
  });

  const initial = payload?.input ?? {};
  const source = payload?.source ?? "wizard";
  const gaps = payload ? computeGapFlags(initial) : [];

  return (
    <div>
      {payload ? (
        <div className="mb-8 max-w-2xl rounded-md border border-hairline bg-surface p-4">
          <p className="text-sm font-semibold">
            Review before saving — nothing is logged yet.
          </p>
          {gaps.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-ink-muted">
                Gaps worth closing while you&rsquo;re here:
              </p>
              <ul className="mt-1.5 list-disc pl-5 text-sm text-ink-muted">
                {gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              No gaps flagged. Read it over and save.
            </p>
          )}
          <p className="mt-2 text-sm text-ink-muted">
            Prefer to fill the holes conversationally?{" "}
            <Link
              href="/coach?intent=wizard"
              className="text-accent underline underline-offset-2"
            >
              Hand it to the Coach.
            </Link>
          </p>
        </div>
      ) : (
        <p className="mb-8 text-sm text-ink-muted">
          Nothing handed off — starting a blank form.
        </p>
      )}
      <UseCaseForm
        people={people}
        teams={teams}
        eltOrgs={eltOrgs}
        initial={initial}
        submitLabel="Log use case"
        onSubmit={(input) => onSubmit(input, source)}
      />
    </div>
  );
}
