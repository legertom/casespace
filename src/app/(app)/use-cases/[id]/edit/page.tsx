import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import type { Department } from "@/lib/domain";
import { canEditUseCase } from "@/lib/permissions";
import {
  useCaseToFormInput,
  type UseCaseCreateInput,
} from "@/lib/use-case-input";
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

  // Derived, never hand-listed: the form submits every field it holds, so a
  // field this page forgot to prefill would arrive as null and overwrite what
  // was saved. See useCaseToFormInput and its coverage test.
  const initial: Partial<UseCaseCreateInput> = useCaseToFormInput(uc);

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
