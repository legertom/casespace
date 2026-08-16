import { approachLabels } from "@/lib/domain";
import type { UseCaseDetail } from "@/server/use-case-queries";
import { Empty } from "@/components/record/empty";
import {
  InlineField,
  type Choice,
} from "@/components/record/inline-field";

/** "What it does": description, the AI tools named, and the approach. */
export function RecordAbout({
  uc,
  record,
  editable,
  approachChoices,
}: {
  uc: UseCaseDetail;
  record: { id: string; title: string };
  editable: boolean;
  approachChoices: Choice[];
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl">What it does</h2>
      <InlineField
        record={record}
        field="description"
        label="What it does"
        value={uc.description}
        editor={{ kind: "textarea", rows: 6 }}
        canEdit={editable}
        required
        className="mt-3"
      >
        <p className="max-w-prose whitespace-pre-line leading-relaxed">
          {uc.description}
        </p>
      </InlineField>

      {(uc.aiTools.length > 0 || editable) && (
        <InlineField
          record={record}
          field="aiTools"
          label="AI tools"
          value={uc.aiTools}
          editor={{ kind: "tags" }}
          canEdit={editable}
          className="mt-4"
        >
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">Tools:</strong>{" "}
            {uc.aiTools.length > 0 ? (
              uc.aiTools.join(", ")
            ) : (
              <Empty>none named yet</Empty>
            )}
          </p>
        </InlineField>
      )}

      {(uc.approaches.length > 0 || editable) && (
        <InlineField
          record={record}
          field="approaches"
          label="Approach"
          value={uc.approaches}
          editor={{ kind: "checkboxes", options: approachChoices }}
          canEdit={editable}
          className="mt-1.5"
        >
          <p className="text-sm text-ink-muted">
            <strong className="text-ink">Approach:</strong>{" "}
            {uc.approaches.length > 0 ? (
              approachLabels(uc.approaches)
            ) : (
              <Empty>not identified yet</Empty>
            )}
          </p>
        </InlineField>
      )}
    </section>
  );
}
