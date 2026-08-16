import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import {
  APPROACHES,
  APPROACH_LABELS,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
} from "@/lib/domain";
import {
  canEditUseCase,
  canLinkUseCases,
  visibleHistoryNote,
} from "@/lib/permissions";
import { listComments, listMentionableUsers } from "@/server/comment-queries";
import { listEltOrgs, listPeopleLite, listTeams } from "@/server/reference";
import {
  listLinkableUseCases,
  listRecordLinks,
} from "@/server/use-case-link-queries";
import { getUseCase } from "@/server/use-case-queries";
import { AskCoachSelection } from "@/components/coach/ask-coach-selection";
import { CommentThread } from "@/components/comments/comment-thread";
import { DeleteUseCase } from "@/components/delete-use-case";
import type { Choice, TeamChoice } from "@/components/record/inline-field";
import { RecordAbout } from "@/components/record/record-about";
import { RecordCredit } from "@/components/record/record-credit";
import { RecordGates } from "@/components/record/record-gates";
import { RecordHeader } from "@/components/record/record-header";
import { RecordHistory } from "@/components/record/record-history";
import { RecordRoi } from "@/components/record/record-roi";
import { RecordWorksheet } from "@/components/record/record-worksheet";
import { RelatedWorkflows } from "@/components/record/related-workflows";
import { StatusControls } from "@/components/status-controls";
import { roiGaps } from "@/lib/domain";

/**
 * One use case, everything known about it. This page fetches and decides;
 * every section it renders lives in src/components/record/.
 */
export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const uc = await getUseCase(id).catch(() => null);
  if (!uc) notFound();

  const [comments, mentionable, links] = await Promise.all([
    listComments(uc.id),
    listMentionableUsers(),
    listRecordLinks(uc.id),
  ]);
  // Only someone who can link needs the candidate list.
  const canLink = canLinkUseCases(user.role);
  const linkable = canLink ? await listLinkableUseCases(uc.id) : [];

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

  // Pickers only matter to someone who can edit; don't make viewers pay for them.
  const [people, teams, orgs] = editable
    ? await Promise.all([listPeopleLite(), listTeams(), listEltOrgs()])
    : [[], [], []];
  const departmentChoices: Choice[] = DEPARTMENTS.map((d) => ({
    value: d,
    label: DEPARTMENT_LABELS[d],
  }));
  const teamChoices: TeamChoice[] = teams.map((t) => ({
    value: t.id,
    label: t.name,
    department: t.department,
  }));
  const orgChoices: Choice[] = orgs.map((o) => ({ value: o.id, label: o.name }));
  const approachChoices: Choice[] = APPROACHES.map((a) => ({
    value: a,
    label: APPROACH_LABELS[a],
  }));

  const record = { id: uc.id, title: uc.title };

  return (
    <article>
      <AskCoachSelection record={record}>
        <RecordHeader
          uc={uc}
          record={record}
          editable={editable}
          isAdmin={user.role === "admin"}
        />

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-10">
            <RecordAbout
              uc={uc}
              record={record}
              editable={editable}
              approachChoices={approachChoices}
            />
            <RecordWorksheet uc={uc} record={record} editable={editable} />
            <RecordRoi uc={uc} record={record} editable={editable} />

            <RelatedWorkflows
              useCaseId={uc.id}
              links={links}
              candidates={linkable}
              currentUserId={user.id}
              canLink={canLink}
              canEditRecord={editable}
              isAdmin={user.role === "admin"}
            />

            {/* Redacted here, server-side, so the annual-ROI note (which may
                carry dollars) never reaches a non-admin's HTML. */}
            <RecordHistory
              history={uc.history.map((h) => ({
                ...h,
                note: visibleHistoryNote(h, user.role),
              }))}
            />

            <CommentThread
              useCaseId={uc.id}
              comments={comments}
              people={mentionable}
              currentUserId={user.id}
              isAdmin={user.role === "admin"}
            />

            {editable && (
              <div className="border-t border-hairline pt-6">
                <DeleteUseCase id={uc.id} title={uc.title} />
              </div>
            )}
          </div>

          <aside className="space-y-8">
            <RecordCredit
              uc={uc}
              record={record}
              editable={editable}
              people={people}
              orgChoices={orgChoices}
              departmentChoices={departmentChoices}
              teamChoices={teamChoices}
            />
            <RecordGates uc={uc} record={record} editable={editable} />
            <StatusControls
              id={uc.id}
              current={uc.status}
              role={user.role}
              canEdit={editable}
              roiGaps={roiGaps(uc)}
            />
          </aside>
        </div>
      </AskCoachSelection>
    </article>
  );
}
