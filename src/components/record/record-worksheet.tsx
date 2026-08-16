import { RATING_FIELDS } from "@/lib/domain";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { Empty } from "@/components/record/empty";
import { InlineField } from "@/components/record/inline-field";

/**
 * The intake worksheet's view of the record: the workflow's steps, the seven
 * scoping ratings, and the functional leader's view of success. Sections
 * whose fields are empty hide from viewers and invite editors.
 */
export function RecordWorksheet({
  uc,
  record,
  editable,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
}) {
  const ratings = Object.fromEntries(
    RATING_FIELDS.map(([k]) => [k, uc[k]]),
  ) as Record<(typeof RATING_FIELDS)[number][0], number | null>;
  const anyRating = RATING_FIELDS.some(([k]) => uc[k] !== null);

  return (
    <>
      {(uc.currentSteps.length > 0 || editable) && (
        <section>
          <h2 className="font-serif text-2xl">
            The workflow, start to finish
          </h2>
          <InlineField
            record={record}
            field="currentSteps"
            label="Workflow steps"
            value={uc.currentSteps}
            editor={{ kind: "lines", rows: 7 }}
            canEdit={editable}
            className="mt-3"
          >
            {uc.currentSteps.length > 0 ? (
              <ol className="max-w-prose list-decimal space-y-1.5 pl-5 leading-relaxed">
                {uc.currentSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : (
              <p>
                <Empty>
                  No steps captured yet — one step per line, as the work
                  happens today.
                </Empty>
              </p>
            )}
          </InlineField>
        </section>
      )}

      {(anyRating || editable) && (
        <section>
          <h2 className="font-serif text-2xl">Worksheet ratings</h2>
          <InlineField
            record={record}
            label="Worksheet ratings"
            ratings={ratings}
            editor={{ kind: "ratings" }}
            canEdit={editable}
            className="mt-3"
          >
            {anyRating ? (
              <dl className="grid max-w-prose grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                {RATING_FIELDS.filter(([k]) => uc[k] !== null).map(
                  ([k, label]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between border-b border-hairline pb-1.5"
                    >
                      <dt className="text-sm text-ink-muted">{label}</dt>
                      {/* A long label may wrap; the score never should. */}
                      <dd className="shrink-0 whitespace-nowrap text-sm font-semibold">
                        {uc[k]} / 5
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            ) : (
              <p>
                <Empty>Not rated yet — all seven are optional.</Empty>
              </p>
            )}
          </InlineField>
        </section>
      )}

      {(uc.functionalLeaderSuccess || editable) && (
        <section>
          <h2 className="font-serif text-2xl">
            The functional leader&rsquo;s view of success
          </h2>
          <InlineField
            record={record}
            field="functionalLeaderSuccess"
            label="The functional leader's view of success"
            value={uc.functionalLeaderSuccess}
            editor={{ kind: "textarea", rows: 3 }}
            canEdit={editable}
            className="mt-3"
          >
            <p className="max-w-prose leading-relaxed">
              {uc.functionalLeaderSuccess ?? (
                <Empty>
                  Not captured yet — what would the head of this function
                  call success?
                </Empty>
              )}
            </p>
          </InlineField>
        </section>
      )}
    </>
  );
}
