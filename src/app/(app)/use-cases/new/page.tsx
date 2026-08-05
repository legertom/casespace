import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";
import { createUseCaseAction } from "@/server/actions";
import { listEltOrgs, listPeopleLite, listTeams } from "@/server/reference";
import { UseCaseForm } from "@/components/use-case-form";
import type { Department } from "@/lib/domain";

export const metadata = { title: "Log a use case" };

export default async function NewUseCasePage() {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) redirect("/use-cases");

  const [people, teams, orgs] = await Promise.all([
    listPeopleLite(),
    listTeams(),
    listEltOrgs(),
  ]);

  async function submit(input: Parameters<typeof createUseCaseAction>[0]) {
    "use server";
    return createUseCaseAction(input, "form");
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Log a use case</h1>
      <p className="mt-2 max-w-xl text-ink-muted">
        The form door — every field explained, no AI required. Prefer a guided
        conversation? <Link href="/coach" className="text-accent underline underline-offset-2">Let the Coach walk you through it</Link>{" "}
        or <Link href="/use-cases/from-notes" className="text-accent underline underline-offset-2">start from notes</Link>.
      </p>
      <div className="mt-10">
        <UseCaseForm
          people={people}
          teams={teams as { id: string; name: string; department: Department }[]}
          eltOrgs={orgs.map((o) => ({
            id: o.id,
            name: o.name,
            departments: o.departments as Department[],
          }))}
          submitLabel="Log use case"
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
