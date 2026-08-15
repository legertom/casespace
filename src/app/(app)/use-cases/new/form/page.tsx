import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";
import { createUseCaseAction } from "@/server/actions";
import {
  getDefaultTeam,
  listEltOrgs,
  listPeopleLite,
  listTeams,
} from "@/server/reference";
import { UseCaseForm } from "@/components/use-case-form";
import type { Department } from "@/lib/domain";
import type { UseCaseCreateInput } from "@/lib/use-case-input";

export const metadata = { title: "Log a use case" };

export default async function NewUseCaseFormPage() {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) redirect("/use-cases");

  const [people, teams, orgs, myTeam] = await Promise.all([
    listPeopleLite(),
    listTeams(),
    listEltOrgs(),
    getDefaultTeam(user),
  ]);

  async function submit(input: UseCaseCreateInput) {
    "use server";
    return createUseCaseAction(input, "form");
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Log a use case</h1>
      <p className="mt-2 max-w-xl text-ink-muted">
        Only the title and &ldquo;What it does&rdquo; are required — saving a
        half-filled record early is expected. You can return and edit
        everything as the work evolves.
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
          initial={
            myTeam
              ? { department: myTeam.department, teamId: myTeam.id }
              : undefined
          }
          mode="create"
          submitLabel="Log use case"
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
