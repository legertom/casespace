import { DEPARTMENT_LABELS } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { Empty } from "@/components/record/empty";
import {
  InlineField,
  type Choice,
  type TeamChoice,
} from "@/components/record/inline-field";
import type { PersonOption } from "@/components/people-picker";
import { PersonLink, PersonLinks } from "@/components/person-link";

/** The sidebar credit card: authors, owner, ELT allocation, team, provenance. */
export function RecordCredit({
  uc,
  record,
  editable,
  people,
  orgChoices,
  departmentChoices,
  teamChoices,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
  people: PersonOption[];
  orgChoices: Choice[];
  departmentChoices: Choice[];
  teamChoices: TeamChoice[];
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
        Credit
      </h2>
      <dl className="mt-3 space-y-3 text-sm">
        <InlineField
          record={record}
          field="authors"
          label="Authors"
          people={uc.authors.map((a) => ({
            personId: a.personId,
            userId: a.userId,
            displayName: a.displayName,
          }))}
          editor={{ kind: "people", people, multiple: true }}
          canEdit={editable}
        >
          <div>
            <dt className="text-ink-faint">
              {uc.authors.length === 1 ? "Author" : "Authors"}
            </dt>
            <dd className="mt-0.5">
              {uc.authors.length > 0 ? (
                <PersonLinks people={uc.authors} />
              ) : (
                <Empty>nobody credited yet</Empty>
              )}
            </dd>
          </div>
        </InlineField>
        <InlineField
          record={record}
          field="owner"
          label="Owner"
          people={
            uc.ownerName
              ? [
                  {
                    personId: uc.ownerPersonId,
                    userId: uc.ownerUserId,
                    displayName: uc.ownerName,
                  },
                ]
              : []
          }
          editor={{ kind: "people", people }}
          canEdit={editable}
        >
          <div>
            <dt className="text-ink-faint">Owner</dt>
            <dd className="mt-0.5">
              {uc.ownerName ? (
                <PersonLink
                  name={uc.ownerName}
                  personId={uc.ownerPersonId}
                />
              ) : (
                <Empty>nobody named yet</Empty>
              )}
            </dd>
          </div>
        </InlineField>
        <InlineField
          record={record}
          field="eltOrgId"
          label="Counts toward (ELT org)"
          value={uc.eltOrgId}
          editor={{
            kind: "select",
            options: orgChoices,
            empty: "Unallocated",
          }}
          canEdit={editable}
        >
          <div>
            <dt
              className="text-ink-faint"
              title="The ELT (executive leadership team) owner whose target this record counts toward."
            >
              Counts toward
            </dt>
            <dd className="mt-0.5">{uc.eltOrgName ?? "Unallocated"}</dd>
          </div>
        </InlineField>
        <InlineField
          record={record}
          label="Department and team"
          department={uc.department}
          teamId={uc.teamId}
          editor={{
            kind: "team",
            departments: departmentChoices,
            teams: teamChoices,
          }}
          canEdit={editable}
        >
          <div>
            <dt className="text-ink-faint">Team</dt>
            <dd className="mt-0.5">
              {[
                uc.department ? DEPARTMENT_LABELS[uc.department] : null,
                uc.teamName,
              ]
                .filter(Boolean)
                .join(" · ") || <Empty>unassigned</Empty>}
            </dd>
          </div>
        </InlineField>
        <div>
          <dt className="text-ink-faint">Logged</dt>
          <dd className="mt-0.5">
            {fmtDate(uc.createdAt)} by {uc.createdByName ?? "—"} · via{" "}
            {uc.source}
          </dd>
        </div>
      </dl>
    </div>
  );
}
