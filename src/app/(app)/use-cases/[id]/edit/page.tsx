import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import type { Department } from "@/lib/domain";
import { canEditUseCase } from "@/lib/permissions";
import type { UseCaseCreateInput } from "@/lib/use-case-input";
import { updateUseCaseAction } from "@/server/actions";
import { listEltOrgs, listPeopleLite, listTeams } from "@/server/reference";
import { getUseCase } from "@/server/use-case-queries";
import { UseCaseForm } from "@/components/use-case-form";

export const metadata = { title: "Edit use case" };

export default async function EditUseCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const uc = await getUseCase(id).catch(() => null);
  if (!uc) notFound();

  const editable = canEditUseCase(
    { id: user.id, role: user.role },
    {
      createdById: uc.createdById,
      ownerUserId: uc.ownerUserId,
      authorUserIds: uc.authors
        .map((a) => a.userId)
        .filter((x): x is string => !!x),
    },
  );
  if (!editable) redirect(`/use-cases/${id}`);

  const [people, teams, orgs] = await Promise.all([
    listPeopleLite(),
    listTeams(),
    listEltOrgs(),
  ]);

  const initial: Partial<UseCaseCreateInput> = {
    title: uc.title,
    description: uc.description,
    department: uc.department,
    teamId: uc.teamId,
    eltOrgId: uc.eltOrgId,
    authors: uc.authors.map((a) => ({
      personId: a.personId,
      userId: a.userId,
      displayName: a.displayName,
    })),
    owner: uc.ownerName
      ? {
          personId: uc.ownerPersonId,
          userId: uc.ownerUserId,
          displayName: uc.ownerName,
        }
      : null,
    aiTools: uc.aiTools,
    approach: uc.approach,
    currentSteps: uc.currentSteps,
    ratingFrequency: uc.ratingFrequency,
    ratingPain: uc.ratingPain,
    ratingDataAvailability: uc.ratingDataAvailability,
    ratingRisk: uc.ratingRisk,
    ratingOwnershipClarity: uc.ratingOwnershipClarity,
    ratingEvaluationClarity: uc.ratingEvaluationClarity,
    ratingMaintenanceBurden: uc.ratingMaintenanceBurden,
    functionalLeaderSuccess: uc.functionalLeaderSuccess,
    gateNamed: uc.gateNamed,
    gateTool: uc.gateTool,
    gateAdoption: uc.gateAdoption,
    adoptionEvidence: uc.adoptionEvidence,
    gateOwner: uc.gateOwner,
    successCriterion: uc.successCriterion,
    successCriterionMet: uc.successCriterionMet,
    baselineMetric: uc.baselineMetric,
    baselineValue: uc.baselineValue,
    baselineUnit: uc.baselineUnit,
    postValue: uc.postValue,
    measurementMethod: uc.measurementMethod,
    netImpactStatement: uc.netImpactStatement,
    isPositive: uc.isPositive,
    roiStatus: uc.roiStatus,
    revisitOn: uc.revisitOn,
  };

  async function submit(input: UseCaseCreateInput) {
    "use server";
    return updateUseCaseAction(id, input);
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Edit: {uc.title}</h1>
      <p className="mt-2 text-ink-muted">
        Status changes happen on the record page so the history stays complete.
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
          initial={initial}
          mode="edit"
          submitLabel="Save changes"
          onSubmit={submit}
        />
      </div>
    </div>
  );
}
