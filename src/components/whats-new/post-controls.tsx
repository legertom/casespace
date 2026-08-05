"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regeneratePostAction } from "@/server/actions-posts";

export function RegenerateButton({
  weekStart,
  label,
}: {
  weekStart: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await regeneratePostAction(weekStart);
            if (res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Drafting…" : label}
      </button>
      {error && (
        <span role="alert" className="ml-2 text-sm text-accent">
          {error}
        </span>
      )}
    </span>
  );
}
