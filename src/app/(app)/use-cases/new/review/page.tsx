import { redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { canCreateUseCase } from "@/lib/permissions";
import { createUseCaseAction, type ProposalLearning } from "@/server/actions";
import {
  getDefaultTeam,
  listEltOrgs,
  listPeopleLite,
  listTeams,
} from "@/server/reference";
import { PrefillUseCaseForm } from "@/components/use-case-prefill";
import type { Department } from "@/lib/domain";
import type { UseCaseCreateInput } from "@/lib/use-case-input";

export const metadata = { title: "Review & save" };

/** The review-before-save screen both AI doors hand off to. */
export default async function ReviewUseCasePage() {
  const user = await requireUser();
  if (!canCreateUseCase(user.role)) redirect("/use-cases");

  const [people, teams, orgs, myTeam] = await Promise.all([
    listPeopleLite(),
    listTeams(),
    listEltOrgs(),
    getDefaultTeam(user),
  ]);

  async function submit(
    input: UseCaseCreateInput,
    source: "form" | "wizard" | "notes" | "discovery" = "form",
    learning?: ProposalLearning,
  ) {
    "use server";
    const safeSource = ["form", "wizard", "notes", "discovery"].includes(source)
      ? source
      : "form";
    // The handoff comes from sessionStorage, so treat it as untrusted: keep
    // the shape, cap the ref, and let a bad one cost the learning only.
    const safeLearning =
      learning && typeof learning.proposalRef === "string"
        ? {
            proposalRef: learning.proposalRef.slice(0, 200),
            proposed: learning.proposed ?? {},
            proposedTeamName:
              typeof learning.proposedTeamName === "string"
                ? learning.proposedTeamName
                : null,
          }
        : undefined;
    return createUseCaseAction(input, safeSource, safeLearning);
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Review &amp; save</h1>
      <div className="mt-8">
        <PrefillUseCaseForm
          people={people}
          teams={teams as { id: string; name: string; department: Department }[]}
          eltOrgs={orgs.map((o) => ({
            id: o.id,
            name: o.name,
            departments: o.departments as Department[],
          }))}
          defaultTeam={myTeam}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
