import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";
import { createUseCaseAction } from "@/server/actions";
import { listEltOrgs, listPeopleLite, listTeams } from "@/server/reference";
import { UseCaseForm } from "@/components/use-case-form";
import { PrefillUseCaseForm } from "@/components/use-case-prefill";
import type { Department } from "@/lib/domain";
import type { UseCaseCreateInput } from "@/lib/use-case-input";

export const metadata = { title: "Log a use case" };

export default async function NewUseCasePage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>;
}) {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) redirect("/use-cases");
  const { prefill } = await searchParams;

  const [people, teams, orgs] = await Promise.all([
    listPeopleLite(),
    listTeams(),
    listEltOrgs(),
  ]);

  async function submit(
    input: UseCaseCreateInput,
    source: "form" | "wizard" | "notes" = "form",
  ) {
    "use server";
    const safeSource = ["form", "wizard", "notes"].includes(source)
      ? source
      : "form";
    return createUseCaseAction(input, safeSource);
  }

  const teamOptions = teams as { id: string; name: string; department: Department }[];
  const orgOptions = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    departments: o.departments as Department[],
  }));

  if (prefill === "1") {
    return (
      <div>
        <h1 className="font-serif text-4xl">Review &amp; save</h1>
        <div className="mt-8">
          <PrefillUseCaseForm
            people={people}
            teams={teamOptions}
            eltOrgs={orgOptions}
            onSubmit={submit}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Log a use case</h1>
      <p className="mt-2 max-w-xl text-ink-muted">
        The form door — every field explained, no AI required. Prefer a guided
        conversation?{" "}
        <Link
          href="/coach?intent=wizard"
          className="text-accent underline underline-offset-2"
        >
          Let the Coach walk you through it
        </Link>{" "}
        or{" "}
        <Link
          href="/use-cases/from-notes"
          className="text-accent underline underline-offset-2"
        >
          start from notes
        </Link>
        .
      </p>
      <div className="mt-10">
        <UseCaseForm
          people={people}
          teams={teamOptions}
          eltOrgs={orgOptions}
          submitLabel="Log use case"
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
