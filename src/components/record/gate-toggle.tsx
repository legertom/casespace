"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UseCaseUpdateInput } from "@/lib/use-case-input";
import { patchUseCaseAction } from "@/server/actions";

interface Props {
  id: string;
  field: "gateNamed" | "gateTool" | "gateAdoption" | "gateOwner";
  checked: boolean;
  label: string;
  help?: string;
  children: React.ReactNode;
}

/**
 * A gate is one boolean, so the checkbox is the editor — no pencil, no Save.
 * Ticking it writes straight through.
 */
export function GateToggle({ id, field, checked, label, help, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await patchUseCaseAction(id, {
        [field]: next,
      } as UseCaseUpdateInput);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <li className="text-sm" title={help}>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          aria-label={label}
          className="mt-0.5"
        />
        <span className={checked ? "" : "text-ink-muted"}>{children}</span>
      </label>
      {error && (
        <p role="alert" className="mt-1 pl-6 text-xs text-flag">
          {error}
        </p>
      )}
    </li>
  );
}
